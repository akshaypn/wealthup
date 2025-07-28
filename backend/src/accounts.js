const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get all accounts for a user
const getUserAccounts = async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT 
          a.id, a.name, a.institution, a.type, a.currency, a.account_number, 
          a.ifsc_code, a.current_balance, a.credit_limit, a.due_date, 
          a.opened_on, a.is_active, a.created_at, a.updated_at,
          COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) as calculated_balance,
          COUNT(t.id) as transaction_count
        FROM accounts a
        LEFT JOIN transactions t ON a.id = t.account_id
        WHERE a.user_id = $1 AND a.is_active = true 
        GROUP BY a.id, a.name, a.institution, a.type, a.currency, a.account_number, 
                 a.ifsc_code, a.current_balance, a.credit_limit, a.due_date, 
                 a.opened_on, a.is_active, a.created_at, a.updated_at
        ORDER BY a.created_at DESC`,
        [req.user.id]
      );

      // Update the current_balance with calculated balance for accounts with transactions
      const accounts = result.rows.map(account => ({
        ...account,
        current_balance: account.transaction_count > 0 ? account.calculated_balance : account.current_balance
      }));

      res.json({
        accounts: accounts
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get user accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

// Create a new account
const createAccount = async (req, res) => {
  const {
    name,
    institution,
    type,
    currency = 'INR',
    account_number,
    ifsc_code,
    current_balance = 0,
    credit_limit = 0,
    due_date,
    opened_on
  } = req.body;

  if (!name || !institution || !type) {
    return res.status(400).json({ error: 'Name, institution, and type are required' });
  }

  // Validate account type
  const validTypes = ['savings', 'current', 'credit_card', 'cash', 'investment'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid account type' });
  }

  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `INSERT INTO accounts (
          user_id, name, institution, type, currency, account_number, 
          ifsc_code, current_balance, credit_limit, due_date, opened_on
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
        [
          req.user.id, name, institution, type, currency, account_number,
          ifsc_code, current_balance, credit_limit, due_date, opened_on
        ]
      );

      res.status(201).json({
        message: 'Account created successfully',
        account: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};

// Update an account
const updateAccount = async (req, res) => {
  const { accountId } = req.params;
  const {
    name,
    institution,
    type,
    currency,
    account_number,
    ifsc_code,
    current_balance,
    credit_limit,
    due_date,
    opened_on,
    is_active
  } = req.body;

  try {
    const client = await pool.connect();
    
    try {
      // Check if account belongs to user
      const accountCheck = await client.query(
        'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
        [accountId, req.user.id]
      );

      if (accountCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // Build update query dynamically
      let query = 'UPDATE accounts SET updated_at = NOW()';
      const params = [];
      let paramIndex = 1;

      const fields = [
        { field: 'name', value: name },
        { field: 'institution', value: institution },
        { field: 'type', value: type },
        { field: 'currency', value: currency },
        { field: 'account_number', value: account_number },
        { field: 'ifsc_code', value: ifsc_code },
        { field: 'current_balance', value: current_balance },
        { field: 'credit_limit', value: credit_limit },
        { field: 'due_date', value: due_date },
        { field: 'opened_on', value: opened_on },
        { field: 'is_active', value: is_active }
      ];

      fields.forEach(({ field, value }) => {
        if (value !== undefined) {
          query += `, ${field} = $${paramIndex}`;
          params.push(value);
          paramIndex++;
        }
      });

      query += ` WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`;
      params.push(accountId, req.user.id);

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }

      res.json({
        message: 'Account updated successfully',
        account: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
};

// Delete an account (soft delete)
const deleteAccount = async (req, res) => {
  const { accountId } = req.params;

  try {
    const client = await pool.connect();
    
    try {
      // Check if account belongs to user
      const accountCheck = await client.query(
        'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
        [accountId, req.user.id]
      );

      if (accountCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // Check if account has transactions
      const transactionCheck = await client.query(
        'SELECT COUNT(*) as count FROM transactions WHERE account_id = $1',
        [accountId]
      );

      if (parseInt(transactionCheck.rows[0].count) > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete account with existing transactions. Please deactivate instead.' 
        });
      }

      // Soft delete by setting is_active to false
      const result = await client.query(
        'UPDATE accounts SET is_active = false, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id',
        [accountId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }

      res.json({
        message: 'Account deleted successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

// Get account summary
const getAccountSummary = async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // Get account balances with calculated balance from transactions
      const accountsResult = await client.query(
        `SELECT 
          a.id, a.name, a.type, a.current_balance, a.credit_limit, a.due_date,
          COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) as calculated_balance,
          COUNT(t.id) as transaction_count
        FROM accounts a
        LEFT JOIN transactions t ON a.id = t.account_id
        WHERE a.user_id = $1 AND a.is_active = true
        GROUP BY a.id, a.name, a.type, a.current_balance, a.credit_limit, a.due_date`,
        [req.user.id]
      );

      // Get recent transactions for each account and use calculated balance
      const accounts = accountsResult.rows.map(account => ({
        ...account,
        current_balance: account.transaction_count > 0 ? account.calculated_balance : account.current_balance
      }));

      for (let account of accounts) {
        const transactionsResult = await client.query(
          `SELECT 
            id, date, amount, type, description
          FROM transactions 
          WHERE account_id = $1 
          ORDER BY date DESC 
          LIMIT 5`,
          [account.id]
        );
        account.recent_transactions = transactionsResult.rows;
      }

      // Calculate totals
      const totals = accounts.reduce((acc, account) => {
        const balance = parseFloat(account.current_balance) || 0;
        const creditLimit = parseFloat(account.credit_limit) || 0;
        
        if (account.type === 'credit_card') {
          acc.credit_cards += balance;
          acc.credit_limits += creditLimit;
        } else {
          acc.bank_accounts += balance;
        }
        return acc;
      }, { bank_accounts: 0, credit_cards: 0, credit_limits: 0 });

      res.json({
        accounts,
        summary: {
          total_accounts: accounts.length,
          total_bank_balance: totals.bank_accounts,
          total_credit_balance: totals.credit_cards,
          total_credit_limit: totals.credit_limits,
          net_worth: totals.bank_accounts - totals.credit_cards
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get account summary error:', error);
    res.status(500).json({ error: 'Failed to fetch account summary' });
  }
};

// Get account by ID
const getAccountById = async (req, res) => {
  const { accountId } = req.params;

  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT 
          a.id, a.name, a.institution, a.type, a.currency, a.account_number, 
          a.ifsc_code, a.current_balance, a.credit_limit, a.due_date, 
          a.opened_on, a.is_active, a.created_at, a.updated_at,
          COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) as calculated_balance,
          COUNT(t.id) as transaction_count
        FROM accounts a
        LEFT JOIN transactions t ON a.id = t.account_id
        WHERE a.id = $1 AND a.user_id = $2 AND a.is_active = true
        GROUP BY a.id, a.name, a.institution, a.type, a.currency, a.account_number, 
                 a.ifsc_code, a.current_balance, a.credit_limit, a.due_date, 
                 a.opened_on, a.is_active, a.created_at, a.updated_at`,
        [accountId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const account = result.rows[0];
      // Use calculated balance if there are transactions
      account.current_balance = account.transaction_count > 0 ? account.calculated_balance : account.current_balance;

      res.json({
        account: account
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get account by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
};

module.exports = {
  getUserAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountSummary,
  getAccountById
}; 