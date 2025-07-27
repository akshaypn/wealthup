export interface Transaction {
  id: string;
  txnId: string;
  date: string;
  amount: string;
  type: 'debit' | 'credit';
  description: string;
  chequeNumber?: string;
  branchCode?: string;
  balance?: string;
  aiCategory?: string;
  aiConfidence?: number;
  correctedByUser: boolean;
  accountId: string;
  categoryId?: string;
  category?: Category;
  account?: Account;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: string;
  currency: string;
  accountNumber?: string;
  ifscCode?: string;
  currentBalance: number;
  openedOn: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Holding {
  id: string;
  symbol: string;
  name?: string;
  type: string;
  quantity: number;
  averageCost: number;
  lastTradedPrice?: number;
  marketValue?: number;
  profitLoss?: number;
  profitLossPercentage?: number;
  dayChange?: number;
  dayChangePercentage?: number;
  accountId: string;
  account?: Account;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCorrection {
  id: string;
  transactionId: string;
  transaction?: Transaction;
  oldCategoryId?: string;
  oldCategory?: Category;
  newCategoryId: string;
  newCategory?: Category;
  reason?: string;
  correctedAt: string;
  processedForTraining: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorizationResponse {
  category: string;
  confidence: number;
  reasoning?: string;
}

export interface TransactionRequest {
  description: string;
  amount: number;
  type: 'debit' | 'credit';
}

export interface SummaryStats {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  transactionCount: number;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface SpendingData {
  date: string;
  income: number;
  expenses: number;
} 