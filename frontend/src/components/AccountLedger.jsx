import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Eye,
  RefreshCw,
  Calculator
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:9001';

const AccountLedger = ({ accountId, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showReconciliation, setShowReconciliation] = useState(false);

  // Fetch account ledger
  const { data: ledgerData, isLoading, refetch } = useQuery({
    queryKey: ['account-ledger', accountId, currentPage],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/accounts/${accountId}/ledger?page=${currentPage}&limit=50`);
      return response.data;
    },
    refetchOnWindowFocus: false,
  });

  // Fetch reconciliation data
  const { data: reconciliationData, refetch: refetchReconciliation } = useQuery({
    queryKey: ['account-reconciliation', accountId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/accounts/${accountId}/reconciliation`);
      return response.data;
    },
    refetchOnWindowFocus: false,
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const handleRecalculateBalance = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/accounts/${accountId}/recalculate-balance`);
      toast.success('Account balance recalculated successfully');
      refetch();
      refetchReconciliation();
    } catch (error) {
      console.error('Recalculate balance error:', error);
      toast.error('Failed to recalculate balance');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { account, transactions, pagination } = ledgerData || {};
  const { reconciliation } = reconciliationData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {account?.name} - Transaction Ledger
          </h2>
          <p className="text-gray-600">
            {account?.institution} • {account?.type?.replace('_', ' ').toUpperCase()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowReconciliation(!showReconciliation)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showReconciliation ? 'Hide' : 'Show'} Reconciliation
          </button>
          <button
            onClick={() => {
              refetch();
              refetchReconciliation();
            }}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleRecalculateBalance}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Recalculate Balance
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>

      {/* Reconciliation Panel */}
      {showReconciliation && reconciliation && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Balance Reconciliation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">Total Credits</p>
                  <p className="text-lg font-semibold text-green-900">
                    {formatCurrency(reconciliation.total_credits)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">Total Debits</p>
                  <p className="text-lg font-semibold text-red-900">
                    {formatCurrency(reconciliation.total_debits)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">Expected Balance</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(reconciliation.expected_balance)}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${reconciliation.is_balanced ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <div className="flex items-center">
                {reconciliation.is_balanced ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                )}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-800">Status</p>
                  <p className={`text-lg font-semibold ${reconciliation.is_balanced ? 'text-green-900' : 'text-yellow-900'}`}>
                    {reconciliation.is_balanced ? 'Balanced' : 'Discrepancy'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {!reconciliation.is_balanced && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">Balance Discrepancy</p>
                  <p className="text-sm text-yellow-700">
                    Difference: {formatCurrency(reconciliation.difference)} • 
                    Actual Balance: {formatCurrency(reconciliation.actual_balance)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-600">
            <p>Total Transactions: {reconciliation.transaction_count}</p>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
        </div>
        
        {transactions && transactions.length > 0 ? (
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
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.category_name ? (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${transaction.category_color}20`,
                            color: transaction.category_color
                          }}
                        >
                          {transaction.category_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Uncategorized</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(transaction.running_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload a bank statement to see transaction history.
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.current_page} of {pagination.total_pages} 
                ({pagination.total_count} total transactions)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(pagination.total_pages, currentPage + 1))}
                  disabled={currentPage === pagination.total_pages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountLedger; 