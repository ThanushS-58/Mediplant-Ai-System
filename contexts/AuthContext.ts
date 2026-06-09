import React, { createContext, useState, useContext, ReactNode } from 'react';
import { AuthenticatedUser } from '../types';
import { authenticateUser, registerUser } from '../services/dbService';


// Define the shape of the context
interface IAuthContext {
  user: AuthenticatedUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<IAuthContext | undefined>(undefined);

// Create the provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  const login = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const authenticatedUser = authenticateUser(email, password);
      if (authenticatedUser) {
        setUser(authenticatedUser);
        resolve();
      } else {
        reject(new Error('Invalid credentials'));
      }
    });
  };

  const logout = () => {
    setUser(null);
  };
  
  const register = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        registerUser(email, password);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  return React.createElement(AuthContext.Provider, { value: { user, login, logout, register } }, children);
};

// Create a custom hook for easy context consumption
export const useAuth = (): IAuthContext => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};