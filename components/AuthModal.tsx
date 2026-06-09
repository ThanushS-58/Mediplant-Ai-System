import React, { useContext, useState, useEffect } from 'react';
import { I18nContext } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { XIcon } from './icons/XIcon';
import Spinner from './Spinner';

type AuthTab = 'login' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab: AuthTab;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab }) => {
  const { t } = useContext(I18nContext);
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Signup State
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Reset all form states when modal opens
      setLoginEmail('');
      setLoginPassword('');
      setLoginError(null);
      setIsLoggingIn(false);
      setSignupEmail('');
      setSignupPassword('');
      setConfirmPassword('');
      setSignupError(null);
      setSignupSuccess(false);
      setIsSigningUp(false);
    }
  }, [isOpen, initialTab]);
  
  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await login(loginEmail, loginPassword);
      onClose();
    } catch (err) {
      setLoginError(t('invalidCredentialsError'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupSuccess(false);

    if (signupPassword !== confirmPassword) {
      setSignupError(t('passwordsDoNotMatchError'));
      return;
    }
    setIsSigningUp(true);
    try {
      await register(signupEmail, signupPassword);
      setSignupSuccess(true);
      setTimeout(() => {
        setActiveTab('login');
        setSignupSuccess(false);
        // Clear signup form for good hygiene
        setSignupEmail('');
        setSignupPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch(err) {
      if(err instanceof Error && err.message.includes('already exists')) {
        setSignupError(t('emailAlreadyExistsError'));
      } else {
        setSignupError('An unexpected error occurred.');
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  const TabButton: React.FC<{ label: string; tabName: AuthTab }> = ({ label, tabName }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`w-full py-2.5 text-sm font-medium leading-5 rounded-lg focus:outline-none transition-colors ${
        activeTab === tabName ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end items-center mb-2">
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label={t('closeButton')}>
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="w-full max-w-sm mx-auto">
            <div className="bg-gray-200 rounded-lg p-1 flex space-x-1 mb-6">
                <TabButton label={t('loginTab')} tabName="login" />
                <TabButton label={t('signupTab')} tabName="signup" />
            </div>

            {activeTab === 'login' && (
                <div>
                    <h2 id="auth-modal-title" className="text-xl font-bold text-gray-800 text-center mb-2">{t('loginModalTitle')}</h2>
                    <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-3 rounded-md text-sm mb-4">
                        <p className="font-bold">Demo Credentials:</p>
                        <p>{t('adminCredentialsInfo')}</p>
                        <p>{t('userCredentialsInfo')}</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">{t('emailLabel')}</label>
                            <input type="email" id="login-email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="login-password"className="block text-sm font-medium text-gray-700">{t('passwordLabel')}</label>
                            <input type="password" id="login-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                        </div>
                        {loginError && <p className="text-red-600 text-sm font-semibold">{loginError}</p>}
                        <div className="pt-4">
                            <button type="submit" disabled={isLoggingIn} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:bg-gray-400">
                                {isLoggingIn ? <Spinner /> : t('submitLoginButton')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {activeTab === 'signup' && (
                <div>
                    <h2 id="auth-modal-title" className="text-xl font-bold text-gray-800 text-center mb-4">{t('createAccountTitle')}</h2>
                     <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">{t('emailLabel')}</label>
                            <input type="email" id="signup-email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="signup-password"className="block text-sm font-medium text-gray-700">{t('passwordLabel')}</label>
                            <input type="password" id="signup-password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="confirm-password"className="block text-sm font-medium text-gray-700">{t('confirmPasswordLabel')}</label>
                            <input type="password" id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                        </div>
                        {signupError && <p className="text-red-600 text-sm font-semibold">{signupError}</p>}
                        {signupSuccess && <p className="text-green-600 text-sm font-semibold">{t('signupSuccessMessage')}</p>}
                        <div className="pt-4">
                            <button type="submit" disabled={isSigningUp} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:bg-gray-400">
                                {isSigningUp ? <Spinner /> : t('submitSignupButton')}
                            </button>
                        </div>
                    </form>
                    <p className="mt-4 text-center text-sm text-gray-600">
                        {t('alreadyHaveAccountPrompt')}{' '}
                        <button onClick={() => setActiveTab('login')} className="font-medium text-primary hover:text-primary-dark">
                            {t('loginButton')}
                        </button>
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;