// Example for LoginForm component
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthTransition } from '../components/AuthTransition';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, authActionLoading, authActionMessage, clearAuthAction } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  // Clear loading state when component unmounts
  React.useEffect(() => {
    return () => {
      clearAuthAction();
    };
  }, [clearAuthAction]);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={authActionLoading}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={authActionLoading}
          />
        </div>

        <button
          type="submit"
          disabled={authActionLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {authActionLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <AuthTransition 
        isLoading={authActionLoading} 
        message={authActionMessage} 
      />
    </>
  );
};