import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { Plus, Edit, Trash2, CreditCard, Wallet, PiggyBank, Building2, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import AddAccountModal from './AddAccountModal';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = process.env.VITE_API_URL || 'http://100.123.199.100:9001';

const AccountManager = () => {
  const { isAuthenticated } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Fetch accounts
  const { data: accountsData, isLoading, refetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/accounts`);
      return response.data;
    },
    refetchOnWindowFocus: false,
    enabled: isAuthenticated, // Only run when authenticated
  });

  // Fetch account summary
  const { data: summaryData } = useQuery({
    queryKey: ['account-summary'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/accounts/summary`);
      return response.data;
    },
    refetchOnWindowFocus: false,
    enabled: isAuthenticated, // Only run when authenticated
  });

  const accounts = accountsData?.accounts || [];
  const summary = summaryData?.summary;

  const getAccountIcon = (type) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard className="h-6 w-6" />;
      case 'savings':
        return <PiggyBank className="h-6 w-6" />;
      case 'current':
        return <Wallet className="h-6 w-6" />;
      case 'investment':
        return <Coins className="h-6 w-6" />;
      case 'cash':
        return <Wallet className="h-6 w-6" />;
      default:
        return <Building2 className="h-6 w-6" />;
    }
  };

  const getAccountTypeColor = (type) => {
    switch (type) {
      case 'credit_card':
        return 'bg-red-100 text-red-800';
      case 'savings':
        return 'bg-green-100 text-green-800';
      case 'current':
        return 'bg-blue-100 text-blue-800';
      case 'investment':
        return 'bg-purple-100 text-purple-800';
      case 'cash':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/v1/accounts/${accountId}`);
      toast.success('Account deleted successfully');
      refetch();
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Failed to delete account');
    }
  };

  const handleAccountCreated = () => {
    setShowAddModal(false);
    refetch();
    toast.success('Account created successfully');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accounts</h2>
          <p className="text-gray-600">Manage your financial accounts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.total_accounts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <PiggyBank className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bank Balance</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summary.total_bank_balance)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Credit Balance</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summary.total_credit_balance)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Coins className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Worth</p>
                <p className={`text-2xl font-semibold ${summary.net_worth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.net_worth)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Your Accounts</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {accounts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No accounts</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first account.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </button>
              </div>
            </div>
          ) : (
            accounts.map((account) => (
              <div key={account.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getAccountIcon(account.type)}
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">{account.name}</h4>
                      <p className="text-sm text-gray-500">{account.institution}</p>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccountTypeColor(account.type)}`}>
                          {account.type.replace('_', ' ').toUpperCase()}
                        </span>
                        {account.account_number && (
                          <span className="ml-2 text-xs text-gray-500">
                            ****{account.account_number.slice(-4)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(account.current_balance)}
                      </p>
                      {account.type === 'credit_card' && account.credit_limit && (
                        <p className="text-xs text-gray-500">
                          Limit: {formatCurrency(account.credit_limit)}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setSelectedAccount(account)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAccountCreated}
        />
      )}
    </div>
  );
};

export default AccountManager; 