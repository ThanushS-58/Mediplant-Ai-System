import React, { useContext } from 'react';
import { LeafIcon } from './icons/LeafIcon';
import { LANGUAGES } from '../constants';
import { Language } from '../types';
import { I18nContext } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  onAuthClick: (initialTab: 'login' | 'signup') => void;
}

const Header: React.FC<HeaderProps> = ({ currentLanguage, setLanguage, onAuthClick }) => {
  const { t } = useContext(I18nContext);
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <LeafIcon className="h-8 w-8 text-primary" />
            <h1 className="ml-2 text-2xl font-bold text-gray-800 tracking-tight">
              {t('appTitlePart1')} <span className="text-primary">{t('appTitlePart2')}</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 text-sm"
              aria-label="Select language"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <>
                  <span className="text-sm font-medium text-gray-600">
                    {user.email}
                  </span>
                  <button 
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors"
                  >
                    {t('logoutButton')}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => onAuthClick('login')}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                  >
                    {t('loginButton')}
                  </button>
                  <button 
                    onClick={() => onAuthClick('signup')}
                    className="px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors"
                  >
                    {t('signupButton')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;