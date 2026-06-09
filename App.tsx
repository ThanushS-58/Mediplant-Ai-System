import React, { useState, useContext, useEffect } from 'react';
import Header from './components/Header';
import AiAssistant from './components/AiAssistant';
import KnowledgeBase from './components/KnowledgeBase';
import { Language } from './types';
import { LeafIcon } from './components/icons/LeafIcon';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { PlusCircleIcon } from './components/icons/PlusCircleIcon';
import { ShieldCheckIcon } from './components/icons/ShieldCheckIcon'; // New Icon
import { I18nContext } from './contexts/I18nContext';
import { translations } from './i18n/translations';
import Contribute from './components/Contribute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import { initializeDb } from './services/dbService';


type ActiveTab = 'assistant' | 'knowledgeBase' | 'contribute' | 'admin';
type AuthModalMode = 'login' | 'signup';

const AppContent: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en-US');
  const [activeTab, setActiveTab] = useState<ActiveTab>('assistant');
  const { user } = useAuth();
  const [authModalConfig, setAuthModalConfig] = useState({
    isOpen: false,
    initialTab: 'login' as AuthModalMode,
  });

  // Initialize the database on app load
  useEffect(() => {
    initializeDb();
  }, []);

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en-US'][key] || key;
  };

  const handleAuthModalOpen = (initialTab: AuthModalMode) => {
    setAuthModalConfig({ isOpen: true, initialTab });
  };
  
  const handleAuthModalClose = () => {
    setAuthModalConfig({ isOpen: false, initialTab: 'login' });
  };

  const handleTabClick = (tabName: ActiveTab) => {
    if ((tabName === 'contribute' || tabName === 'admin') && !user) {
      handleAuthModalOpen('login');
    } else {
      setActiveTab(tabName);
    }
  };

  const TabButton: React.FC<{ tabName: ActiveTab; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => handleTabClick(tabName)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
        activeTab === tabName
          ? 'border-b-2 border-primary text-primary'
          : 'text-gray-500 hover:text-primary'
      }`}
      aria-current={activeTab === tabName ? 'page' : undefined}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <I18nContext.Provider value={{ language, t }}>
      <div className="min-h-screen bg-secondary font-sans text-gray-800">
        <Header 
          setLanguage={setLanguage} 
          currentLanguage={language} 
          onAuthClick={handleAuthModalOpen}
        />
        <main className="p-4 sm:p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
                <TabButton tabName="assistant" label={t('tabAssistant')} icon={<LeafIcon className="w-5 h-5" />} />
                <TabButton tabName="knowledgeBase" label={t('tabKnowledgeBase')} icon={<BookOpenIcon className="w-5 h-5" />} />
                {user && <TabButton tabName="contribute" label={t('tabContribute')} icon={<PlusCircleIcon className="w-5 h-5" />} />}
                {user && user.role === 'admin' && <TabButton tabName="admin" label={t('tabAdmin')} icon={<ShieldCheckIcon className="w-5 h-5" />} />}
              </nav>
            </div>
            <div className="mt-6">
              {activeTab === 'assistant' && <AiAssistant language={language} />}
              {activeTab === 'knowledgeBase' && <KnowledgeBase />}
              {activeTab === 'contribute' && user && <Contribute language={language} />}
              {activeTab === 'admin' && user && user.role === 'admin' && <AdminDashboard />}
            </div>
          </div>
        </main>
        <footer className="text-center p-4 text-gray-500 text-sm border-t border-gray-200 mt-8">
          <div className="flex items-center justify-center gap-2">
            <LeafIcon className="w-5 h-5 text-primary" />
            <p>{t('footerText')}</p>
          </div>
        </footer>
      </div>
      <AuthModal 
        isOpen={authModalConfig.isOpen}
        onClose={handleAuthModalClose}
        initialTab={authModalConfig.initialTab}
      />
    </I18nContext.Provider>
  );
};


const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);


export default App;