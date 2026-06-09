import React, { useState, useMemo, useContext, useEffect, useCallback } from 'react';
import { I18nContext } from '../contexts/I18nContext';
import { getPlants } from '../services/dbService';
import { KnowledgeBasePlant } from '../types';
import PlantCard from './PlantCard';
import PlantDetailModal from './PlantDetailModal';
import { SearchIcon } from './icons/SearchIcon';

const KnowledgeBase: React.FC = () => {
  const { language, t } = useContext(I18nContext);
  const [allPlants, setAllPlants] = useState<KnowledgeBasePlant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<KnowledgeBasePlant | null>(null);

  const fetchPlants = useCallback(() => {
    const plantsFromDb = getPlants();
    setAllPlants(plantsFromDb);
  }, []);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);


  const filteredPlants = useMemo(() => {
    if (!searchTerm) {
      return allPlants;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return allPlants.filter(plant =>
      plant.plantName[language].toLowerCase().includes(lowercasedFilter) ||
      plant.scientificName.toLowerCase().includes(lowercasedFilter) ||
      plant.commonNames[language].some(name => name.toLowerCase().includes(lowercasedFilter))
    );
  }, [searchTerm, language, allPlants]);

  const handlePlantUpdate = () => {
    fetchPlants(); // Refetch all plants to get the latest data
    // If a plant is selected, we also need to update its state to reflect the changes
    if (selectedPlant) {
        const updatedSelectedPlant = getPlants().find(p => p.id === selectedPlant.id);
        if (updatedSelectedPlant) {
            setSelectedPlant(updatedSelectedPlant);
        }
    }
  };

  return (
    <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('knowledgeBaseTitle')}</h2>
        <p className="text-gray-600 mb-6">{t('knowledgeBaseDescription')}</p>

        <div className="relative mb-6">
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('searchPlantsPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-primary focus:border-primary"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredPlants.map(plant => (
          <PlantCard
            key={plant.id}
            plant={plant}
            language={language}
            onClick={() => setSelectedPlant(plant)}
          />
        ))}
      </div>
      
       {filteredPlants.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <h3 className="text-xl font-semibold">{t('noResultsFound')}</h3>
          <p>{t('noResultsSuggestion')}</p>
        </div>
      )}

      {selectedPlant && (
        <PlantDetailModal
          plant={selectedPlant}
          language={language}
          onClose={() => setSelectedPlant(null)}
          onUpdate={handlePlantUpdate}
        />
      )}
    </div>
  );
};

export default KnowledgeBase;