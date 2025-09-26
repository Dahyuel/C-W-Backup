// components/LoadingWrapper.tsx - Enhanced loading management
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoadingWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  timeout?: number; // Timeout in milliseconds
}

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading...</h2>
      <p className="text-gray-500">Please wait while we load your session</p>
    </div>
  </div>
);

const LoadingTimeout: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Timeout</h2>
      <p className="text-gray-600 mb-6">
        The application is taking longer than expected to load. This might be due to a slow connection.
      </p>
      <div className="space-y-3">
        <button 
          onClick={onRetry}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
        <button 
          onClick={() => window.location.href = '/login'}
          className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  </div>
);

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({ 
  children, 
  fallback,
  timeout = 30000 // 30 seconds default timeout
}) => {
  const { loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout reached');
        setTimedOut(true);
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [loading, timeout]);

  const handleRetry = () => {
    setTimedOut(false);
    window.location.reload();
  };

  if (loading && timedOut) {
    return <LoadingTimeout onRetry={handleRetry} />;
  }

  if (loading) {
    return fallback || <LoadingSpinner />;
  }

  return <>{children}</>;
};

// Hook for components that need loading state management
export const useLoadingState = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);

  const withLoading = async <T,>(promise: Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      const result = await promise;
      return result;
    } finally {
      setLoading(false);
    }
  };

  return { loading, setLoading, withLoading };
};

export default LoadingWrapper;