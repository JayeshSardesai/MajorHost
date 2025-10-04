import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar'; // Using the full, actual Navbar component

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CropPrediction = () => {
  // Using the real translation hook from i18next
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    SOIL_PH: '6.5',
    TEMP: '28',
    RELATIVE_HUMIDITY: '62',
    N: '90',
    P: '42',
    K: '35',
    SOIL: 'Loamy soil',
    SEASON: 'Kharif'
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
      const response = await fetch(`${apiUrl}/api/crop-recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get prediction');
      }

      const data = await response.json();
      setPredictionResult(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to create a translation key from the crop name
  const getCropTranslationKey = (cropName) => {
    return `crops.${cropName.toLowerCase().replace(/ /g, '_')}`;
  };

  return (
    <div className="min-h-screen bg-[#FAF3E0]">
      <Navbar />

      <div className="py-12 flex justify-center items-start px-4">
        <div className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-[#E8DCC0]">
          <div className="text-center mb-4">
            <span className="inline-block bg-yellow-400 text-white text-sm font-semibold px-4 py-1 rounded-full">
              {t('crop.aiBadge', '🤖 AI-Powered')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold mt-2 text-[#2E7D32]">
              {t('crop.title', 'FarmFlow Crop Prediction')}
            </h1>
            <p className="text-gray-500">{t('crop.subtitle', 'Intelligent recommendations based on soil and climate analysis')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="SOIL_PH" className="block font-semibold text-gray-700">{t('crop.soilPh', 'Soil pH')}</label>
                <input id="SOIL_PH" type="number" step="0.1" name="SOIL_PH" value={formData.SOIL_PH} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label htmlFor="TEMP" className="block font-semibold text-gray-700">{t('crop.temp', 'Temperature (°C)')}</label>
                <input id="TEMP" type="number" step="0.1" name="TEMP" value={formData.TEMP} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label htmlFor="RELATIVE_HUMIDITY" className="block font-semibold text-gray-700">{t('crop.rh', 'Humidity (%)')}</label>
                <input id="RELATIVE_HUMIDITY" type="number" step="0.1" name="RELATIVE_HUMIDITY" value={formData.RELATIVE_HUMIDITY} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label htmlFor="N" className="block font-semibold text-gray-700">{t('crop.n', 'Nitrogen (N)')}</label>
                <input id="N" type="number" name="N" value={formData.N} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label htmlFor="P" className="block font-semibold text-gray-700">{t('crop.p', 'Phosphorus (P)')}</label>
                <input id="P" type="number" name="P" value={formData.P} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label htmlFor="K" className="block font-semibold text-gray-700">{t('crop.k', 'Potassium (K)')}</label>
                <input id="K" type="number" name="K" value={formData.K} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="SOIL" className="block font-semibold text-gray-700">{t('crop.soilType', 'Soil Type')}</label>
                <select id="SOIL" name="SOIL" value={formData.SOIL} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                  <option value="Loamy soil">{t('crop.soilOptions.Loamy soil', 'Loamy soil')}</option>
                  <option value="Alluvial soil">{t('crop.soilOptions.Alluvial soil', 'Alluvial soil')}</option>
                  <option value="Laterite soil">{t('crop.soilOptions.Laterite soil', 'Laterite soil')}</option>
                  <option value="Sandy soil">{t('crop.soilOptions.Sandy soil', 'Sandy soil')}</option>
                  <option value="Sandy Loamy soil">{t('crop.soilOptions.Sandy Loamy soil', 'Sandy Loamy soil')}</option>
                  <option value="Light Loamy soil">{t('crop.soilOptions.Light Loamy soil', 'Light Loamy soil')}</option>
                  <option value="Well-drained soil">{t('crop.soilOptions.Well-drained soil', 'Well-drained soil')}</option>
                  <option value="Well-drained loamy soil">{t('crop.soilOptions.Well-drained loamy soil', 'Well-drained loamy soil')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="SEASON" className="block font-semibold text-gray-700">{t('crop.season', 'Season')}</label>
                <select id="SEASON" name="SEASON" value={formData.SEASON} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                  <option value="Kharif">{t('crop.seasons.Kharif', 'Kharif')}</option>
                  <option value="Rabi">{t('crop.seasons.Rabi', 'Rabi')}</option>
                  <option value="Zaid">{t('crop.seasons.Zaid', 'Zaid')}</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full mt-6 py-3 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400">
              {isLoading ? t('crop.loading', 'Predicting...') : t('crop.predict', '🚀 Get AI Prediction')}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="font-semibold text-red-700">{t('crop.error', 'Error:')}</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}
          {predictionResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-bold text-center text-green-800">
                {t('crop.recommended', '✅ AI Recommended Crop:')}
                <span className="text-green-600"> {t(getCropTranslationKey(predictionResult.prediction), predictionResult.prediction)}</span>
              </h3>
              <h4 className="font-semibold mt-4 text-gray-700 text-center">{t('crop.top5', 'Top 5 AI Predictions:')}</h4>
              <ul className="list-group mt-2">
                {Object.entries(predictionResult.top_5_crops).map(([crop, probability]) => (
                  <li key={crop} className="list-group-item d-flex justify-content-between align-items-center bg-transparent border-gray-200 px-2 py-1">
                    {/* FIX: Use the t() function to translate the crop name, with the original as a fallback */}
                    {t(getCropTranslationKey(crop), crop)}
                    <span className="badge bg-green-500 text-white rounded-pill">{(probability * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 p-3 bg-gray-100 rounded">
                <small className="text-gray-500">{t('crop.confidence', 'AI Confidence: These predictions are based on machine learning analysis of thousands of farming datasets.')}</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CropPrediction;

