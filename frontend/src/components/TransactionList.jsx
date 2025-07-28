import React, { useState } from 'react'
import { format } from 'date-fns'
import { Check, X, Edit } from 'lucide-react'

const TransactionList = ({ transactions, categories, onCategoryChange }) => {
  const [editingId, setEditingId] = useState(null)
  const [editingCategory, setEditingCategory] = useState('')

  const handleEdit = (transaction) => {
    setEditingId(transaction.id)
    setEditingCategory(transaction.categoryId || '')
  }

  const handleSave = (transactionId) => {
    if (editingCategory) {
      onCategoryChange(transactionId, editingCategory)
    }
    setEditingId(null)
    setEditingCategory('')
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingCategory('')
  }

  const getCategoryName = (transaction) => {
    // Use the category_name from the database
    return transaction.category_name || 'Uncategorized'
  }

  const getCategoryColor = (transaction) => {
    const categoryName = getCategoryName(transaction)
    
    const colorMap = {
      'Food & Dining': 'bg-green-100 text-green-800',
      'Transportation': 'bg-blue-100 text-blue-800',
      'Shopping': 'bg-purple-100 text-purple-800',
      'Entertainment': 'bg-pink-100 text-pink-800',
      'Healthcare': 'bg-red-100 text-red-800',
      'Utilities': 'bg-yellow-100 text-yellow-800',
      'Insurance': 'bg-teal-100 text-teal-800',
      'Investment': 'bg-emerald-100 text-emerald-800',
      'Salary/Income': 'bg-green-100 text-green-800',
      'Transfer': 'bg-blue-100 text-blue-800',
      'ATM Withdrawal': 'bg-gray-100 text-gray-800',
      'Online Services': 'bg-indigo-100 text-indigo-800',
      'Education': 'bg-indigo-100 text-indigo-800',
      'Travel': 'bg-orange-100 text-orange-800',
      'Gifts': 'bg-pink-100 text-pink-800',
      'Other': 'bg-gray-100 text-gray-800'
    }
    
    return colorMap[categoryName] || 'bg-gray-100 text-gray-800'
  }

  if (!transactions.length) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg">No transactions found</div>
        <div className="text-gray-500 text-sm mt-2">Upload a statement to get started</div>
      </div>
    )
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
                    value={editingCategory}
                    onChange={(e) => setEditingCategory(e.target.value)}
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
                  <div className="flex flex-col space-y-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(transaction)}`}>
                      {getCategoryName(transaction)}
                    </span>
                    {transaction.aiCategory && !transaction.categoryId && (
                      <span className="text-xs text-gray-500">
                        AI: {Math.round(transaction.aiConfidence * 100)}% confident
                      </span>
                    )}
                  </div>
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
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TransactionList 