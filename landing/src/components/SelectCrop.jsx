import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import T from './T';
import Navbar from './Navbar';
import { useTranslation } from 'react-i18next';
import { getCropLabelFromName } from '../constants/crops';
// #### CHANGE 1: Import our reliable location service ####
import locationService from '../services/locationService';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const SelectCrop = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [crop, setCrop] = useState('');
  const [areaHectare, setAreaHectare] = useState('');
  const [error, setError] = useState('');
  const [availableCrops, setAvailableCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState({ state: '', district: '' });
  const [userCrops, setUserCrops] = useState([]);
  const [cropLimits, setCropLimits] = useState({ current: 0, max: 5 });

  // Helpers for localization
  const toKey = (s = '') => s.toString().trim().replace(/\s+/g, '_');
  const localizeState = (name) => t(`locations.state.${name}`, name);
  const localizeDistrict = (name) => t(`locations.district.${name}`, t(`locations.district.${toKey(name)}`, name));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/'); return; }

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        // #### CHANGE 2: Use the location service to get accurate location ####
        // This replaces the old, incorrect fetch('/api/location')
        try {
          const locData = await locationService.getCurrentLocation();
          if (locData?.success && locData.address) {
            const locationInfo = {
              state: locData.address.state || '',
              district: locData.address.district || ''
            };
            setLocationData(locationInfo);
            console.log('📍 Accurate location loaded for crop selection:', locationInfo);
          } else {
            throw new Error("Could not retrieve location details.");
          }
        } catch (locError) {
          console.error('Failed to load location data:', locError);
          setError('Failed to get location. Please ensure location services are enabled and try again.');
        }

        // Load user's existing crops to check limits
        const cropsResp = await fetch(`${apiUrl}/api/user-crops`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (cropsResp.ok) {
          const cropsData = await cropsResp.json();
          setCropLimits({ current: cropsData.crops?.length || 0, max: 5 });
        }

        // Load available crops from cached predictions
        const cachedPredictions = localStorage.getItem('cropPredictions');
        if (cachedPredictions) {
          const data = JSON.parse(cachedPredictions);
          if (data.predictions && Array.isArray(data.predictions)) {
            setAvailableCrops(data.predictions.map(p => p.crop).filter(Boolean));
          }
        } else {
          // Fallback to a default list if no predictions are cached
          setAvailableCrops(['cowpea', 'tomato', 'onion', 'cabbage', 'bhendi', 'brinjal', 'bottle gourd', 'bitter gourd', 'cucumber', 'cluster bean', 'peas', 'french bean', 'carrot', 'radish', 'cauliflower', 'small onion', 'sweet potato']);
        }
      } catch (e) {
        console.error('Failed to load initial data:', e);
        setError(e.message || "Could not load page data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleSave = async () => {
    setError('');
    if (!crop || !areaHectare) {
      alert('Please fill in all fields');
      return;
    }

    if (parseFloat(areaHectare) > 2) {
      alert('⚠️ Area Limit Exceeded: Maximum allowed area is 2 hectares.');
      return;
    }

    // #### CHANGE 3: Validate we have the location before trying to save ####
    if (!locationData.state || !locationData.district) {
      alert("Your location could not be determined. Please enable location services and refresh the page.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // No need to fetch location again here, we already have it.

      const response = await fetch(`${apiUrl}/api/production-estimation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          crop: crop,
          areaHectare: parseFloat(areaHectare),
          // Send the correct location data from our state
          district: locationData.district,
          state: locationData.state
        })
      });

      if (response.ok) {
        console.log('✅ Crop saved successfully with correct location.');
        localStorage.setItem('freshCropAdded', 'true');
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to save crop:', errorData);
        setError(errorData.message || errorData.details || 'Failed to save crop selection.');
      }
    } catch (error) {
      console.error('Error saving crop:', error);
      setError('An error occurred while saving the crop.');
    }
  };

  // ... (The rest of the component's JSX return statement remains the same)

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-beige-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farm-green-500 mx-auto mb-4"></div>
          <p className="text-muted-600 font-poppins"><T k="common.loadingCrops">Loading...</T></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-beige-950">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10">
        <div className="farm-card p-6 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground font-poppins"><T k="selectCrop.title">Select Crop</T></h1>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

          {/* Crop and Area Limits Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-700 font-poppins">
                <i className="inline-block w-4 h-4 mr-1">📊</i>
                <T k="selectCrop.limits">Crop Selection Limits</T>
              </p>
              <span className="text-xs text-blue-600 font-semibold">
                {cropLimits.current}/{cropLimits.max} <T k="selectCrop.cropsSelected">crops selected</T>
              </span>
            </div>
            <div className="mt-2 text-xs text-blue-600 space-y-1">
              <div>• <T k="selectCrop.maxCrops">Maximum 5 crops per user</T></div>
              <div>• <T k="selectCrop.maxArea">Maximum 2 hectares per crop</T></div>
              <div>• <T k="selectCrop.once">Each crop can only be selected once</T></div>
            </div>
            {cropLimits.current >= cropLimits.max && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                ⚠️ <T k="selectCrop.limitReached">You have reached the maximum crop limit. Remove existing crops to add new ones.</T>
              </div>
            )}
          </div>

          {/* Location Info Box */}
          <div className="mb-4 p-3 bg-farm-green-50 border border-farm-green-200 rounded-md">
            <p className="text-sm text-farm-green-700 font-poppins">
              <i className="inline-block w-4 h-4 mr-1">📍</i>
              <T k="common.location">Location</T>:
              {locationData.district ?
                ` ${localizeDistrict(locationData.district)}, ${localizeState(locationData.state)}` :
                " Determining..."
              }
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1 font-poppins"><T k="selectCrop.cropToGrow">Crop to Grow</T></label>
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full px-3 py-2 border border-soft-beige-300 rounded-md focus:ring-2 focus:ring-farm-green-500 focus:border-transparent"
                required
              >
                <option value=""><T k="selectCrop.selectCrop">Select Crop</T></option>
                {availableCrops.map(c => (
                  <option key={c} value={c}>{getCropLabelFromName(c, t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1 font-poppins"><T k="selectCrop.areaHectares">Area (Hectares)</T></label>
              <input
                type="number"
                value={areaHectare}
                onChange={(e) => setAreaHectare(e.target.value)}
                className="w-full px-3 py-2 border border-soft-beige-300 rounded-md"
                placeholder={t('selectCrop.areaPlaceholder', 'e.g., 2')}
                min="0.1"
                max="2"
                step="0.1"
                required
              />
              <p className="text-xs text-muted-500 mt-1 font-poppins">
                <T k="selectCrop.maxAreaNote">Maximum allowed: 2 hectares per crop selection</T>
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => navigate('/dashboard')} className="px-4 py-2 border rounded-md"><T k="common.cancel">Cancel</T></button>
              <button type="submit" className="farm-button-primary px-4 py-2"><T k="common.save">Save</T></button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SelectCrop;