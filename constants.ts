import { Language } from './types';

interface LanguageOption {
  code: Language;
  name: string;
}

export const LANGUAGES: LanguageOption[] = [
    { code: 'en-US', name: 'English' },
    { code: 'hi-IN', name: 'हिन्दी (Hindi)' },
    { code: 'ta-IN', name: 'தமிழ் (Tamil)' },
    { code: 'te-IN', name: 'తెలుగు (Telugu)' },
    { code: 'ml-IN', name: 'മലയാളം (Malayalam)' },
];
