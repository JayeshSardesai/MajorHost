import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar'; // Using the main application navbar

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const YieldEstimation = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    Area: '',
    State_Name: 'Karnataka',
    District_Name: 'BELGAUM',
    Season: 'Kharif',
    Crop: 'Rice'
  });
  const [predictionResult, setPredictionResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setPredictionResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/yield-estimation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          Area: parseFloat(formData.Area)
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get prediction.');
      }
      const data = await response.json();
      setPredictionResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF3E0]">
      <Navbar />
      <div className="py-12 flex justify-center items-start">
        <div className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-[#E8DCC0]">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-[#2E7D32] text-center">
            {t('yield.title', 'Yield Estimation')}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="Area" className="block font-semibold text-gray-700">{t('yield.area', 'Area (hectares)')}</label>
              <input
                id="Area"
                type="number"
                step="0.01"
                name="Area"
                value={formData.Area}
                onChange={handleChange}
                placeholder={t('yield.areaPh', 'e.g., 2.5')}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label htmlFor="State_Name" className="block font-semibold text-gray-700">{t('yield.state', 'State')}</label>
              <input
                id="State_Name"
                type="text"
                name="State_Name"
                value={formData.State_Name}
                onChange={handleChange}
                placeholder={t('yield.statePh', 'e.g., Karnataka')}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label htmlFor="District_Name" className="block font-semibold text-gray-700">{t('yield.district', 'District')}</label>
              <input
                id="District_Name"
                type="text"
                name="District_Name"
                value={formData.District_Name}
                onChange={handleChange}
                placeholder={t('yield.districtPh', 'e.g., Belgaum')}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label htmlFor="Season" className="block font-semibold text-gray-700">{t('yield.season', 'Season')}</label>
              <select
                id="Season"
                name="Season"
                value={formData.Season}
                onChange={handleChange}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="Kharif">{t('yield.seasons.Kharif', 'Kharif')}</option>
                <option value="Rabi">{t('yield.seasons.Rabi', 'Rabi')}</option>
                <option value="Whole Year">{t('yield.seasons.Whole Year', 'Whole Year')}</option>
                <option value="Summer">{t('yield.seasons.Summer', 'Summer')}</option>
                <option value="Autumn">{t('yield.seasons.Autumn', 'Autumn')}</option>
                <option value="Winter">{t('yield.seasons.Winter', 'Winter')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="Crop" className="block font-semibold text-gray-700">{t('yield.crop', 'Crop')}</label>
              <input
                id="Crop"
                type="text"
                name="Crop"
                value={formData.Crop}
                onChange={handleChange}
                placeholder={t('yield.cropPh', 'e.g., Rice')}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {isLoading ? t('yield.loading', 'Predicting...') : t('yield.submit', 'Predict Yield')}
            </button>
          </form>

          {predictionResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="font-semibold text-gray-700">{t('yield.predicted', 'Predicted Production:')}</p>
              <p className="text-2xl font-bold text-green-700">
                {Number(predictionResult.predicted_yield).toFixed(4)} Tonnes
              </p>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="font-semibold text-red-700">{t('yield.error', 'Error:')}</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YieldEstimation;

