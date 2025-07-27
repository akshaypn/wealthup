-- Wealthup Database Schema
-- This script initializes the database with required tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    profile_picture VARCHAR(500),
    auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    institution VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('savings', 'current', 'credit_card', 'cash', 'investment')),
    currency VARCHAR(3) DEFAULT 'INR',
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    current_balance DECIMAL(15,2) DEFAULT 0,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    due_date DATE,
    opened_on DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    txn_id VARCHAR(100) UNIQUE,
    date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),
    description TEXT NOT NULL,
    cheque_number VARCHAR(20),
    branch_code VARCHAR(20),
    balance DECIMAL(15,2),
    ai_category VARCHAR(100),
    ai_confidence DECIMAL(3,2),
    corrected_by_user BOOLEAN DEFAULT false,
    account_id UUID REFERENCES accounts(id),
    category_id UUID REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_corrections table
CREATE TABLE IF NOT EXISTS user_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    old_category_id UUID REFERENCES categories(id),
    new_category_id UUID REFERENCES categories(id) NOT NULL,
    reason TEXT,
    corrected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_for_training BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create holdings table
CREATE TABLE IF NOT EXISTS holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    average_cost DECIMAL(15,2) NOT NULL,
    last_traded_price DECIMAL(15,2),
    market_value DECIMAL(15,2),
    profit_loss DECIMAL(15,2),
    profit_loss_percentage DECIMAL(5,2),
    day_change DECIMAL(15,2),
    day_change_percentage DECIMAL(5,2),
    account_id UUID REFERENCES accounts(id),
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    spent DECIMAL(15,2) DEFAULT 0,
    period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'yearly', 'weekly')),
    category_id UUID REFERENCES categories(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial_goals table
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0,
    target_date DATE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, description, color, is_system) VALUES
('Food & Dining', 'Restaurants, groceries, and food delivery', '#10B981', true),
('Transportation', 'Fuel, public transport, ride-sharing', '#3B82F6', true),
('Shopping', 'Clothing, electronics, general shopping', '#8B5CF6', true),
('Entertainment', 'Movies, games, streaming services', '#EC4899', true),
('Healthcare', 'Medical expenses, insurance, pharmacy', '#EF4444', true),
('Utilities', 'Electricity, water, internet, phone', '#F59E0B', true),
('Insurance', 'Life, health, vehicle insurance', '#06B6D4', true),
('Investment', 'Stocks, mutual funds, fixed deposits', '#84CC16', true),
('Salary/Income', 'Regular salary and income', '#10B981', true),
('Transfer', 'Bank transfers between accounts', '#6B7280', true),
('ATM Withdrawal', 'Cash withdrawals from ATMs', '#6B7280', true),
('Online Services', 'Software subscriptions, online services', '#8B5CF6', true),
('Education', 'Tuition, books, courses', '#6366F1', true),
('Travel', 'Vacations, business travel', '#F97316', true),
('Gifts', 'Gifts and donations', '#EC4899', true),
('Credit Card Payment', 'Credit card bill payments', '#DC2626', true),
('Cash Transaction', 'Manual cash transactions', '#059669', true),
('Bank Charges', 'Bank fees and charges', '#7C3AED', true),
('Other', 'Miscellaneous expenses', '#6B7280', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default account
INSERT INTO accounts (name, institution, type, currency) VALUES
('Main Account', 'Canara Bank', 'savings', 'INR')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_user_corrections_user ON user_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_corrections_transaction ON user_corrections(transaction_id);
CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_account ON holdings(account_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON financial_goals(user_id); 