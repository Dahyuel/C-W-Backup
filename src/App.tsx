import React, { useState } from 'react';
import { RegistrationForm } from './components/RegistrationForm';
import { LoginForm } from './components/LoginForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';

type ViewState = 'login' | 'register' | 'forgot-password';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('login');

  const switchToLogin = () => setCurrentView('login');
  const switchToRegister = () => setCurrentView('register');
  const switchToForgotPassword = () => setCurrentView('forgot-password');

  return (
    <>
      {currentView === 'login' && (
        <LoginForm 
          onSwitchToRegister={switchToRegister}
          onSwitchToForgotPassword={switchToForgotPassword}
        />
      )}
      
      {currentView === 'register' && (
        <RegistrationForm onSwitchToLogin={switchToLogin} />
      )}
      
      {currentView === 'forgot-password' && (
        <ForgotPasswordForm onSwitchToLogin={switchToLogin} />
      )}
    </>
  );
}

export default App;