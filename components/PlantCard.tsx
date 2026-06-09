import React from 'react';
import { KnowledgeBasePlant, Language } from '../types';

interface PlantCardProps {
  plant: KnowledgeBasePlant;
  language: Language;
  onClick: () => void;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, language, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-300"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && onClick()}
    >
      <img
        src={plant.image.replace('{PLANT_NAME}', encodeURIComponent(plant.scientificName))}
        alt={plant.plantName[language]}
        className="w-full h-40 object-cover"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-primary transition-colors">
          {plant.plantName[language]}
        </h3>
        <p className="text-sm text-gray-500 italic">{plant.scientificName}</p>
      </div>
    </div>
  );
};

export default PlantCard;
