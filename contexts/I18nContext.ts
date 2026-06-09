import { createContext } from 'react';
import { Language } from '../types';

interface II18nContext {
  language: Language;
  t: (key: string) => string;
}

// Default context value for type safety and to prevent errors if a component
// is used outside of a provider. The default `t` function returns the key itself.
export const I18nContext = createContext<II18nContext>({
  language: 'en-US',
  t: (key: string) => key,
});
