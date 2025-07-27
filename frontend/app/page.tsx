'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Upload,
  BarChart3,
  PieChart,
  Calendar,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import FileUpload from '../components/FileUpload';
import TransactionList from '../components/TransactionList';
import SpendingChart from '../components/SpendingChart';
import CategoryChart from '../components/CategoryChart';
import { Transaction, Category } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://100.123.199.100:9001';

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions', selectedPeriod],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/transactions?period=${selectedPeriod}`);
      return response.data;
    },
    refetchOnWindowFocus: false,
  });

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/categories`);
      return response.data;
    },
    refetchOnWindowFocus: false,
  });

  // Calculate summary statistics
  const summary = transactions ? {
    totalIncome: transactions
      .filter((t: Transaction) => t.type === 'credit')
      .reduce((sum: number, t: Transaction) => sum + parseFloat(t.amount), 0),
    totalExpenses: transactions
      .filter((t: Transaction) => t.type === 'debit')
      .reduce((sum: number, t: Transaction) => sum + parseFloat(t.amount), 0),
    netCashFlow: transactions
      .reduce((sum: number, t: Transaction) => {
        const amount = parseFloat(t.amount);
        return t.type === 'credit' ? sum + amount : sum - amount;
      }, 0),
    transactionCount: transactions.length,
  } : null;

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bank', 'canara_bank');

      const response = await axios.post(`${API_BASE_URL}/api/v1/upload/csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('File uploaded successfully! Processing transactions...');
      setShowUpload(false);
      refetchTransactions();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file. Please try again.');
    }
  };

  const handleCategoryChange = async (transactionId: string, newCategoryId: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/v1/transactions/${transactionId}/category`, {
        categoryId: newCategoryId,
      });
      
      toast.success('Category updated successfully!');
      refetchTransactions();
    } catch (error) {
      console.error('Category update error:', error);
      toast.error('Failed to update category. Please try again.');
    }
  };

  if (transactionsLoading || categoriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Wealthup</h1>
              <p className="text-gray-600">Your personal finance dashboard</p>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Statement
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Income</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ₹{summary?.totalIncome.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-8 w-8 text-danger-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ₹{summary?.totalExpenses.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Net Cash Flow</p>
                <p className={`text-2xl font-semibold ${
                  summary?.netCashFlow >= 0 ? 'text-success-600' : 'text-danger-600'
                }`}>
                  ₹{summary?.netCashFlow.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Transactions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary?.transactionCount || '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input-field w-auto"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="input-field w-auto"
          >
            <option value="">All Categories</option>
            {categories?.map((category: Category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Trend</h3>
            <SpendingChart transactions={transactions || []} />
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
            <CategoryChart transactions={transactions || []} categories={categories || []} />
          </div>
        </div>

        {/* Transactions */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              {format(new Date(), 'MMM dd, yyyy')}
            </div>
          </div>
          
          <TransactionList
            transactions={transactions || []}
            categories={categories || []}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <FileUpload
          onUpload={handleFileUpload}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
} 