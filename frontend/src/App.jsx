import React, { useState } from 'react'
import { useQuery } from 'react-query'
import axios from 'axios'
import { format } from 'date-fns'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Upload,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Brain,
  Loader,
  LogOut,
  User,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './components/Login'
import Register from './components/Register'
import FileUpload from './components/FileUpload'
import TransactionList from './components/TransactionList'
import SpendingChart from './components/SpendingChart'
import CategoryChart from './components/CategoryChart'
import AccountManager from './components/AccountManager'

const API_BASE_URL = process.env.VITE_API_URL || 'http://100.123.199.100:9001'

// Create a client
const queryClient = new QueryClient()

const GOOGLE_CLIENT_ID = '411624710752-c6ju3ke4galebaheekegct0pq1kenoa8.apps.googleusercontent.com'

function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [categorizeProgress, setCategorizeProgress] = useState({ current: 0, total: 0 })
  const [activeTab, setActiveTab] = useState('dashboard')

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return null; // This will cause the App component to show the login page
  }

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions', selectedPeriod],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/transactions?period=${selectedPeriod}`)
      return response.data
    },
    refetchOnWindowFocus: false,
    enabled: isAuthenticated, // Only run when authenticated
  })

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/categories`)
      return response.data
    },
    refetchOnWindowFocus: false,
    enabled: isAuthenticated, // Only run when authenticated
  })

  // Fetch uncategorized count
  const { data: uncategorizedCount, refetch: refetchUncategorizedCount } = useQuery({
    queryKey: ['uncategorized-count'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/transactions/uncategorized/count`)
      return response.data.count
    },
    refetchOnWindowFocus: false,
    enabled: isAuthenticated, // Only run when authenticated
  })

  // Calculate summary statistics
  const summary = transactions && Array.isArray(transactions) ? {
    totalIncome: transactions
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
    totalExpenses: transactions
      .filter((t) => t.type === 'debit')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
    netCashFlow: transactions
      .reduce((sum, t) => {
        const amount = parseFloat(t.amount || 0)
        return t.type === 'credit' ? sum + amount : sum - amount
      }, 0),
    transactionCount: transactions.length,
  } : {
    totalIncome: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    transactionCount: 0,
  }

  const handleFileUpload = async (file, detectedBank, selectedAccountId) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bank', detectedBank || 'canara_bank')
      if (selectedAccountId) {
        formData.append('account_id', selectedAccountId)
      }

      await axios.post(`${API_BASE_URL}/api/v1/upload/csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      toast.success('File uploaded successfully! Processing transactions...')
      setShowUpload(false)
      refetchTransactions()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file. Please try again.')
    }
  }

  const handleCategoryChange = async (transactionId, newCategoryId) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/v1/transactions/${transactionId}/category`, {
        category_id: newCategoryId,
      })
      toast.success('Category updated successfully!')
      refetchTransactions()
      refetchUncategorizedCount()
    } catch (error) {
      console.error('Category update error:', error)
      toast.error('Failed to update category. Please try again.')
    }
  }

  const handleCategorizeAll = async () => {
    if (!uncategorizedCount || uncategorizedCount === 0) {
      toast.error('No uncategorized transactions found.')
      return
    }

    setIsCategorizing(true)
    setCategorizeProgress({ current: 0, total: uncategorizedCount })

    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/transactions/categorize-all`)
      toast.success('All transactions categorized successfully!')
      refetchTransactions()
      refetchUncategorizedCount()
    } catch (error) {
      console.error('Categorization error:', error)
      toast.error('Failed to categorize transactions. Please try again.')
    } finally {
      setIsCategorizing(false)
      setCategorizeProgress({ current: 0, total: 0 })
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user?.name}!</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowUpload(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Statement
                </button>
                {uncategorizedCount > 0 && (
                  <button
                    onClick={handleCategorizeAll}
                    disabled={isCategorizing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {isCategorizing ? 'Categorizing...' : 'Categorize All'}
                  </button>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Income</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(summary.totalIncome)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(summary.totalExpenses)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
                      <p className={`text-2xl font-semibold ${summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(summary.netCashFlow)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Transactions</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {summary.transactionCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Spending Trends</h3>
                <SpendingChart transactions={transactions || []} />
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Category Breakdown</h3>
                <CategoryChart transactions={transactions || []} />
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
              </div>
              <TransactionList 
                transactions={transactions || []} 
                categories={categories || []}
                onCategoryChange={handleCategoryChange}
                isLoading={transactionsLoading}
              />
            </div>
          </div>
        )
      case 'accounts':
        return <AccountManager />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Wealthup</h1>
              </div>
              <div className="ml-10 flex items-baseline space-x-4">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'accounts'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Accounts
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user.name}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <User className="h-8 w-8 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {renderTabContent()}
        </div>
      </main>

      {/* File Upload Modal */}
      {showUpload && (
        <FileUpload
          onClose={() => setShowUpload(false)}
          onUpload={handleFileUpload}
        />
      )}
    </div>
  )
}

function App() {
  const [authMode, setAuthMode] = useState('login')
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return authMode === 'login' ? (
      <Login onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthMode('login')} />
    )
  }

  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}

function AppWrapper() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <Toaster position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  )
}

export default AppWrapper 