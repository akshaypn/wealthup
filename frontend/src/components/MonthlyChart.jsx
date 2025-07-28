import React, { useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

const MonthlyChart = ({ transactions }) => {
  const data = useMemo(() => {
    // Get last 12 months
    const endDate = new Date()
    const startDate = subMonths(endDate, 11)
    
    const months = eachMonthOfInterval({ start: startDate, end: endDate })
    
    const chartData = months.map(month => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      const monthKey = format(month, 'yyyy-MM')
      const monthLabel = format(month, 'MMM yyyy')
      
      let income = 0
      let expenses = 0
      
      if (transactions && Array.isArray(transactions)) {
        transactions.forEach(transaction => {
          const transactionDate = new Date(transaction.date)
          if (transactionDate >= monthStart && transactionDate <= monthEnd) {
            const amount = parseFloat(transaction.amount || 0)
            if (transaction.type === 'credit') {
              income += amount
            } else {
              expenses += amount
            }
          }
        })
      }
      
      return {
        month: monthLabel,
        monthKey,
        income,
        expenses,
        net: income - expenses
      }
    })
    
    return chartData
  }, [transactions])

  if (!transactions || !Array.isArray(transactions) || !transactions.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No monthly data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip 
          formatter={(value) => [`₹${value.toLocaleString()}`, '']}
          labelFormatter={(label) => `Month: ${label}`}
        />
        <Legend />
        <Bar
          dataKey="income"
          fill="#10b981"
          name="Income"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="expenses"
          fill="#ef4444"
          name="Expenses"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default MonthlyChart 