import React from 'react';

interface LoadingScreenProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Loading...", 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-b-2 border-orange-500 mx-auto mb-4 ${sizeClasses[size]}`}></div>
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;