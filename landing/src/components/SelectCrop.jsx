import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import T from './T';
import Navbar from './Navbar';
import { useTranslation } from 'react-i18next';
import { getCropLabelFromName } from '../constants/crops';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Helpers to localize location display names using translation keys when available
  const toKey = (s = '') => {
    try {
      return s.toString().trim().replace(/\s+/g, '_');
    } catch {
      return s;
    }
  };
  const localizeState = (name) => t(`locations.state.${name}`, name);
  const localizeDistrict = (name) => t(`locations.district.${name}`, t(`locations.district.${toKey(name)}`, name));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/'); return; }

    const loadData = async () => {
      try {
        // Load user profile
        const resp = await fetch(`${apiUrl}/api/profile`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (resp.ok) {
          const data = await resp.json();
          setCrop(data.profile?.crop ?? '');
          setAreaHectare(data.profile?.areaHectare ?? '');
        }

        // Load user's existing crops to check limits
        try {
          const cropsResp = await fetch(`${apiUrl}/api/user-crops`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          });
          if (cropsResp.ok) {
            const cropsData = await cropsResp.json();
            setUserCrops(cropsData.crops || []);
            setCropLimits({ current: cropsData.crops?.length || 0, max: 5 });
            console.log('📊 User crops loaded:', cropsData.crops?.length || 0, 'out of 5');
          }
        } catch (cropsError) {
          console.warn('Failed to load user crops:', cropsError);
        }

        // Load location data from weather API
        try {
          const locationResp = await fetch(`${apiUrl}/api/location`);
          const locationData = await locationResp.json();
          if (locationData?.success && locationData.address) {
            const locationInfo = {
              state: locationData.address.state || '',
              district: locationData.address.district || ''
            };
            setLocationData(locationInfo);
            console.log('📍 Location data loaded for crop selection:', locationInfo);
          } else {
            console.warn('⚠️ No location data available from API');
          }
        } catch (locError) {
          console.warn('Failed to load location data:', locError);
        }

        // Load available crops from cached predictions
        const cachedPredictions = localStorage.getItem('cropPredictions');
        if (cachedPredictions) {
          try {
            const data = JSON.parse(cachedPredictions);
            if (data.predictions && Array.isArray(data.predictions)) {
              // Extract crop names from predictions and sort by probability
              const crops = data.predictions
                .sort((a, b) => b.probability - a.probability)
                .map(p => p.crop)
                .filter(Boolean);
              setAvailableCrops(crops);
            }
          } catch (parseError) {
            console.error('Failed to parse cached predictions:', parseError);
            // Fallback to default crops if parsing fails
            setAvailableCrops(['cowpea', 'tomato', 'onion', 'cabbage', 'bhendi', 'brinjal', 'bottle gourd', 'bitter gourd', 'cucumber', 'cluster bean', 'peas', 'french bean', 'carrot', 'radish', 'cauliflower', 'small onion', 'sweet potato']);
          }
        } else {
          // No cached predictions, use default crops
          setAvailableCrops(['cowpea', 'tomato', 'onion', 'cabbage', 'bhendi', 'brinjal', 'bottle gourd', 'bitter gourd', 'cucumber', 'cluster bean', 'peas', 'french bean', 'carrot', 'radish', 'cauliflower', 'small onion', 'sweet potato']);
        }
      } catch (e) {
        console.error('Failed to load data:', e);
        // Fallback to default crops on error
        setAvailableCrops(['cowpea', 'tomato', 'onion', 'cabbage', 'bhendi', 'brinjal', 'bottle gourd', 'bitter gourd', 'cucumber', 'cluster bean', 'peas', 'french bean', 'carrot', 'radish', 'cauliflower', 'small onion', 'sweet potato']);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleSave = async () => {
    if (!crop || !areaHectare) {
      alert('Please fill in all fields');
      return;
    }

    // Validate area limit: maximum 2 hectares
    const areaValue = parseFloat(areaHectare);
    if (areaValue > 2) {
      alert('⚠️ Area Limit Exceeded\n\nMaximum allowed area is 2 hectares per crop selection.\nPlease enter an area of 2 hectares or less.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Get location data first using Google API
      const locationResponse = await fetch(`${apiUrl}/api/location`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let locationData = {};
      if (locationResponse.ok) {
        const locData = await locationResponse.json();
        if (locData.success && locData.coordinates) {
          locationData = {
            coordinates: locData.coordinates,
            address: locData.address,
            district: locData.address?.district || '',
            state: locData.address?.state || ''
          };
          console.log('📍 Google API location data for crop selection:', locationData);
        }
      }

      const response = await fetch(`${apiUrl}/api/production-estimation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          crop: crop,
          area: parseFloat(areaHectare),
          areaHectare: parseFloat(areaHectare), // Backend expects this field
          location: locationData, // Send Google API location data
          district: locationData.district,
          state: locationData.state
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Crop saved successfully with location:', data);

        // Set a flag to indicate fresh crop was added
        localStorage.setItem('freshCropAdded', 'true');
        localStorage.setItem('lastCropAdded', JSON.stringify({
          crop: crop,
          area: areaHectare,
          timestamp: new Date().toISOString()
        }));

        // Navigate back to dashboard without clearing cache
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to save crop:', errorData);

        // Handle specific error types
        if (errorData.error === 'Area limit exceeded') {
          alert(`⚠️ ${errorData.error}\n\n${errorData.details}\n\nYou entered: ${errorData.providedArea} hectares\nMaximum allowed: ${errorData.maxArea} hectares`);
        } else if (errorData.error === 'Crop limit exceeded') {
          alert(`⚠️ ${errorData.error}\n\n${errorData.details}\n\nCurrent crops: ${errorData.currentCrops}\nMaximum allowed: ${errorData.maxCrops}`);
        } else if (errorData.error === 'Crop already selected') {
          alert(`⚠️ ${errorData.error}\n\n${errorData.details}`);
        } else {
          setError(errorData.message || errorData.details || 'Failed to save crop selection');
        }
      }
    } catch (error) {
      console.error('Error saving crop:', error);
      alert('An error occurred while saving the crop');
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-beige-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farm-green-500 mx-auto mb-4"></div>
          <p className="text-muted-600 font-poppins"><T k="common.loadingCrops">Loading crops...</T></p>
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
          {error && <div className="mb-4 text-red-600">{error}</div>}

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

          {availableCrops.length > 0 && (
            <div className="mb-4 p-3 bg-farm-green-50 border border-farm-green-200 rounded-md">
              <p className="text-sm text-farm-green-700 font-poppins">
                <i className="inline-block w-4 h-4 mr-1">ℹ️</i>
                <T k="selectCrop.recommendedInfo">Showing crops recommended for your soil and weather conditions</T>
                {locationData.district && locationData.state && (
                  <span className="ml-2 text-xs text-farm-green-700">
                    <T k="common.location">Location</T>: {localizeDistrict(locationData.district)}, {localizeState(locationData.state)}
                  </span>
                )}
              </p>
            </div>
          )}

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
              {availableCrops.length === 0 && (
                <p className="text-xs text-muted-500 mt-1 font-poppins">
                  <T k="selectCrop.completeProfile">Complete your profile with soil data to get personalized crop recommendations.</T>
                </p>
              )}
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
