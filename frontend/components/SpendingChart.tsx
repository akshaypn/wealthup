'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { Transaction } from '../types';

interface SpendingChartProps {
  transactions: Transaction[];
}

export default function SpendingChart({ transactions }: SpendingChartProps) {
  // Group transactions by date and calculate daily totals
  const dailyData = React.useMemo(() => {
    const data: { [key: string]: { income: number; expenses: number } } = {};
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      data[date] = { income: 0, expenses: 0 };
    }
    
    // Aggregate transactions
    transactions.forEach(transaction => {
      const date = transaction.date;
      const amount = parseFloat(transaction.amount);
      
      if (data[date]) {
        if (transaction.type === 'credit') {
          data[date].income += amount;
        } else {
          data[date].expenses += amount;
        }
      }
    });
    
    // Convert to array format for Recharts
    return Object.entries(data).map(([date, values]) => ({
      date: format(new Date(date), 'MMM dd'),
      income: values.income,
      expenses: values.expenses,
      net: values.income - values.expenses
    }));
  }, [transactions]);

  if (!transactions.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `₹${value.toLocaleString()}`}
        />
        <Tooltip 
          formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="income" 
          stroke="#10b981" 
          strokeWidth={2}
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
          name="Income"
        />
        <Line 
          type="monotone" 
          dataKey="expenses" 
          stroke="#ef4444" 
          strokeWidth={2}
          dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
          name="Expenses"
        />
        <Line 
          type="monotone" 
          dataKey="net" 
          stroke="#3b82f6" 
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
          name="Net Cash Flow"
        />
      </LineChart>
    </ResponsiveContainer>
  );
} 