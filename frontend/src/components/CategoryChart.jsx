import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts'

const CategoryChart = ({ transactions, categories }) => {
  const data = useMemo(() => {
    const categoryTotals = {}
    
    // Initialize all categories with 0
    if (categories && Array.isArray(categories)) {
      categories.forEach(category => {
        categoryTotals[category.name] = 0
      })
    }
    
    // Calculate totals for debit transactions only
    if (transactions && Array.isArray(transactions)) {
      transactions.forEach(transaction => {
        if (transaction.type === 'debit') {
          const categoryName = transaction.category_name || 'Uncategorized'
          const amount = parseFloat(transaction.amount || 0)
          categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + amount
        }
      })
    }
    
    // Convert to array and filter out zero values
    return Object.entries(categoryTotals)
      .filter(([name, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 categories
  }, [transactions, categories])

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
  ]

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No spending data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default CategoryChart 