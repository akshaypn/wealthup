import React, { useState } from 'react';
import axios from 'axios';
import { X, CreditCard, Wallet, PiggyBank, Building2, Coins } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:9001';

const AddAccountModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'savings',
    institution: '',
    account_number: '',
    current_balance: '',
    credit_limit: '',
    due_date: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const accountTypes = [
    { value: 'savings', label: 'Savings Account', icon: PiggyBank },
    { value: 'current', label: 'Current Account', icon: Wallet },
    { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
    { value: 'investment', label: 'Investment Account', icon: Coins },
    { value: 'cash', label: 'Cash', icon: Wallet }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.institution) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        institution: formData.institution,
        account_number: formData.account_number || null,
        current_balance: parseFloat(formData.current_balance) || 0,
        credit_limit: formData.type === 'credit_card' ? parseFloat(formData.credit_limit) || 0 : null,
        due_date: formData.type === 'credit_card' && formData.due_date ? formData.due_date : null
      };

      await axios.post(`${API_BASE_URL}/api/v1/accounts`, payload);
      onSuccess();
    } catch (error) {
      console.error('Create account error:', error);
      toast.error(error.response?.data?.error || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedType = accountTypes.find(type => type.value === formData.type);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add New Account</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Account Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {accountTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="h-5 w-5 text-gray-600 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{type.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Account Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., HDFC Savings"
                required
              />
            </div>

            <div>
              <label htmlFor="institution" className="block text-sm font-medium text-gray-700">
                Bank/Institution *
              </label>
              <input
                type="text"
                id="institution"
                name="institution"
                value={formData.institution}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., HDFC Bank"
                required
              />
            </div>

            {formData.type !== 'cash' && (
              <div>
                <label htmlFor="account_number" className="block text-sm font-medium text-gray-700">
                  Account Number
                </label>
                <input
                  type="text"
                  id="account_number"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Last 4 digits only"
                />
              </div>
            )}

            <div>
              <label htmlFor="current_balance" className="block text-sm font-medium text-gray-700">
                Current Balance
              </label>
              <input
                type="number"
                id="current_balance"
                name="current_balance"
                value={formData.current_balance}
                onChange={handleInputChange}
                step="0.01"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            {formData.type === 'credit_card' && (
              <>
                <div>
                  <label htmlFor="credit_limit" className="block text-sm font-medium text-gray-700">
                    Credit Limit
                  </label>
                  <input
                    type="number"
                    id="credit_limit"
                    name="credit_limit"
                    value={formData.credit_limit}
                    onChange={handleInputChange}
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAccountModal; 