import React, { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

const SpendingChart = ({ transactions }) => {
  const data = useMemo(() => {
    const chartData = {}
    
    // Initialize last 30 days with 0 values (only 2025)
    const today = new Date()
    const startDate = new Date('2025-01-01')
    const endDate = today > new Date('2025-12-31') ? new Date('2025-12-31') : today
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const date = format(d, 'yyyy-MM-dd')
      chartData[date] = { income: 0, expenses: 0 }
    }
    
    // Fill in transaction data
    if (transactions && Array.isArray(transactions)) {
      transactions.forEach(transaction => {
        const date = transaction.date
        const amount = parseFloat(transaction.amount || 0)
        
        if (chartData[date]) {
          if (transaction.type === 'credit') {
            chartData[date].income += amount
          } else {
            chartData[date].expenses += amount
          }
        }
      })
    }
    
    // Convert to array format for Recharts
    return Object.entries(chartData).map(([date, values]) => ({
      date: format(new Date(date), 'MMM dd'),
      income: values.income,
      expenses: values.expenses,
      net: values.income - values.expenses
    }))
  }, [transactions])

  if (!transactions || !Array.isArray(transactions) || !transactions.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          formatter={(value) => [`₹${value.toLocaleString()}`, '']}
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
  )
}

export default SpendingChart 