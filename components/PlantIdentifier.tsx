import React, { useState, useCallback, useEffect, useRef, useContext } from 'react';
import { identifyPlant } from '../services/geminiService';
import { Language, PlantInfo } from '../types';
import Spinner from './Spinner';
import { CameraIcon } from './icons/CameraIcon';
import { UploadIcon } from './icons/UploadIcon';
import { VolumeUpIcon } from './icons/VolumeUpIcon';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { I18nContext } from '../contexts/I18nContext';
import { InformationCircleIcon } from './icons/InformationCircleIcon';

interface PlantIdentifierProps {
  language: Language;
}

const PlantIdentifier: React.FC<PlantIdentifierProps> = ({ language }) => {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [plantInfo, setPlantInfo] = useState<PlantInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isSpeaking, speak, cancel, voices, error: ttsError } = useTextToSpeech();
  const { t } = useContext(I18nContext);
  const isInitialRender = useRef(true);

  const [voiceOptions, setVoiceOptions] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');

  // Effect to find available browser voices for the current language.
  useEffect(() => {
    const availableVoices = voices.filter(v => v.lang === language || v.lang.startsWith(language.split('-')[0]));

    setVoiceOptions(availableVoices);

    if (availableVoices.length > 0) {
      // Prioritize default, then Google, then female voices for a better out-of-the-box experience.
      const defaultVoice = availableVoices.find(v => v.default) || 
                           availableVoices.find(v => v.name.toLowerCase().includes('google')) ||
                           availableVoices.find(v => v.name.toLowerCase().includes('female')) ||
                           availableVoices[0];
      setSelectedVoiceURI(defaultVoice.voiceURI);
    } else {
      setSelectedVoiceURI('');
    }
  }, [voices, language]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setPlantInfo(null);
        setError(null);
        cancel(); // Stop any speaking from previous identification
      };
      reader.readAsDataURL(selectedFile);
    }
  };
  
  const handleSpeak = useCallback(() => {
    if (!plantInfo) return;
    const fullText = [
        plantInfo.plantName,
        plantInfo.commonNames.join(', '),
        `${t('description')}: ${plantInfo.description}`,
        `${t('medicinalUses')}: ${plantInfo.medicinalUses.map(u => `${u.partUsed}: ${u.uses.join(', ')}`).join('. ')}`,
        `${t('preparation')}: ${plantInfo.preparationMethods.join(', ')}`,
        plantInfo.culturalSignificance ? `${t('culturalSignificance')}: ${plantInfo.culturalSignificance}` : '',
        `${t('warnings')}: ${plantInfo.warnings}`
    ].filter(Boolean).join('. ');

    speak(fullText, language, selectedVoiceURI);
  }, [plantInfo, language, selectedVoiceURI, speak, t]);


  const handleIdentify = useCallback(async () => {
    if (!file) {
      setError(t('errorSelectImage'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setPlantInfo(null); // Clear previous results
    cancel();
    try {
      const base64Image = await fileToBase64(file);
      const result = await identifyPlant(base64Image, file.type, language);
      setPlantInfo(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [file, language, t, cancel]);

  // Effect to automatically speak the results when they become available.
  useEffect(() => {
    // This effect is specifically for auto-playing the results when they arrive.
    // It should only run when plantInfo changes from null to a valid object.
    if (plantInfo) {
      // A brief delay improves UX, allowing the user to see the content first.
      const timer = setTimeout(() => {
        handleSpeak();
      }, 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantInfo]); // Intentionally only depends on plantInfo.


  // Effect to re-identify the plant when the language changes.
  useEffect(() => {
    // Don't run on the initial component mount.
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    // If a plant has already been identified, re-run the identification
    // to fetch the information in the newly selected language.
    if (file && plantInfo) {
      handleIdentify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);


  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove the data URL prefix
      };
      reader.onerror = (error) => reject(error);
    });
  };
  
  const getConfidenceColor = (score: number) => {
    if (score > 0.8) return 'text-green-600 bg-green-100';
    if (score > 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('identifyTitle')}</h2>
        <p className="text-gray-600 mb-6">{t('identifyDescription')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {image ? (
              <img src={image} alt="Plant preview" className="max-h-60 mx-auto rounded-md" />
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <UploadIcon className="w-12 h-12 mb-2" />
                <p>{t('dropzonePrompt')}</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-primary hover:file:bg-green-100"
            />
          </div>
          <div className="flex flex-col items-center">
             <button
              onClick={handleIdentify}
              disabled={!image || isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark transition-transform transform hover:scale-105"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  {t('identifyingButton')}
                </>
              ) : (
                <>
                  <CameraIcon className="w-5 h-5" />
                  {t('identifyButton')}
                </>
              )}
            </button>
          </div>
        </div>
        
        {error && <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

      </div>
      
      {ttsError && 
        <div className="mt-8 flex items-center gap-3 p-4 bg-red-100 text-red-800 rounded-md text-sm">
            <InformationCircleIcon className="w-6 h-6 flex-shrink-0" />
            <p><span className="font-semibold">Text-to-Speech Error:</span> {ttsError}</p>
        </div>
      }

      {plantInfo && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-lg animate-fade-in">
          <h3 className="text-3xl font-bold text-primary-dark mb-2">{plantInfo.plantName}</h3>
          <p className="text-gray-500 italic mb-4">{plantInfo.commonNames.join(', ')}</p>

          <div className={`inline-block px-3 py-1 text-sm font-semibold rounded-full mb-4 ${getConfidenceColor(plantInfo.confidenceScore)}`}>
            {t('confidence')}: {(plantInfo.confidenceScore * 100).toFixed(1)}%
          </div>
          
          {/* TTS Controls */}
          <div className="bg-gray-50 p-3 rounded-md mb-6 flex flex-col sm:flex-row items-center gap-3">
            {voiceOptions.length > 0 ? (
              <>
                <button onClick={isSpeaking ? cancel : handleSpeak} className="flex-shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark disabled:bg-gray-400">
                  <VolumeUpIcon className="w-5 h-5" />
                  {isSpeaking ? t('stopConversation') : t('readAloud')}
                </button>
                <select
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  disabled={isSpeaking}
                  className="w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                >
                  {voiceOptions.map(voice => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="w-full flex items-center gap-3 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                <InformationCircleIcon className="w-6 h-6 flex-shrink-0" />
                <p>{t('noVoiceAvailable')}</p>
              </div>
            )}
          </div>

          <div className="space-y-4 text-gray-700">
            <p><span className="font-semibold">{t('description')}: </span>{plantInfo.description}</p>
            
            <div>
              <h4 className="font-semibold text-lg mb-2">{t('medicinalUses')}</h4>
              <ul className="list-disc list-inside space-y-2 pl-2">
                {plantInfo.medicinalUses.map((use, index) => (
                  <li key={index}>
                    <span className="font-semibold">{use.partUsed}: </span>{use.uses.join(', ')}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2">{t('preparation')}</h4>
              <p>{plantInfo.preparationMethods.join(', ')}</p>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2">{t('culturalSignificance')}</h4>
              <p>{plantInfo.culturalSignificance}</p>
            </div>
            
             <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50">
              <h4 className="font-semibold text-lg mb-2 text-yellow-800">{t('warnings')}</h4>
              <p>{plantInfo.warnings}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantIdentifier;