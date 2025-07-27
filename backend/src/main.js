const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { config } = require('dotenv');
const { Pool } = require('pg');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Import new modules
const { 
  authenticateToken, 
  authenticateGoogle,
  registerUser, 
  loginUser, 
  getCurrentUser, 
  updateUserProfile 
} = require('./auth');
const {
  getUserAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountSummary,
  getAccountById
} = require('./accounts');
const { parseCSVFile } = require('./parsers');

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://wealthup_user:wealthup_password@100.123.199.100:9003/wealthup',
});

// Test database connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize database connection
const initDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Running in fallback mode without database');
  }
};

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(compression());
app.use(limiter);
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://100.123.199.100:9000',
      'http://localhost:9000',
      'http://localhost:3000'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
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
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Accept CSV files by MIME type or file extension
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/csv' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
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
    service: 'wealthup-backend',
    version: '2.0.0'
  });
});

// Authentication routes (public)
app.post('/api/v1/auth/register', registerUser);
app.post('/api/v1/auth/login', loginUser);
app.post('/api/v1/auth/google', authenticateGoogle);

// Protected routes
app.get('/api/v1/auth/me', authenticateToken, getCurrentUser);
app.patch('/api/v1/auth/profile', authenticateToken, updateUserProfile);

// Account management routes (protected)
app.get('/api/v1/accounts', authenticateToken, getUserAccounts);
app.post('/api/v1/accounts', authenticateToken, createAccount);
app.get('/api/v1/accounts/summary', authenticateToken, getAccountSummary);
app.get('/api/v1/accounts/:accountId', authenticateToken, getAccountById);
app.patch('/api/v1/accounts/:accountId', authenticateToken, updateAccount);
app.delete('/api/v1/accounts/:accountId', authenticateToken, deleteAccount);

// Public categories endpoint (for now, will be protected later)
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

// Get transactions (protected)
app.get('/api/v1/transactions', authenticateToken, async (req, res) => {
  try {
    const { period = '30d', category, account, limit = 100, offset = 0 } = req.query;
    
    let whereClause = 'WHERE t.user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    // Add period filter
    if (period) {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
      whereClause += ` AND t.date >= CURRENT_DATE - INTERVAL '${days} days'`;
    }

    // Add category filter
    if (category) {
      whereClause += ` AND t.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Add account filter
    if (account) {
      whereClause += ` AND t.account_id = $${paramIndex}`;
      params.push(account);
      paramIndex++;
    }

    const query = `
      SELECT 
        t.id, t.txn_id, t.date, t.amount, t.type, t.description, 
        t.cheque_number, t.branch_code, t.balance, t.ai_category, 
        t.ai_confidence, t.corrected_by_user, t.account_id, t.category_id,
        t.created_at, t.updated_at,
        c.name as category_name, c.color as category_color,
        a.name as account_name, a.type as account_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
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

// Upload CSV file (protected)
app.post('/api/v1/upload/csv', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { bank = null, accountId } = req.body;
    const filePath = req.file.path;

    // Parse CSV using new parser system
    const parseResult = await parseCSVFile(filePath, bank);
    const { transactions, parser: detectedBank, totalTransactions } = parseResult;

    if (transactions.length === 0) {
      return res.status(400).json({ error: 'No valid transactions found in file' });
    }

    // Get or create account
    let targetAccountId = accountId;
    if (!targetAccountId) {
      // Find existing account for this bank or create new one
      const accountResult = await pool.query(
        'SELECT id FROM accounts WHERE user_id = $1 AND institution = $2 LIMIT 1',
        [req.user.id, detectedBank]
      );
      
      if (accountResult.rows.length > 0) {
        targetAccountId = accountResult.rows[0].id;
      } else {
        // Create new account
        const newAccountResult = await pool.query(`
          INSERT INTO accounts (user_id, name, institution, type, currency) 
          VALUES ($1, $2, $3, $4, $5) 
          RETURNING id
        `, [req.user.id, `${detectedBank} Account`, detectedBank, 'savings', 'INR']);
        targetAccountId = newAccountResult.rows[0].id;
      }
    }

    // Categorize transactions using AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    for (const transaction of transactions) {
      try {
        const aiResponse = await axios.post(`${aiServiceUrl}/categorise`, {
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
        });

        transaction.aiCategory = aiResponse.data.category;
        transaction.aiConfidence = aiResponse.data.confidence;
      } catch (aiError) {
        console.error('AI categorization failed for transaction:', transaction.description);
        transaction.aiCategory = 'Other';
        transaction.aiConfidence = 0.5;
      }
    }

    // Insert transactions into database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const transaction of transactions) {
        const txnId = `${transaction.date}-${transaction.amount}-${Math.random().toString(36).substr(2, 9)}`;
        
        await client.query(`
          INSERT INTO transactions (
            user_id, txn_id, date, amount, type, description, cheque_number, 
            branch_code, balance, ai_category, ai_confidence, corrected_by_user, 
            account_id, category_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (txn_id) DO NOTHING
        `, [
          req.user.id, txnId, transaction.date, transaction.amount,
          transaction.type, transaction.description, transaction.chequeNumber,
          transaction.branchCode, transaction.balance, transaction.aiCategory,
          transaction.aiConfidence, false, targetAccountId,
          null, new Date().toISOString(), new Date().toISOString()
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
      detectedBank: detectedBank,
      accountId: targetAccountId
    });

  } catch (error) {
    console.error('Error processing CSV upload:', error);
    res.status(500).json({ error: 'Failed to process CSV file' });
  }
});

// Update transaction category (protected)
app.patch('/api/v1/transactions/:id/category', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;

    const result = await pool.query(`
      UPDATE transactions 
      SET category_id = $1, corrected_by_user = true, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING id
    `, [categoryId, id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction category updated successfully' });
  } catch (error) {
    console.error('Error updating transaction category:', error);
    res.status(500).json({ error: 'Failed to update transaction category' });
  }
});

// Get transaction summary statistics (protected)
app.get('/api/v1/transactions/summary', authenticateToken, async (req, res) => {
  try {
    const { period = '30d', account } = req.query;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;

    let whereClause = 'WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (account) {
      whereClause += ` AND account_id = $${paramIndex}`;
      params.push(account);
      paramIndex++;
    }

    whereClause += ` AND date >= CURRENT_DATE - INTERVAL '${days} days'`;

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN type = 'credit' THEN amount::numeric ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'debit' THEN amount::numeric ELSE 0 END) as total_expenses,
        SUM(CASE WHEN type = 'credit' THEN amount::numeric ELSE -amount::numeric END) as net_cash_flow
      FROM transactions 
      ${whereClause}
    `, params);

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

// Get supported banks
app.get('/api/v1/banks', (req, res) => {
  const { ParserFactory } = require('./parsers');
  const factory = new ParserFactory();
  const parsers = factory.getAllParsers();
  
  res.json({
    banks: parsers.map(parser => ({
      name: parser.name,
      supportedFormats: parser.supportedFormats
    }))
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Wealthup Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Authentication: /api/v1/auth/*`);
    console.log(`💳 Accounts: /api/v1/accounts/*`);
    console.log(`📈 Transactions: /api/v1/transactions/*`);
  });
}).catch(error => {
  console.error('Failed to initialize application:', error);
  process.exit(1);
}); 