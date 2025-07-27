import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import { config } from 'dotenv';
import { Pool } from 'pg';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://wealthup_user:wealthup_password@localhost:5432/wealthup',
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'wealthup-backend'
  });
});

// Get categories
app.get('/api/v1/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, color, is_active, is_system, created_at, updated_at
      FROM categories 
      WHERE is_active = true 
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get transactions with filters
app.get('/api/v1/transactions', async (req, res) => {
  try {
    const { period = '30d', category, limit = 100, offset = 0 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Add period filter
    if (period) {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
      whereClause += ` AND date >= CURRENT_DATE - INTERVAL '${days} days'`;
    }

    // Add category filter
    if (category) {
      whereClause += ` AND category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    const query = `
      SELECT 
        t.id, t.txn_id, t.date, t.amount, t.type, t.description, 
        t.cheque_number, t.branch_code, t.balance, t.ai_category, 
        t.ai_confidence, t.corrected_by_user, t.account_id, t.category_id,
        t.created_at, t.updated_at,
        c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ${whereClause}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Update transaction category
app.patch('/api/v1/transactions/:id/category', async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;

    const result = await pool.query(
      'UPDATE transactions SET category_id = $1, corrected_by_user = true, updated_at = NOW() WHERE id = $2 RETURNING *',
      [categoryId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating transaction category:', error);
    res.status(500).json({ error: 'Failed to update transaction category' });
  }
});

// Upload CSV file
app.post('/api/v1/upload/csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { bank = 'canara_bank' } = req.body;
    const filePath = req.file.path;
    const transactions: any[] = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Parse Canara Bank CSV format
          const transaction = {
            id: uuidv4(),
            txnId: `${row.Date || row.date || ''}-${row.Amount || row.amount || ''}-${Math.random().toString(36).substr(2, 9)}`,
            date: row.Date || row.date || new Date().toISOString().split('T')[0],
            amount: row.Amount || row.amount || '0',
            type: (row.Debit || row.debit) ? 'debit' : 'credit',
            description: row.Description || row.description || row.Narration || row.narration || '',
            chequeNumber: row['Cheque No'] || row['Cheque Number'] || null,
            branchCode: row['Branch Code'] || null,
            balance: row.Balance || row.balance || '0',
            aiCategory: 'Other',
            aiConfidence: 0.5,
            correctedByUser: false,
            accountId: 'default-account-id',
            categoryId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          transactions.push(transaction);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Categorize transactions using AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    for (const transaction of transactions) {
      try {
        const aiResponse = await axios.post(`${aiServiceUrl}/categorise`, {
          description: transaction.description,
          amount: parseFloat(transaction.amount),
          type: transaction.type,
        });

        transaction.aiCategory = aiResponse.data.category;
        transaction.aiConfidence = aiResponse.data.confidence;
      } catch (aiError) {
        console.error('AI categorization failed for transaction:', transaction.description);
        // Keep default category
      }
    }

    // Insert transactions into database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const transaction of transactions) {
        await client.query(`
          INSERT INTO transactions (
            id, txn_id, date, amount, type, description, cheque_number, 
            branch_code, balance, ai_category, ai_confidence, corrected_by_user, 
            account_id, category_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (txn_id) DO NOTHING
        `, [
          transaction.id, transaction.txnId, transaction.date, transaction.amount,
          transaction.type, transaction.description, transaction.chequeNumber,
          transaction.branchCode, transaction.balance, transaction.aiCategory,
          transaction.aiConfidence, transaction.correctedByUser, transaction.accountId,
          transaction.categoryId, transaction.createdAt, transaction.updatedAt
        ]);
      }

      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      message: 'File uploaded and processed successfully',
      transactionsProcessed: transactions.length,
      transactions
    });

  } catch (error) {
    console.error('Error processing CSV upload:', error);
    res.status(500).json({ error: 'Failed to process CSV file' });
  }
});

// Get transaction summary statistics
app.get('/api/v1/transactions/summary', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN type = 'credit' THEN amount::numeric ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'debit' THEN amount::numeric ELSE 0 END) as total_expenses,
        SUM(CASE WHEN type = 'credit' THEN amount::numeric ELSE -amount::numeric END) as net_cash_flow
      FROM transactions 
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
    `);

    const summary = result.rows[0];
    res.json({
      totalTransactions: parseInt(summary.total_transactions) || 0,
      totalIncome: parseFloat(summary.total_income) || 0,
      totalExpenses: parseFloat(summary.total_expenses) || 0,
      netCashFlow: parseFloat(summary.net_cash_flow) || 0,
    });
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({ error: 'Failed to fetch transaction summary' });
  }
});

// Get uncategorized transactions count
app.get('/api/v1/transactions/uncategorized/count', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM transactions 
      WHERE category_id IS NULL
    `);
    
    res.json({ count: parseInt(result.rows[0].count) || 0 });
  } catch (error) {
    console.error('Error fetching uncategorized count:', error);
    res.status(500).json({ error: 'Failed to fetch uncategorized count' });
  }
});

// Categorize all uncategorized transactions
app.post('/api/v1/transactions/categorize-all', async (req, res) => {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    // Get all uncategorized transactions
    const uncategorizedResult = await pool.query(`
      SELECT id, description, amount, type
      FROM transactions 
      WHERE category_id IS NULL
      ORDER BY date DESC
    `);
    
    const uncategorizedTransactions = uncategorizedResult.rows;
    const totalCount = uncategorizedTransactions.length;
    
    if (totalCount === 0) {
      return res.json({ 
        message: 'No uncategorized transactions found',
        processed: 0,
        total: 0
      });
    }

    // Process transactions in batches of 10 for better performance
    const batchSize = 10;
    let processedCount = 0;
    
    for (let i = 0; i < uncategorizedTransactions.length; i += batchSize) {
      const batch = uncategorizedTransactions.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (transaction) => {
        try {
          const aiResponse = await axios.post(`${aiServiceUrl}/categorise`, {
            description: transaction.description,
            amount: parseFloat(transaction.amount),
            type: transaction.type,
          });

          // Get category ID from category name
          const categoryResult = await pool.query(
            'SELECT id FROM categories WHERE name = $1 AND is_active = true',
            [aiResponse.data.category]
          );

          if (categoryResult.rows.length > 0) {
            await pool.query(
              'UPDATE transactions SET ai_category = $1, ai_confidence = $2, updated_at = NOW() WHERE id = $3',
              [aiResponse.data.category, aiResponse.data.confidence, transaction.id]
            );
          }
          
          return { success: true, id: transaction.id };
        } catch (error) {
          console.error('AI categorization failed for transaction:', transaction.description, error);
          return { success: false, id: transaction.id, error: error.message };
        }
      });

      await Promise.all(batchPromises);
      processedCount += batch.length;
    }

    res.json({
      message: `Successfully processed ${processedCount} transactions`,
      processed: processedCount,
      total: totalCount
    });

  } catch (error) {
    console.error('Error categorizing transactions:', error);
    res.status(500).json({ error: 'Failed to categorize transactions' });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Wealthup Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/v1`);
}); 