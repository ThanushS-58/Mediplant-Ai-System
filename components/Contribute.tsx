
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import React, { useState, useRef, useEffect, useContext } from 'react';
import { I18nContext } from '../contexts/I18nContext';
import { Language } from '../types';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';
import Spinner from './Spinner';
import { addContribution } from '../services/dbService';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const Contribute: React.FC<{ language: Language }> = ({ language }) => {
    const { t } = useContext(I18nContext);
    const [formData, setFormData] = useState({
        plantName: '',
        author: '',
        location: '',
        partUsed: '',
        medicinalUseAndPreparation: ''
    });
    const [status, setStatus] = useState<'idle' | 'connecting' | 'recording' | 'error'>('idle');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const finalizedTextRef = useRef('');
    
    const isRecording = status === 'connecting' || status === 'recording';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const encode = (bytes: Uint8Array): string => {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    const startRecording = async () => {
        setStatus('connecting');
        setError(null);

        // Initialize finalized text ref from current form state to allow resuming dictation
        finalizedTextRef.current = formData.medicinalUseAndPreparation.trim() 
            ? formData.medicinalUseAndPreparation.trim() + ' ' 
            : '';

        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error("Microphone permission denied:", err);
            setError(t('micPermissionError'));
            setStatus('error');
            return;
        }
        
        // Refined system instruction for more accurate language detection.
        const systemInstruction = `You are a transcription assistant. Your only task is to accurately transcribe the user's speech into text. The transcription language must be the one with the BCP-47 code: ${language}. Do not generate any conversational response, questions, or audio. Only provide the text transcription of what the user says.`;

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    setStatus('recording');
                    audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    const source = audioContextRef.current.createMediaStreamSource(streamRef.current!);
                    scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(new Int16Array(inputData.map(d => d * 32768)).buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        sessionPromise.then((session) => {
                           session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(audioContextRef.current.destination);
                },
                onmessage: (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        const interimText = message.serverContent.inputTranscription.text;
                        setFormData(prev => ({
                            ...prev,
                            medicinalUseAndPreparation: finalizedTextRef.current + interimText
                        }));
                    }
                    if (message.serverContent?.turnComplete) {
                        setFormData(prev => {
                            const newFinalizedText = prev.medicinalUseAndPreparation.trim();
                            finalizedTextRef.current = newFinalizedText ? newFinalizedText + ' ' : '';
                            return prev;
                        });
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error("Session error:", e);
                    setError('A transcription error occurred.');
                    setStatus('error');
                    stopRecording();
                },
                onclose: (e: CloseEvent) => {
                  // This is an expected event when closing the session.
                  // No need to call stopRecording() again here to avoid loops.
                },
            },
            config: {
                responseModalities: [Modality.AUDIO], 
                inputAudioTranscription: {},
                systemInstruction,
                // Add speechConfig to provide a stronger hint for the transcription language.
                speechConfig: {
                    languageCode: language
                }
            },
        });
        sessionPromiseRef.current = sessionPromise;
    };

    const stopRecording = () => {
        if(sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setStatus('idle');
    };

    const handleRecordButtonClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRecording) {
            stopRecording();
        }

        setIsSubmitting(true);
        setSubmitSuccess(false);
        
        const contributionData = {
            plantName: formData.plantName,
            author: formData.author,
            location: formData.location,
            partUsed: formData.partUsed,
            medicinalUse: formData.medicinalUseAndPreparation, // Combined for simplicity
            preparation: '', // Can be enhanced later
        };

        addContribution(contributionData);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setIsSubmitting(false);
        setSubmitSuccess(true);
        
        // Reset form
        setFormData({
            plantName: '',
            author: '',
            location: '',
            partUsed: '',
            medicinalUseAndPreparation: ''
        });

        // Hide success message after a few seconds
        setTimeout(() => setSubmitSuccess(false), 4000);
    };

    // Cleanup effect to ensure resources are released on component unmount.
    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, []);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800">{t('contributeTitle')}</h2>
            <p className="text-sm text-gray-500 mt-2 mb-6">{t('contributeDescription')}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="plantName" className="block text-sm font-medium text-gray-700">{t('contributePlantName')}</label>
                    <input type="text" name="plantName" id="plantName" value={formData.plantName} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" placeholder={t('contributePlantNamePlaceholder')} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="author" className="block text-sm font-medium text-gray-700">{t('contributionFormAuthor')}</label>
                        <input type="text" name="author" id="author" value={formData.author} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" placeholder={t('contributionFormAuthorPlaceholder')} />
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">{t('contributionFormLocation')}</label>
                        <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" placeholder={t('contributionFormLocationPlaceholder')} />
                    </div>
                </div>

                <div>
                    <label htmlFor="partUsed" className="block text-sm font-medium text-gray-700">{t('contributionFormPartUsed')}</label>
                    <input type="text" name="partUsed" id="partUsed" value={formData.partUsed} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" placeholder={t('contributionFormPartUsedPlaceholder')} />
                </div>

                <div>
                    <label htmlFor="medicinalUseAndPreparation" className="block text-sm font-medium text-gray-700">{t('contributionFormUseAndPreparation')}</label>
                    <div className="mt-1 flex flex-col md:flex-row items-center md:items-start gap-4">
                        <textarea 
                            name="medicinalUseAndPreparation" 
                            id="medicinalUseAndPreparation" 
                            rows={6} 
                            value={formData.medicinalUseAndPreparation} 
                            onChange={handleChange} 
                            required 
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                            placeholder={t('contributionFormUsePlaceholder')}
                        ></textarea>
                         <button 
                            type="button"
                            onClick={handleRecordButtonClick}
                            className={`flex-shrink-0 w-full md:w-28 h-20 md:h-28 flex flex-col items-center justify-center gap-2 p-2 rounded-lg text-white transition-colors
                                ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'}`}
                            aria-label={isRecording ? t('stopRecording') : t('recordWithVoice')}
                        >
                            {isRecording ? <StopIcon className="w-8 h-8"/> : <MicrophoneIcon className="w-8 h-8"/>}
                            <span className="text-sm font-semibold">{t(isRecording ? 'stopRecording' : 'recordWithVoice')}</span>
                            {status === 'recording' && <span className="text-xs animate-pulse">{t('recording')}</span>}
                         </button>
                    </div>
                     {error && <p className="text-red-600 text-sm font-semibold mt-2">{error}</p>}
                </div>

                <div className="text-xs text-gray-500 pt-2">{t('contributionFormDisclaimer')}</div>
                
                <div className="pt-4 space-y-3">
                    {submitSuccess && (
                        <div className="flex items-center gap-3 p-3 bg-green-100 text-green-800 rounded-md text-sm animate-fade-in">
                            <CheckCircleIcon className="w-6 h-6 flex-shrink-0" />
                            <p className="font-semibold">{t('contributionSuccessMessage')}</p>
                        </div>
                    )}
                    <div className="flex justify-end">
                        <button 
                            type="submit" 
                            className="min-w-[150px] flex justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed"
                            disabled={isRecording || isSubmitting || !formData.plantName || !formData.partUsed || !formData.medicinalUseAndPreparation}
                        >
                            {isSubmitting ? <Spinner /> : t('submitForReview')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default Contribute;
