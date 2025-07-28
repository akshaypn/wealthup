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
  skip: (req) => req.method === 'OPTIONS', // Skip rate limiting for OPTIONS requests
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

// Get account balance history and ledger
app.get('/api/v1/accounts/:accountId/ledger', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { page = 1, limit = 50, type, period } = req.query;
    const offset = (page - 1) * limit;

    // Verify account belongs to user
    const accountCheck = await pool.query(
      'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, req.user.id]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accountCheck.rows[0];

    // Build WHERE clause with filters
    let whereConditions = ['t.account_id = $1', 't.user_id = $2'];
    let params = [accountId, req.user.id];
    let paramIndex = 3;

    // Add type filter
    if (type && type !== 'all') {
      whereConditions.push(`t.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    // Add period filter
    if (period && period !== 'all') {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
      whereConditions.push(`t.date >= CURRENT_DATE - INTERVAL '${days} days'`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get transactions with running balance
    const transactionsResult = await pool.query(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        ROW_NUMBER() OVER (ORDER BY t.date DESC, t.created_at DESC) as row_num
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    // Calculate running balance from the beginning
    let runningBalance = 0;
    const transactions = transactionsResult.rows.map((txn) => {
      const amount = parseFloat(txn.amount);
      const balanceChange = txn.type === 'credit' ? amount : -amount;
      
      // Add to running balance
      runningBalance += balanceChange;
      
      return {
        ...txn,
        running_balance: runningBalance,
        balance_change: balanceChange
      };
    });

    // Get total count for pagination with same filters
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM transactions t WHERE ${whereClause}`,
      params
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      account,
      transactions,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch account ledger' });
  }
});

// Get account balance reconciliation
app.get('/api/v1/accounts/:accountId/reconciliation', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account belongs to user
    const accountCheck = await pool.query(
      'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, req.user.id]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accountCheck.rows[0];

    // Calculate expected balance from transactions
    const balanceResult = await pool.query(`
      SELECT 
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credits,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debits,
        COUNT(*) as transaction_count
      FROM transactions 
      WHERE account_id = $1 AND user_id = $2
    `, [accountId, req.user.id]);

    const balanceData = balanceResult.rows[0];
    const totalCredits = parseFloat(balanceData.total_credits || 0);
    const totalDebits = parseFloat(balanceData.total_debits || 0);
    const expectedBalance = totalCredits - totalDebits;
    const actualBalance = parseFloat(account.current_balance || 0);
    const difference = actualBalance - expectedBalance;

    res.json({
      account,
      reconciliation: {
        total_credits: totalCredits,
        total_debits: totalDebits,
        expected_balance: expectedBalance,
        actual_balance: actualBalance,
        difference: difference,
        transaction_count: parseInt(balanceData.transaction_count || 0),
        is_balanced: Math.abs(difference) < 0.01 // Allow for small rounding differences
      }
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    res.status(500).json({ error: 'Failed to reconcile account balance' });
  }
});

// Recalculate account balance from transactions
app.post('/api/v1/accounts/:accountId/recalculate-balance', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account belongs to user
    const accountCheck = await pool.query(
      'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, req.user.id]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accountCheck.rows[0];

    // Calculate balance from transactions
    const balanceResult = await pool.query(`
      SELECT 
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credits,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debits
      FROM transactions 
      WHERE account_id = $1 AND user_id = $2
    `, [accountId, req.user.id]);

    const balanceData = balanceResult.rows[0];
    const totalCredits = parseFloat(balanceData.total_credits || 0);
    const totalDebits = parseFloat(balanceData.total_debits || 0);
    const calculatedBalance = totalCredits - totalDebits;

    // Update account balance
    await pool.query(`
      UPDATE accounts 
      SET current_balance = $1, updated_at = NOW()
      WHERE id = $2
    `, [calculatedBalance, accountId]);

    res.json({
      message: 'Account balance recalculated successfully',
      account_id: accountId,
      calculated_balance: calculatedBalance,
      total_credits: totalCredits,
      total_debits: totalDebits
    });
  } catch (error) {
    console.error('Recalculate balance error:', error);
    res.status(500).json({ error: 'Failed to recalculate account balance' });
  }
});

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

// Get banks list (protected)
app.get('/api/v1/banks', authenticateToken, async (req, res) => {
  try {
    const banks = [
      { id: 'canara_bank', name: 'Canara Bank', icon: '🏦' },
      { id: 'hdfc_bank', name: 'HDFC Bank', icon: '🏦' },
      { id: 'icici_bank', name: 'ICICI Bank', icon: '🏦' },
      { id: 'sbi_bank', name: 'State Bank of India', icon: '🏦' },
      { id: 'credit_card', name: 'Credit Card', icon: '💳' }
    ];
    
    res.json(banks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

// Get uncategorized transactions count (protected)
app.get('/api/v1/transactions/uncategorized/count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM transactions 
      WHERE user_id = $1 AND category_id IS NULL
    `, [req.user.id]);
    
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching uncategorized count:', error);
    res.status(500).json({ error: 'Failed to fetch uncategorized count' });
  }
});

// Get transactions (protected)
app.get('/api/v1/transactions', authenticateToken, async (req, res) => {
  try {
    const { period = 'all', category, account, limit = 1000, offset = 0 } = req.query;
    
    let whereClause = 'WHERE t.user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    // Add period filter
    if (period && period !== 'all') {
      if (period === '2025') {
        whereClause += ` AND t.date >= '2025-01-01' AND t.date <= '2025-12-31'`;
      } else {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
        whereClause += ` AND t.date >= CURRENT_DATE - INTERVAL '${days} days'`;
      }
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

// Test upload endpoint (no authentication)
app.post('/api/v1/test-upload/csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { bank = null, accountId } = req.body;
    const filePath = req.file.path;

    console.log('🧪 Test upload started');
    console.log('📁 File path:', filePath);
    console.log('🏦 Bank:', bank);
    console.log('💳 Account ID:', accountId);

    // Parse CSV using new parser system
    const parseResult = await parseCSVFile(filePath, bank);
    const { transactions, parser: detectedBank, totalTransactions } = parseResult;

    console.log('📊 Parse result:', {
      transactionsCount: transactions.length,
      detectedBank,
      totalTransactions
    });

    if (transactions.length === 0) {
      return res.status(400).json({ error: 'No valid transactions found in file' });
    }

    // Show first few transactions
    console.log('📋 First 3 transactions:');
    transactions.slice(0, 3).forEach((txn, index) => {
      console.log(`  ${index + 1}. ${txn.date} - ${txn.description} - ${txn.amount} (${txn.type})`);
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      message: 'Test upload completed',
      transactionsCount: transactions.length,
      detectedBank: detectedBank,
      sampleTransactions: transactions.slice(0, 3)
    });

  } catch (error) {
    console.error('❌ Test upload error:', error);
    res.status(500).json({ error: 'Failed to process CSV file', details: error.message });
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
    let targetAccount = null;
    
    if (targetAccountId) {
      // Use the selected account
      const accountResult = await pool.query(
        'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
        [targetAccountId, req.user.id]
      );
      
      if (accountResult.rows.length === 0) {
        return res.status(400).json({ error: 'Selected account not found' });
      }
      
      targetAccount = accountResult.rows[0];
    } else {
      // Find existing account for this bank or create new one
      const accountResult = await pool.query(
        'SELECT * FROM accounts WHERE user_id = $1 AND institution = $2 LIMIT 1',
        [req.user.id, detectedBank]
      );
      
      if (accountResult.rows.length > 0) {
        targetAccountId = accountResult.rows[0].id;
        targetAccount = accountResult.rows[0];
      } else {
        // Create new account
        const newAccountResult = await pool.query(`
          INSERT INTO accounts (user_id, name, institution, type, currency) 
          VALUES ($1, $2, $3, $4, $5) 
          RETURNING *
        `, [req.user.id, `${detectedBank} Account`, detectedBank, 'savings', 'INR']);
        targetAccountId = newAccountResult.rows[0].id;
        targetAccount = newAccountResult.rows[0];
      }
    }

    // Temporarily disable AI categorization for faster processing
    // const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    // for (const transaction of transactions) {
    //   try {
    //     const aiResponse = await axios.post(`${aiServiceUrl}/categorise`, {
    //       description: transaction.description,
    //       amount: transaction.amount,
    //       type: transaction.type,
    //     });

    //     transaction.aiCategory = aiResponse.data.category;
    //     transaction.aiConfidence = aiResponse.data.confidence;
    //   } catch (aiError) {
    //     console.error('AI categorization failed for transaction:', transaction.description);
    //     transaction.aiCategory = 'Other';
    //     transaction.aiConfidence = 0.5;
    //   }
    // }

    // Set default values for AI categorization (disabled for now)
    for (const transaction of transactions) {
      transaction.aiCategory = 'Other';
      transaction.aiConfidence = 0.5;
    }

    // Insert transactions into database
    const client = await pool.connect();
    let processedCount = 0;
    let skippedCount = 0;
    let invalidCount = 0;
    
    try {
      await client.query('BEGIN');

      for (const transaction of transactions) {
        // Validate transaction data
        const amount = parseFloat(transaction.amount);
        if (isNaN(amount) || amount <= 0) {
          console.warn(`Skipping invalid transaction: ${JSON.stringify(transaction)}`);
          invalidCount++;
          continue;
        }

        // Create a more reliable transaction ID using a hash of key fields
        const crypto = require('crypto');
        const txnHash = crypto.createHash('md5')
          .update(`${transaction.date}-${amount}-${transaction.type}`)
          .digest('hex');
        const txnId = `${txnHash}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // Check for existing transaction with same date, amount, and type (more lenient)
        const existingTxn = await client.query(`
          SELECT id FROM transactions 
          WHERE user_id = $1 AND account_id = $2 AND date = $3 AND amount = $4 AND type = $5
          LIMIT 1
        `, [req.user.id, targetAccountId, transaction.date, amount, transaction.type]);

        if (existingTxn.rows.length > 0) {
          console.log(`Skipping duplicate transaction: ${transaction.description} on ${transaction.date}`);
          skippedCount++;
          continue;
        }
        
        // Insert the transaction
        const insertResult = await client.query(`
          INSERT INTO transactions (
            user_id, txn_id, date, amount, type, description, cheque_number, 
            branch_code, balance, ai_category, ai_confidence, corrected_by_user, 
            account_id, category_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (txn_id) DO NOTHING
          RETURNING id
        `, [
          req.user.id, txnId, transaction.date, transaction.amount,
          transaction.type, transaction.description, transaction.chequeNumber || null,
          transaction.branchCode || null, transaction.balance || 0, transaction.aiCategory,
          transaction.aiConfidence, false, targetAccountId,
          null, new Date().toISOString(), new Date().toISOString()
        ]);

        // Check if the insert was successful
        if (insertResult.rows.length === 0) {
          console.log(`Transaction already exists or insert failed: ${transaction.description}`);
          skippedCount++;
          continue;
        }

        // Update account balance based on transaction
        const balanceChange = transaction.type === 'credit' ? amount : -amount;
        
        await client.query(`
          UPDATE accounts 
          SET current_balance = current_balance + $1, updated_at = NOW()
          WHERE id = $2
        `, [balanceChange, targetAccountId]);
        
        processedCount++;
        console.log(`✅ Processed transaction: ${transaction.description} - ${amount} (${transaction.type})`);
      }

      await client.query('COMMIT');
      console.log(`📊 Upload Summary: ${processedCount} processed, ${skippedCount} skipped, ${invalidCount} invalid`);
    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error('❌ Database error during upload:', dbError);
      throw dbError;
    } finally {
      client.release();
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      message: 'File uploaded and processed successfully',
      transactionsProcessed: processedCount,
      transactionsSkipped: skippedCount,
      transactionsInvalid: invalidCount,
      totalTransactions: transactions.length,
      detectedBank: detectedBank,
      accountId: targetAccountId,
      accountName: targetAccount?.name || 'Unknown Account'
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