
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob, Chat } from '@google/genai';
import React, { useState, useRef, useEffect, useContext } from 'react';
import { I18nContext } from '../contexts/I18nContext';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';
import Spinner from './Spinner';
import { Language, PlantInfo } from '../types';
import { identifyPlant } from '../services/geminiService';
import { UploadIcon } from './icons/UploadIcon';
import { CameraIcon } from './icons/CameraIcon';
import { SwitchCameraIcon } from './icons/SwitchCameraIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';

interface TranscriptEntry {
  type: 'user' | 'model';
  text: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const AiAssistant: React.FC<{ language: Language }> = ({ language }) => {
    const { t } = useContext(I18nContext);
    const [status, setStatus] = useState<'ready' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error'>('ready');
    const [micPermissionError, setMicPermissionError] = useState<boolean>(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    
    // State for plant identification
    const [image, setImage] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [plantInfo, setPlantInfo] = useState<PlantInfo | null>(null);
    const [isIdentifying, setIsIdentifying] = useState<boolean>(false);
    const [identificationError, setIdentificationError] = useState<string | null>(null);

    // State for camera
    const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    
    // State for text input
    const [textInput, setTextInput] = useState('');
    const [isSending, setIsSending] = useState(false);


    const sessionRef = useRef<LiveSession | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chatRef = useRef<Chat | null>(null);

    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    // Effect to create a new chat session when a plant is identified or language changes
    useEffect(() => {
        if (plantInfo) {
          chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
              systemInstruction: `You are a friendly ethnobotanist. You are discussing the plant: ${plantInfo.plantName} (${plantInfo.scientificName}). Use the following data to answer questions: Description - ${plantInfo.description}. Uses - ${plantInfo.medicinalUses.map(u => `${u.partUsed}: ${u.uses.join(', ')}`).join('. ')}. Respond in the language with this code: ${language}. Keep your answers concise and helpful.`,
            },
          });
          setTranscript([]); // Clear transcript for the new plant/language
        } else {
          chatRef.current = null;
        }
      }, [plantInfo, language]);


    // Effect to check for multiple cameras
    useEffect(() => {
        const checkForMultipleCameras = async () => {
            if (navigator.mediaDevices?.enumerateDevices) {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoInputCount = devices.filter(device => device.kind === 'videoinput').length;
                    setHasMultipleCameras(videoInputCount > 1);
                } catch (err) {
                    console.error("Could not enumerate devices:", err);
                }
            }
        };
        checkForMultipleCameras();
    }, []);
    
    // Effect to handle setting video source when camera modal opens or stream changes
    useEffect(() => {
        if (isCameraOpen && videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [isCameraOpen, cameraStream]);

    // --- Audio Decoding and Encoding Helpers ---
    const decode = (base64: string): Uint8Array => {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    const encode = (bytes: Uint8Array): string => {
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    async function decodeAudioData(
      data: Uint8Array,
      ctx: AudioContext,
      sampleRate: number,
      numChannels: number,
    ): Promise<AudioBuffer> {
      const dataInt16 = new Int16Array(data.buffer);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
      }
      return buffer;
    }

    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
    };

    const openCamera = async (mode: 'user' | 'environment') => {
        setCameraError(null);
        setImage(null);
        setFile(null);
        // Stop any existing stream before opening a new one
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Camera API is not supported by your browser.");
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
            setCameraStream(stream);
            setIsCameraOpen(true);
        } catch (err) {
            console.error("Camera access error:", err);
             try {
                // Fallback for devices that don't support facingMode or fail for some reason
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setCameraStream(stream);
                setIsCameraOpen(true);
            } catch (fallbackErr) {
                 console.error("Fallback camera access error:", fallbackErr);
                 setCameraError(t('cameraPermissionError'));
            }
        }
    };

    const switchCamera = () => {
        setFacingMode(prev => {
            const newMode = prev === 'user' ? 'environment' : 'user';
            openCamera(newMode);
            return newMode;
        });
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                        setFile(capturedFile);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            setImage(reader.result as string);
                        };
                        reader.readAsDataURL(capturedFile);
                        setPlantInfo(null);
                        setIdentificationError(null);
                        setTranscript([]);
                    }
                    closeCamera();
                }, 'image/jpeg', 0.95);
            } else {
                closeCamera();
            }
        }
    };

    const startConversation = async (identifiedPlantInfo: PlantInfo) => {
        setStatus('connecting');
        setMicPermissionError(false);
        setTranscript([]);

        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error("Microphone permission denied:", err);
            setMicPermissionError(true);
            setStatus('error');
            return;
        }

        outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = outputAudioContextRef.current.createGain();
        outputNode.connect(outputAudioContextRef.current.destination);
        const sources = new Set<AudioBufferSourceNode>();
        let nextStartTime = 0;

        const systemInstruction = `You are a friendly ethnobotanist. The user has identified a plant: ${identifiedPlantInfo.plantName} (${identifiedPlantInfo.scientificName}). Their first unspoken question is 'Tell me about this plant'. Begin the conversation by introducing the plant, giving a one-sentence summary of its primary use, and then invite them to ask more questions. Use this data: Description - ${identifiedPlantInfo.description}. Uses - ${identifiedPlantInfo.medicinalUses.map(u => `${u.partUsed}: ${u.uses.join(', ')}`).join('. ')}. Respond in the language with this code: ${language}.`;
        
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    setStatus('listening');
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
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                    if (message.serverContent?.outputTranscription) {
                        setStatus('speaking');
                        currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                    }

                    if (message.serverContent?.turnComplete) {
                        const fullInput = currentInputTranscriptionRef.current.trim();
                        const fullOutput = currentOutputTranscriptionRef.current.trim();
                        
                        if (fullInput || fullOutput) {
                            setTranscript(prev => [...prev, 
                                { type: 'user', text: fullInput },
                                { type: 'model', text: fullOutput }
                            ].filter(entry => entry.text));
                        }

                        currentInputTranscriptionRef.current = '';
                        currentOutputTranscriptionRef.current = '';
                        setStatus('listening');
                    }
                    
                    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && outputAudioContextRef.current) {
                        nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
                        const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.addEventListener('ended', () => sources.delete(source));
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                        sources.add(source);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error("Session error:", e);
                    setStatus('error');
                    stopConversation();
                },
                onclose: (e: CloseEvent) => stopConversation(),
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction,
            },
        });
        sessionRef.current = await sessionPromise;
    };

    const stopConversation = () => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        
        setStatus('ready');
    };
    
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = (error) => reject(error);
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setPlantInfo(null);
                setIdentificationError(null);
                setTranscript([]);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleIdentify = async () => {
        if (!file) {
            setIdentificationError(t('errorSelectImage'));
            return;
        }
        setIsIdentifying(true);
        setIdentificationError(null);
        setPlantInfo(null);
        setTranscript([]);

        try {
            const base64Image = await fileToBase64(file);
            const result = await identifyPlant(base64Image, file.type, language);
            setPlantInfo(result);
        } catch (err) {
            setIdentificationError(err instanceof Error ? err.message : 'An unexpected error occurred.');
            setStatus('ready');
        } finally {
            setIsIdentifying(false);
        }
    };

    const handleSendTextMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!textInput.trim() || !plantInfo || !chatRef.current) return;
    
        const messageToSend = textInput.trim();
        setTranscript(prev => [...prev, { type: 'user', text: messageToSend }]);
        setTextInput('');
        setIsSending(true);
    
        try {
            const response = await chatRef.current.sendMessage({ message: messageToSend });
            const responseText = response.text;
            setTranscript(prev => [...prev, { type: 'model', text: responseText }]);
        } catch (err) {
            console.error("Error sending text message:", err);
            setTranscript(prev => [...prev, { type: 'model', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsSending(false);
        }
    };

    const handleReset = () => {
        stopConversation();
        setImage(null);
        setFile(null);
        setPlantInfo(null);
        setIdentificationError(null);
    };

    useEffect(() => {
        return () => {
            stopConversation();
            closeCamera();
        };
    }, []);
    
    const getConfidenceColor = (score: number) => {
        if (score > 0.8) return 'text-green-600 bg-green-100';
        if (score > 0.5) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const isConversationActive = ['connecting', 'listening', 'thinking', 'speaking'].includes(status);

    const CameraModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 rounded-lg shadow-xl max-w-2xl w-full">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-md aspect-video object-cover bg-gray-900"></video>
                <div className="mt-4 flex flex-col sm:flex-row justify-center gap-4">
                    <button
                        onClick={handleCapture}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
                    >
                        <CameraIcon className="w-5 h-5" />
                        {t('captureButton')}
                    </button>
                    {hasMultipleCameras && (
                        <button
                            onClick={switchCamera}
                            type="button"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <SwitchCameraIcon className="w-5 h-5" />
                            <span>{t('switchCamera')}</span>
                        </button>
                    )}
                    <button
                        onClick={closeCamera}
                        className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        {t('closeButton')}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg">
        {isCameraOpen && <CameraModal />}
        <canvas ref={canvasRef} className="hidden" />

        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('assistantTitle')}</h2>
        <p className="text-gray-600 mb-6">{t('assistantDescription')}</p>
        
        {!plantInfo && (
            <>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                    {image ? (
                        <div>
                            <img src={image} alt="Plant preview" className="max-h-60 mx-auto rounded-md" />
                            <button onClick={() => { setImage(null); setFile(null); }} className="mt-4 text-sm text-red-600 hover:text-red-800 font-semibold" >
                                {t('removeImage')}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col items-center text-gray-500">
                                <UploadIcon className="w-12 h-12 mb-2" />
                                <p className="mb-4">{t('dropzonePrompt')}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                                    <UploadIcon className="w-5 h-5" />
                                    <span>{t('uploadFromFile')}</span>
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                </label>
                                <button onClick={() => openCamera('environment')} type="button" className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                    <CameraIcon className="w-5 h-5" />
                                    <span>{t('useCamera')}</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex flex-col items-center justify-center">
                    <button onClick={handleIdentify} disabled={isIdentifying || !file} className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark transition-transform transform hover:scale-105">
                        {isIdentifying ? <><Spinner />{t('identifyingButton')}</> : t('identifyButton')}
                    </button>
                    {cameraError && <p className="text-red-600 text-sm font-semibold mt-4">{cameraError}</p>}
                    {identificationError && <p className="text-red-600 text-sm font-semibold mt-4">{identificationError}</p>}
                </div>
            </>
        )}
        
        {plantInfo && (
            <div className="mt-4 animate-fade-in space-y-4">
                 <div className="bg-gray-50 p-4 rounded-lg border relative">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4 gap-4">
                        <div className="flex-1 sm:pr-4">
                            <h3 className="text-3xl font-bold text-primary-dark">{plantInfo.plantName}</h3>
                            <p className="text-gray-500 italic mt-1">{plantInfo.commonNames.join(', ')}</p>
                        </div>
                        <button onClick={handleReset} className="w-full sm:w-auto flex-shrink-0 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors">
                            {t('identifyAnotherPlant')}
                        </button>
                    </div>
                    <div className={`inline-block px-3 py-1 text-sm font-semibold rounded-full mb-4 ${getConfidenceColor(plantInfo.confidenceScore)}`}>
                        {t('confidence')}: {(plantInfo.confidenceScore * 100).toFixed(1)}%
                    </div>
                    <p><span className="font-semibold">{t('description')}: </span>{plantInfo.description}</p>
                </div>
                
                <div className="h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                     {transcript.map((entry, index) => (
                        <div key={index} className={`flex ${entry.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${entry.type === 'user' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'}`}>
                                <p>{entry.text}</p>
                            </div>
                        </div>
                    ))}
                    {transcript.length === 0 && !isConversationActive && (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-400">{t('conversationTranscriptPlaceholder')}</p>
                        </div>
                    )}
                </div>

                <div className="pt-2 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button onClick={isConversationActive ? stopConversation : () => startConversation(plantInfo)} className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white shadow-sm transition-colors ${isConversationActive ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'}`}>
                            {isConversationActive ? <><StopIcon className="w-5 h-5"/>{t('stopConversation')}</> : <><MicrophoneIcon className="w-5 h-5"/>{t('startVoiceConversation')}</>}
                        </button>
                        <p className="text-gray-600 font-medium h-6">
                            {isConversationActive && t(`assistantStatus${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                        </p>
                    </div>
                    {micPermissionError && <p className="text-red-600 text-sm font-semibold">{t('micPermissionError')}</p>}

                    {!isConversationActive && (
                        <form onSubmit={handleSendTextMessage} className="flex items-center gap-2">
                            <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder={t('typeYourQuestionPlaceholder')} className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-full focus:ring-primary focus:border-primary transition" disabled={isSending} />
                            <button type="submit" disabled={isSending || !textInput.trim()} className="p-3 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark disabled:bg-gray-400 transition-colors">
                                {isSending ? <div className="w-5 h-5"><Spinner /></div> : <PaperAirplaneIcon className="w-5 h-5" />}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        )}
    </div>
    );
};

export default AiAssistant;
