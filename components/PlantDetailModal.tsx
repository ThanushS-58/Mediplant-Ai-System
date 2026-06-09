import React, { useContext, useState, useEffect } from 'react';
import { I18nContext } from '../contexts/I18nContext';
import { KnowledgeBasePlant, Language, Comment, CommunityContribution } from '../types';
import { XIcon } from './icons/XIcon';
import { HeartIcon } from './icons/HeartIcon';
import { useAuth } from '../contexts/AuthContext';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { updatePlant } from '../services/dbService';

interface PlantDetailModalProps {
  plant: KnowledgeBasePlant;
  language: Language;
  onClose: () => void;
  onUpdate: () => void;
}

const PlantDetailModal: React.FC<PlantDetailModalProps> = ({ plant, language, onClose, onUpdate }) => {
    const { t } = useContext(I18nContext);
    const { user } = useAuth();
    const [currentPlant, setCurrentPlant] = useState<KnowledgeBasePlant>(plant);

    // Local UI state for likes to provide immediate feedback
    const [isPlantLiked, setIsPlantLiked] = useState(false);
    const [likedContributions, setLikedContributions] = useState<Set<string>>(new Set());
    
    const [newPlantComment, setNewPlantComment] = useState('');
    const [expandedContributionId, setExpandedContributionId] = useState<string | null>(null);
    const [newContributionComment, setNewContributionComment] = useState('');

    useEffect(() => {
        setCurrentPlant(plant);
        // Reset interaction states when a new plant is selected
        setIsPlantLiked(false);
        setLikedContributions(new Set());
    }, [plant]);

    const handleUpdate = (updatedPlant: KnowledgeBasePlant) => {
        updatePlant(updatedPlant);
        setCurrentPlant(updatedPlant);
        onUpdate();
    };

    const handlePlantLike = () => {
        if (!user) return;
        const newLikedState = !isPlantLiked;
        const newLikesCount = newLikedState ? currentPlant.likes + 1 : currentPlant.likes - 1;
        setIsPlantLiked(newLikedState);
        const updatedPlant = { ...currentPlant, likes: newLikesCount };
        handleUpdate(updatedPlant);
    };

    const handlePlantCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPlantComment.trim() && user) {
            const commentToAdd: Comment = {
                author: user.email,
                text: newPlantComment.trim(),
                date: new Date().toISOString().split('T')[0],
            };
            const updatedPlant = { 
                ...currentPlant, 
                comments: [...currentPlant.comments, commentToAdd] 
            };
            handleUpdate(updatedPlant);
            setNewPlantComment('');
        }
    };
    
    const handleContributionLike = (contributionId: string) => {
        if (!user) return;
        const isLiked = likedContributions.has(contributionId);
        const newLikedSet = new Set(likedContributions);
        isLiked ? newLikedSet.delete(contributionId) : newLikedSet.add(contributionId);
        setLikedContributions(newLikedSet);
        
        const updatedContributions = currentPlant.communityContributions.map(c => 
            c.id === contributionId ? { ...c, likes: isLiked ? c.likes - 1 : c.likes + 1 } : c
        );
        const updatedPlant = { ...currentPlant, communityContributions: updatedContributions };
        handleUpdate(updatedPlant);
    };

    const handleContributionCommentSubmit = (e: React.FormEvent, contributionId: string) => {
        e.preventDefault();
        if (newContributionComment.trim() && user) {
             const commentToAdd: Comment = {
                author: user.email,
                text: newContributionComment.trim(),
                date: new Date().toISOString().split('T')[0],
            };
            const updatedContributions = currentPlant.communityContributions.map(c => 
                c.id === contributionId ? { ...c, comments: [...c.comments, commentToAdd] } : c
            );
            const updatedPlant = { ...currentPlant, communityContributions: updatedContributions };
            handleUpdate(updatedPlant);
            setNewContributionComment('');
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plant-detail-title"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <div>
                        <h2 id="plant-detail-title" className="text-2xl font-bold text-primary-dark">{currentPlant.plantName[language]}</h2>
                        <p className="text-gray-500 italic">{currentPlant.scientificName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label={t('closeButton')}>
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <img src={currentPlant.image.replace('{PLANT_NAME}', encodeURIComponent(currentPlant.scientificName))} alt={currentPlant.plantName[language]} className="w-full h-64 object-cover rounded-md mb-4" />
                    
                    <div className="space-y-4 text-gray-700">
                        {/* Plant Info */}
                        <p><span className="font-semibold">{t('description')}: </span>{currentPlant.description[language]}</p>
                        <div>
                            <h4 className="font-semibold text-lg mb-2">{t('medicinalUses')}</h4>
                            <ul className="list-disc list-inside space-y-2 pl-2">
                                {currentPlant.medicinalUses.map((use, index) => (
                                <li key={index}>
                                    <span className="font-semibold">{use.partUsed[language]}: </span>{use.uses[language].join(', ')}
                                </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg mb-2">{t('preparation')}</h4>
                            <p>{currentPlant.preparationMethods[language].join(', ')}</p>
                        </div>
                        {currentPlant.culturalSignificance[language] && (
                            <div>
                                <h4 className="font-semibold text-lg mb-2">{t('culturalSignificance')}</h4>
                                <p>{currentPlant.culturalSignificance[language]}</p>
                            </div>
                        )}
                        <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50">
                            <h4 className="font-semibold text-lg mb-2 text-yellow-800">{t('warnings')}</h4>
                            <p>{currentPlant.warnings[language]}</p>
                        </div>

                        {/* Community Contributions Section */}
                        {currentPlant.communityContributions.length > 0 && (
                            <div className="pt-4">
                                <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">{t('communityContributionsTitle')}</h3>
                                <div className="space-y-4">
                                    {currentPlant.communityContributions.map((contrib) => (
                                        <div key={contrib.id} className="bg-green-50 p-4 rounded-lg border border-green-200">
                                            <p className="text-gray-800">"<span className="font-semibold">{contrib.partUsed}:</span> {contrib.medicinalUse}"</p>
                                            <p className="text-sm text-gray-600 mt-2">- {contrib.author || t('anonymous')} from {contrib.location || 'Unknown'}</p>
                                            {/* Contribution Actions */}
                                            <div className="flex items-center flex-wrap gap-4 mt-3 pt-3 border-t border-green-200">
                                                <button
                                                    onClick={() => handleContributionLike(contrib.id)}
                                                    disabled={!user}
                                                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${!user ? 'cursor-not-allowed text-gray-400' : likedContributions.has(contrib.id) ? 'text-red-600' : 'text-gray-500 hover:text-red-500'}`}
                                                >
                                                    <HeartIcon className="w-5 h-5"/> <span>{contrib.likes}</span>
                                                </button>
                                                <button
                                                    onClick={() => setExpandedContributionId(prev => prev === contrib.id ? null : contrib.id)}
                                                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors text-gray-500 hover:text-primary`}
                                                >
                                                    <ChatBubbleIcon className="w-5 h-5"/> <span>{contrib.comments.length} {t('commentsCount')}</span>
                                                </button>
                                            </div>
                                            {/* Expanded Comments for Contribution */}
                                            {expandedContributionId === contrib.id && (
                                                <div className="mt-3 pt-3 border-t border-green-200">
                                                    {contrib.comments.map((comment, idx) => (
                                                        <div key={idx} className="bg-white p-2 rounded-md mb-2 text-sm">
                                                            <p className="font-semibold text-primary-dark">{comment.author}</p>
                                                            <p className="text-gray-700">{comment.text}</p>
                                                        </div>
                                                    ))}
                                                    { user ? (
                                                        <form onSubmit={(e) => handleContributionCommentSubmit(e, contrib.id)} className="flex gap-2 mt-2">
                                                            <input type="text" value={newContributionComment} onChange={(e) => setNewContributionComment(e.target.value)} placeholder={t('addCommentPlaceholder')} required className="flex-grow block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"/>
                                                            <button type="submit" className="px-3 py-1 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark">{t('submitCommentButton')}</button>
                                                        </form>
                                                    ) : <p className="text-xs text-gray-500 mt-2">{t('loginToInteractPrompt')}</p> }
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                         {/* Overall Plant Reactions and Comments Section */}
                        <div className="pt-6">
                            <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">{t('reactionsAndCommentsTitle')}</h3>
                            <div className="flex items-center flex-wrap gap-4 mb-6">
                                <button
                                    onClick={handlePlantLike}
                                    disabled={!user}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                                        isPlantLiked && user ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    } ${!user ? 'cursor-not-allowed' : ''}`}
                                >
                                    <HeartIcon className={`w-5 h-5 ${isPlantLiked && user ? 'text-white' : 'text-red-500'}`} />
                                    <span>{t('likeButton')}</span>
                                </button>
                                <p className="text-gray-600 font-semibold">{currentPlant.likes} likes</p>
                            </div>
                            <h4 className="font-semibold text-lg mb-2">{t('commentsTitle')}</h4>
                            <div className="space-y-4 mb-6">
                                {currentPlant.comments.length > 0 ? currentPlant.comments.map((comment, index) => (
                                    <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                                        <div className="flex items-center justify-between text-sm">
                                            <p className="font-semibold text-primary-dark">{comment.author}</p>
                                            <p className="text-gray-500">{comment.date}</p>
                                        </div>
                                        <p className="text-gray-800 mt-1">{comment.text}</p>
                                    </div>
                                )) : <p className="text-gray-500 text-sm">{t('noCommentsYet')}</p>}
                            </div>
                             {user ? (
                                <form onSubmit={handlePlantCommentSubmit} className="space-y-3">
                                    <textarea value={newPlantComment} onChange={(e) => setNewPlantComment(e.target.value)} rows={3} placeholder={t('addCommentPlaceholder')} required className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"/>
                                    <div className="text-right">
                                        <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark">{t('submitCommentButton')}</button>
                                    </div>
                                </form>
                             ) : (
                                <div className="text-center p-4 bg-gray-100 rounded-lg text-gray-600">
                                    {t('loginToInteractPrompt')}
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlantDetailModal;