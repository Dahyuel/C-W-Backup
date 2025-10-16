// src/components/UnauthorizedPage.tsx
import React from 'react';
import { UserX, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UnauthorizedPage: React.FC = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-md overflow-hidden text-center">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-8 text-center">
          <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <UserX className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Account Disabled</h1>
          <p className="text-red-100">Access Restricted</p>
        </div>

        {/* Message */}
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <h3 className="text-lg font-semibold text-red-800">
                Access Denied
              </h3>
            </div>
            <p className="text-red-700 mb-4">
              Your account does not meet the event eligibility requirements and has been disabled.
            </p>
            <div className="text-left bg-red-100 p-4 rounded-lg mb-4">
              <p className="text-red-800 text-sm font-medium mb-2">Eligibility Requirements:</p>
              <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
                <li>Ain Shams University students or graduates</li>
                <li>Graduates from Helwan University</li>
                <li>Graduates from Banha University</li>
                <li>Graduates from Canadian Ahram University</li>
              </ul>
            </div>
            <p className="text-red-600 text-sm">
              If you believe this is a mistake, please contact the event organizers.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Return to Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};