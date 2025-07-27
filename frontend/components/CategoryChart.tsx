'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Transaction, Category } from '../types';

interface CategoryChartProps {
  transactions: Transaction[];
  categories: Category[];
}

export default function CategoryChart({ transactions, categories }: CategoryChartProps) {
  // Calculate spending by category
  const categoryData = React.useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};
    
    // Initialize all categories with 0
    categories.forEach(category => {
      categoryTotals[category.name] = 0;
    });
    
    // Aggregate expenses by category
    transactions.forEach(transaction => {
      if (transaction.type === 'debit') {
        const categoryName = transaction.aiCategory || 'Other';
        const amount = parseFloat(transaction.amount);
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + amount;
      }
    });
    
    // Convert to array format for Recharts, filter out zero values
    return Object.entries(categoryTotals)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Show top 10 categories
  }, [transactions, categories]);

  // Color palette for categories
  const COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
  ];

  if (!categoryData.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No spending data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={categoryData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {categoryData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
} 