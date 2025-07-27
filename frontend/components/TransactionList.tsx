'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Edit2, Check, X } from 'lucide-react';
import { Transaction, Category } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onCategoryChange: (transactionId: string, newCategoryId: string) => void;
}

export default function TransactionList({ 
  transactions, 
  categories, 
  onCategoryChange 
}: TransactionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setSelectedCategory(transaction.categoryId || '');
  };

  const handleSave = (transactionId: string) => {
    if (selectedCategory) {
      onCategoryChange(transactionId, selectedCategory);
    }
    setEditingId(null);
    setSelectedCategory('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setSelectedCategory('');
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return 'bg-gray-100 text-gray-800';
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 'bg-gray-100 text-gray-800';
    
    // Simple color mapping based on category name
    const colors: { [key: string]: string } = {
      'Groceries': 'bg-green-100 text-green-800',
      'Dining': 'bg-orange-100 text-orange-800',
      'Transportation': 'bg-blue-100 text-blue-800',
      'Shopping': 'bg-purple-100 text-purple-800',
      'Entertainment': 'bg-pink-100 text-pink-800',
      'Healthcare': 'bg-red-100 text-red-800',
      'Education': 'bg-indigo-100 text-indigo-800',
      'Utilities': 'bg-yellow-100 text-yellow-800',
      'Rent': 'bg-gray-100 text-gray-800',
      'Insurance': 'bg-teal-100 text-teal-800',
      'Investment': 'bg-emerald-100 text-emerald-800',
      'Salary': 'bg-green-100 text-green-800',
      'Freelance': 'bg-cyan-100 text-cyan-800',
      'Interest': 'bg-lime-100 text-lime-800',
      'Refund': 'bg-green-100 text-green-800',
      'ATM Withdrawal': 'bg-gray-100 text-gray-800',
      'Bank Charges': 'bg-red-100 text-red-800',
      'Transfer': 'bg-blue-100 text-blue-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    
    return colors[category.name] || 'bg-gray-100 text-gray-800';
  };

  if (!transactions.length) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg">No transactions found</div>
        <div className="text-gray-500 text-sm mt-2">Upload a statement to get started</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {format(new Date(transaction.date), 'MMM dd, yyyy')}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                {transaction.description}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'credit' ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === transaction.id ? (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(transaction.categoryId)}`}>
                    {getCategoryName(transaction.categoryId)}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {editingId === transaction.id ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSave(transaction.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="text-red-600 hover:text-red-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(transaction)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 