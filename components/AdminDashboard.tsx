import React, { useState, useContext, useEffect, useCallback } from 'react';
import { I18nContext } from '../contexts/I18nContext';
import { CommunityContribution } from '../types';
import { getPendingContributions, approveContribution, rejectContribution } from '../services/dbService';

// Mock data for pending contributions on first load
export const mockContributions: CommunityContribution[] = [
  {
    id: 'contrib-admin-1',
    plantName: 'Brahmi',
    author: 'Ramesh Patel',
    location: 'Gujarat, India',
    partUsed: 'Leaves',
    medicinalUse: 'Made a paste and applied to son\'s knee to reduce swelling. Worked very well.',
    preparation: 'Crushed fresh leaves with a little water.',
    status: 'pending',
    likes: 0,
    comments: [],
  },
  {
    id: 'contrib-admin-2',
    plantName: 'Ashwagandha',
    author: 'Priya Singh',
    location: 'Uttar Pradesh, India',
    partUsed: 'Root',
    medicinalUse: 'I drink the powder with warm milk before bed for better sleep. It helps with stress.',
    preparation: '1 teaspoon of root powder in a glass of warm milk.',
    status: 'pending',
    likes: 0,
    comments: [],
  },
];


const AdminDashboard: React.FC = () => {
  const { t } = useContext(I18nContext);
  const [contributions, setContributions] = useState<CommunityContribution[]>([]);

  const fetchContributions = useCallback(() => {
    setContributions(getPendingContributions());
  }, []);

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);


  const handleApprove = (id: string) => {
    approveContribution(id);
    fetchContributions(); // Refresh the list
  };

  const handleReject = (id: string) => {
    rejectContribution(id);
    fetchContributions(); // Refresh the list
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800">{t('adminDashboardTitle')}</h2>
      <p className="text-sm text-gray-500 mt-2 mb-6">{t('pendingContributionsTitle')}</p>

      <div className="space-y-4">
        {contributions.length > 0 ? (
          contributions.map((item) => (
            <div key={item.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2">
                <h3 className="text-lg font-semibold text-primary-dark">{item.plantName}</h3>
                <p className="text-sm text-gray-500">
                  By {item.author || 'Anonymous'} from {item.location || 'Unknown'}
                </p>
              </div>
              <p className="text-gray-700"><span className="font-semibold">{t('contributionFormUse')}:</span> {item.medicinalUse}</p>
              {item.preparation && <p className="text-gray-700 mt-1"><span className="font-semibold">{t('preparation')}:</span> {item.preparation}</p>}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => handleApprove(item.id)}
                  className="px-4 py-1 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  {t('approveButton')}
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  className="px-4 py-1 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  {t('rejectButton')}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <h3 className="text-xl font-semibold">{t('noPendingContributions')}</h3>
            <p>{t('noPendingContributionsMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;