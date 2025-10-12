import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Leaf, Sun, Sprout, Target, MapPin, Lightbulb, BarChart2, Plus, RefreshCw, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import T from './T';
import LanguageSwitcher from './LanguageSwitcher';
import WeatherApp from './WeatherApp';
import OptimizedMap from './OptimizedMap';
import locationService from '../services/locationService';
import { getCropLabelFromName, SUPPORTED_CROPS } from '../constants/crops';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPredictionForm, setShowPredictionForm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [user, setUser] = useState({
    name: 'User',
    email: '',
  });
  const [profile, setProfile] = useState({
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    areaHectare: '',
    ph: '',
    crop: ''
  });

  const [predictionForm, setPredictionForm] = useState({
    cropType: '',
    soilType: '',
    temperature: '',
    humidity: '',
    rainfall: '',
    ph: '',
    nitrogen: '',
    phosphorus: '',
    potassium: ''
  });

  const [weatherData, setWeatherData] = useState({
    district: 'Loading...',
    state: 'Loading...',
    coordinates: null, // Add this line
    current: { temp: '--', humidity: '--', condition: 'Loading...' },
    forecast: [
      { day: 'Today', temp: '--', humidity: '--', condition: 'Loading...' },
      { day: 'Tomorrow', temp: '--', humidity: '--', condition: 'Loading...' },
      { day: 'Wed', temp: '--', humidity: '--', condition: 'Loading...' },
      { day: 'Thu', temp: '--', humidity: '--', condition: 'Loading...' },
      { day: 'Fri', temp: '--', humidity: '--', condition: 'Loading...' }
    ]
  });
  const [weatherLoaded, setWeatherLoaded] = useState(false);

  const [predictions, setPredictions] = useState([]);
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState('');

  const [userCrops, setUserCrops] = useState([]);
  const [userCropsLoading, setUserCropsLoading] = useState(true);

  // Removed old map state - now using OptimizedMap component

  // Load cached location and weather data
  const loadCachedLocationData = () => {
    try {
      const cachedLocation = localStorage.getItem('locationData');
      const cachedWeather = localStorage.getItem('weatherData');

      if (cachedLocation) {
        const locationData = JSON.parse(cachedLocation);
        const cacheAge = new Date() - new Date(locationData.timestamp);
        const maxAge = 60 * 60 * 1000; // 1 hour

        if (cacheAge < maxAge) {
          setWeatherData(prev => ({
            ...prev,
            district: locationData.address?.district || prev.district,
            state: locationData.address?.state || prev.state,
          }));
          // Location data loaded - OptimizedMap will handle coordinates
          setWeatherLoaded(true);
          console.log('✅ Loaded cached location data');
          return true;
        }
      }

      if (cachedWeather) {
        const weatherData = JSON.parse(cachedWeather);
        const cacheAge = new Date() - new Date(weatherData.timestamp);
        const maxAge = 30 * 60 * 1000; // 30 minutes

        if (cacheAge < maxAge) {
          setWeatherData(prev => ({ ...prev, ...weatherData.data }));
          setWeatherLoaded(true);
          console.log('✅ Loaded cached weather data');
        }
      }
    } catch (err) {
      console.warn('Failed to load cached location/weather data:', err);
    }
    return false;
  };

  // Authentication middleware
  useEffect(() => {
    checkAuthentication();

    const fetchLocationAndWeather = async () => {
      try {
        // First, try to load any valid cached location from localStorage
        const cachedLocation = localStorage.getItem('locationData');
        if (cachedLocation) {
          const locationData = JSON.parse(cachedLocation);
          const cacheAge = new Date() - new Date(locationData.timestamp);
          const maxAge = 60 * 60 * 1000; // 1 hour

          if (cacheAge < maxAge) {
            console.log('✅ Using valid cached location data for map.');
            // THIS IS THE CRITICAL STATE UPDATE
            setWeatherData(prev => ({
              ...prev,
              district: locationData.address?.district || prev.district,
              state: locationData.address?.state || prev.state,
              coordinates: locationData.coordinates // Set coordinates from cache
            }));
            setWeatherLoaded(true);
            return; // Exit if we have a valid cache
          }
        }

        // If no valid cache, fetch fresh location data
        console.log('🌐 No valid cache, fetching fresh location...');
        const locationData = await locationService.getCurrentLocationWithTimeout(15000);

        if (locationData && locationData.coordinates) {
          const { coordinates, address } = locationData;
          console.log(`🗺️ Dashboard location fetched: ${address?.district}, ${address?.state}`);

          // Store the fresh data in localStorage
          localStorage.setItem('locationData', JSON.stringify({
            ...locationData,
            timestamp: new Date().toISOString()
          }));

          // THIS IS THE SECOND CRITICAL STATE UPDATE
          setWeatherData(prev => ({
            ...prev,
            district: address?.district || prev.district,
            state: address?.state || prev.state,
            coordinates: coordinates // Set coordinates from fresh fetch
          }));
          setWeatherLoaded(true);
        }
      } catch (e) {
        console.error('Enhanced location service failed in Dashboard:', e);
        // You could implement a fallback here if needed
      }
    };

    fetchLocationAndWeather();

  }, []);
  const handleLocationFallback = async () => {
    try {
      console.log('🔄 Using enhanced location service fallback...');
      const locationData = await locationService.refreshLocation();

      if (locationData && locationData.lat && locationData.lng) {
        console.log('✅ Enhanced location service fallback successful:', locationData.coordinates);
      } else {
        setShowManualLocation(true);
      }
    } catch (error) {
      console.error('Enhanced location service fallback failed:', error);
      setShowManualLocation(true);
    }
  };

  // Listen for navigation back to dashboard to refresh user crops
  useEffect(() => {
    const handleFocus = () => {
      // Always refresh user crops when returning to dashboard
      if (isAuthenticated) {
        console.log('🔄 Returning to dashboard, refreshing user crops...');
        fetchUserCrops();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        console.log('🔄 Dashboard visible again, refreshing user crops...');
        fetchUserCrops();
      }
    };

    // Check if fresh crop was added and refresh accordingly
    const checkFreshCrop = () => {
      const freshCropAdded = localStorage.getItem('freshCropAdded');
      if (freshCropAdded === 'true' && isAuthenticated) {
        console.log('🌾 Fresh crop detected, refreshing user crops...');
        localStorage.removeItem('freshCropAdded');
        // Force refresh user crops immediately
        fetchUserCrops();
        // Also ensure predictions persist by not clearing cache
        console.log('📦 Maintaining cached predictions and weather data');
      }
    };

    // Check immediately when component mounts and after navigation
    checkFreshCrop();

    // Also check when component becomes visible again
    const handleVisibilityFocus = () => {
      if (!document.hidden && isAuthenticated) {
        checkFreshCrop();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  // Google Maps script loading is now handled by OptimizedMap component

  // Interactive map initialization is now handled by OptimizedMap component

  // Static map generation is now handled by OptimizedMap component

  const checkAuthentication = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      // No authentication, redirect to main page
      navigate('/');
      return;
    }

    try {
      // Verify token with backend
      verifyToken(token);
    } catch (error) {
      console.error('Authentication error:', error);
      handleLogout();
    }
  };

  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${apiUrl}/api/verify-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        await loadProfile();
        setIsAuthenticated(true);
        setLoading(false);
      } else {
        // Token is invalid
        handleLogout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      handleLogout();
    }
  };

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser({ name: data.name || 'User', email: data.email || '' });

        const profileData = {
          nitrogen: data.profile?.nitrogen ?? '',
          phosphorus: data.profile?.phosphorus ?? '',
          potassium: data.profile?.potassium ?? '',
          areaHectare: data.profile?.areaHectare ?? '',
          ph: data.profile?.ph ?? '',
          crop: data.profile?.crop ?? '',
          soilType: data.profile?.soilType ?? ''
        };

        setProfile(profileData);

        // Always fetch user crop selections
        await fetchUserCrops();

        // Always try to load cached predictions first, then check if profile is complete for fresh predictions
        const cachedPredictions = localStorage.getItem('cropPredictions');

        if (cachedPredictions) {
          console.log('📦 Found cached crop predictions, loading...');
          try {
            const predictionsData = JSON.parse(cachedPredictions);
            const cacheAge = new Date() - new Date(predictionsData.timestamp);
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            if (cacheAge < maxAge && predictionsData.predictions && predictionsData.predictions.length > 0) {
              console.log('✅ Using valid cached crop predictions');
              const top5Predictions = predictionsData.predictions.slice(0, 5);
              setPredictions(top5Predictions);
              setCurrentSeason(predictionsData.season || '');
              setPredictionsLoading(false);
            } else {
              console.log('⏰ Cached predictions expired, will fetch fresh if profile complete');
            }
          } catch (parseError) {
            console.warn('Failed to parse cached predictions:', parseError);
          }
        }

        // If profile has all required data for crop prediction, fetch fresh predictions
        if (profileData.nitrogen && profileData.phosphorus && profileData.potassium &&
          profileData.ph && profileData.soilType) {
          console.log('✅ Profile data complete, checking for fresh predictions...');

          if (!cachedPredictions || predictions.length === 0) {
            console.log('🔄 Fetching fresh crop predictions...');
            await fetchCropPredictions();
          } else {
            // Check if cached data is still valid
            try {
              const predictionsData = JSON.parse(cachedPredictions);
              const cacheAge = new Date() - new Date(predictionsData.timestamp);
              const maxAge = 24 * 60 * 60 * 1000; // 24 hours

              if (cacheAge >= maxAge) {
                console.log('🔄 Cached crop predictions expired, fetching fresh data automatically...');
                await fetchCropPredictions();
              } else {
                console.log('✅ Using cached crop predictions, auto-displaying crops');
                // Automatically show all 5 predictions
                const predictions = predictionsData.predictions || [];
                if (predictions.length > 0) {
                  const top5Predictions = predictions.slice(0, 5);
                  setPredictions(top5Predictions);
                  setCurrentSeason(predictionsData.season || '');
                  setPredictionsLoading(false);
                  console.log(`🌾 Auto-displayed ${top5Predictions.length} crops:`, top5Predictions.map(p => `${p.crop} (${p.probability}%)`).join(', '));
                } else {
                  // If no predictions in cache, fetch fresh ones
                  await fetchCropPredictions();
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse cached predictions, fetching fresh data:', parseError);
              await fetchCropPredictions();
            }
          }
        } else {
          console.log('⚠️ Profile incomplete for fresh predictions, using cached data only');
          console.log('Missing fields:', {
            nitrogen: !profileData.nitrogen,
            phosphorus: !profileData.phosphorus,
            potassium: !profileData.potassium,
            ph: !profileData.ph,
            soilType: !profileData.soilType
          });
          // Only set loading to false if we don't have cached predictions
          if (!cachedPredictions || predictions.length === 0) {
            setPredictionsLoading(false);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load profile', err);
      setPredictionsLoading(false);
    }
  };

  const fetchUserCrops = async () => {
    try {
      setUserCropsLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/api/user-crops`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserCrops(data.crops || []);
          console.log(`✅ Fetched ${data.crops?.length || 0} user crop selections for location: ${data.location?.district}, ${data.location?.state}`);

          // Log location-based filtering info
          if (data.location?.district && data.location?.state) {
            console.log(`🗺️ Crops filtered for current location: ${data.location.district}, ${data.location.state}`);
          } else {
            console.log('⚠️ No location filter applied - showing all user crops');
          }
        } else {
          setUserCrops([]);
        }
      } else {
        setUserCrops([]);
      }
    } catch (error) {
      console.error('Failed to fetch user crops:', error);
      setUserCrops([]);
    } finally {
      setUserCropsLoading(false);
    }
  };

  const fetchCropPredictions = async () => {
    try {
      setPredictionsLoading(true);
      const token = localStorage.getItem('token');

      // Timeout in case the API is slow/unresponsive
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${apiUrl}/api/crop-prediction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal
      }).catch(() => {
        // If aborted or network error, surface a graceful fallback below
        return { ok: false };
      });
      clearTimeout(timeoutId);

      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          // Format predictions for display and sort descending by probability
          const formattedPredictions = data.predictions
            .map((pred, index) => ({
              id: index + 1,
              crop: pred.crop,
              probability: pred.probability,
            }))
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 5); // Ensure we only take top 5

          setPredictions(formattedPredictions);
          setCurrentSeason(data.season);

          console.log(`✅ Auto-fetched and set ${formattedPredictions.length} crop predictions:`, formattedPredictions.map(p => `${p.crop} (${p.probability}%)`).join(', '));

          // Store predictions in localStorage
          localStorage.setItem('cropPredictions', JSON.stringify({
            predictions: formattedPredictions,
            season: data.season,
            timestamp: new Date().toISOString()
          }));

          // Map URL handling moved to OptimizedMap component
        } else {
          setPredictions([]);
        }
      } else {
        // Fallback: use cached if available to avoid empty UI when API is slow
        const cachedPredictions = localStorage.getItem('cropPredictions');
        if (cachedPredictions) {
          try {
            const data = JSON.parse(cachedPredictions);
            setPredictions(data.predictions || []);
            setCurrentSeason(data.season || '');
          } catch {
            setPredictions([]);
          }
        } else {
          setPredictions([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch crop predictions:', err);
      setPredictions([]);
    } finally {
      setPredictionsLoading(false);
    }
  };


  const loadCachedData = () => {
    try {
      // Load cached crop predictions only
      const cachedPredictions = localStorage.getItem('cropPredictions');
      if (cachedPredictions) {
        const data = JSON.parse(cachedPredictions);
        const cacheAge = new Date() - new Date(data.timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (cacheAge < maxAge && data.predictions && data.predictions.length > 0) {
          const top5Predictions = data.predictions.slice(0, 5);
          setPredictions(top5Predictions);
          setCurrentSeason(data.season);
          console.log('✅ Loaded cached crop predictions:', top5Predictions.map(p => `${p.crop} (${p.probability}%)`).join(', '));
          // Ensure UI doesn't keep showing spinner when we already have data
          setPredictionsLoading(false);
        } else {
          console.log('⚠️ Cached crop predictions expired or empty, will fetch fresh data');
        }
      }
    } catch (err) {
      console.error('Failed to load cached data:', err);
    }
  };

  // Safety: stop spinner after a short timeout if API is slow
  useEffect(() => {
    if (!predictionsLoading) return;
    const id = setTimeout(() => {
      setPredictionsLoading(false);
    }, 9000);
    return () => clearTimeout(id);
  }, [predictionsLoading]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Call logout API
        await fetch(`${apiUrl}/api/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear all authentication data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);

      // Redirect to main page
      navigate('/');
    }
  };

  const handlePredictionFormChange = (e) => {
    setPredictionForm({
      ...predictionForm,
      [e.target.name]: e.target.value
    });
  };

  const handlePredictionSubmit = async (e) => {
    e.preventDefault();
    // Here you would send the data to your ML model API
    console.log('Prediction form data:', predictionForm);
    setShowPredictionForm(false);
    // Reset form
    setPredictionForm({
      cropType: '',
      soilType: '',
      temperature: '',
      humidity: '',
      rainfall: '',
      ph: '',
      nitrogen: '',
      phosphorus: '',
      potassium: ''
    });
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-soft-beige-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farm-green-500 mx-auto mb-4"></div>
          <p className="text-muted-600 font-poppins"><T k="common.loadingDashboard">Loading dashboard...</T></p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render dashboard
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-soft-beige-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 w-full border-b border-farm-green-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative inline-flex items-center">
              <Leaf className="h-7 w-7 text-farm-green-600" />
              <Sun className="h-3.5 w-3.5 text-golden-yellow-500 absolute -top-1 -right-1" />
            </div>
            <span className="ml-1 text-xl font-bold text-farm-green-700 font-poppins">FarmFlow</span>
          </div>


          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
            <button onClick={() => navigate('/dashboard')} className="text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins">
              <T k="dashboard.title">Dashboard</T>
            </button>
            <button onClick={() => navigate('/select-crop')} className="text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins">
              <T k="dashboard.selectCrop">Select Crop</T>
            </button>
            <LanguageSwitcher inline={true} className="ml-2" />

            {/* Profile Section in Right Upper Corner */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins max-w-[200px]"
              >
                <div className="h-8 w-8 rounded-full border-2 border-farm-green-200 bg-farm-green-100 flex items-center justify-center">
                  <span role="img" aria-label="user" className="text-farm-green-700">👤</span>
                </div>
                <span className="hidden md:block truncate">{user.name}</span>
                <i data-lucide="chevron-right" className="h-4 w-4"></i>
              </button>

              {/* Prediction Form Dropdown */
              }
              {showPredictionForm && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-soft-beige-200 p-6 z-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground font-poppins"><T k="predictionForm.title">Enter Prediction Details</T></h3>
                    <button
                      onClick={() => setShowPredictionForm(false)}
                      className="text-muted-500 hover:text-muted-700"
                    >
                      <i data-lucide="x" className="h-5 w-5"></i>
                    </button>
                  </div>

                  <form onSubmit={handlePredictionSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 font-poppins"><T k="predictionForm.cropType">Crop Type</T></label>
                        <select
                          name="cropType"
                          value={predictionForm.cropType}
                          onChange={handlePredictionFormChange}
                          className="w-full px-3 py-2 border border-soft-beige-300 rounded-md"
                          required
                        >
                          <option value="">--</option>
                          {SUPPORTED_CROPS.map(c => (
                            <option key={c} value={c}>{getCropLabelFromName(c, t)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 font-poppins"><T k="predictionForm.soilType">Soil Type</T></label>
                        <input type="text" name="soilType" value={predictionForm.soilType} onChange={handlePredictionFormChange} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 font-poppins"><T k="predictionForm.temperature">Temperature (°C)</T></label>
                        <input type="number" name="temperature" value={predictionForm.temperature} onChange={handlePredictionFormChange} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 font-poppins"><T k="predictionForm.humidity">Relative Humidity (%)</T></label>
                        <input type="number" name="humidity" value={predictionForm.humidity} onChange={handlePredictionFormChange} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 font-poppins"><T k="predictionForm.rainfall">Rainfall (mm)</T></label>
                        <input type="number" name="rainfall" value={predictionForm.rainfall} onChange={handlePredictionFormChange} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 font-poppins"><T k="predictionForm.ph">Soil pH</T></label>
                        <input type="number" step="0.1" name="ph" value={predictionForm.ph} onChange={handlePredictionFormChange} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 font-poppins"><T k="predictionForm.nitrogen">Nitrogen (N)</T></label>
                        <input type="number" name="nitrogen" value={predictionForm.nitrogen} onChange={handlePredictionFormChange} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 font-poppins"><T k="predictionForm.phosphorus">Phosphorus (P)</T></label>
                        <input type="number" name="phosphorus" value={predictionForm.phosphorus} onChange={handlePredictionFormChange} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 font-poppins"><T k="predictionForm.potassium">Potassium (K)</T></label>
                        <input type="number" name="potassium" value={predictionForm.potassium} onChange={handlePredictionFormChange} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" className="farm-button-primary px-4 py-2"><T k="common.submit">Submit</T></button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Logout button moved out to avoid overlap */}
            <button
              onClick={handleLogout}
              className="ml-2 whitespace-nowrap text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins cursor-pointer flex-shrink-0"
            >
              <T k="dashboard.logout">Logout</T>
            </button>

          </div>

          {/* Mobile Menu Button */}
          <button onClick={toggleMenu} className="md:hidden p-2">
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-farm-green-200">
            <div className="container mx-auto py-4 space-y-3 px-4">
              <button onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
                <T k="dashboard.title">Dashboard</T>
              </button>
              <button onClick={() => { navigate('/select-crop'); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
                <T k="dashboard.selectCrop">Select Crop</T>
              </button>
              <button onClick={() => { navigate('/profile'); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
                <T k="dashboard.profile">Profile</T> ({user.name})
              </button>
              <div className="py-2">
                <LanguageSwitcher inline={true} className="w-full" />
              </div>
              <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
                <T k="dashboard.logout">Logout</T>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="flex flex-col md:flex-row justify-between mb-8">
          <h2 className="text-3xl font-bold text-farm-green-800 font-poppins">
            <T k="dashboard.title">Farm Dashboard</T>
          </h2>
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <span className="text-sm font-medium text-muted-600 font-poppins">
              <T k="dashboard.lastUpdated">Last updated: Just now</T>
            </span>
          </div>
        </div>

        {/* User Selected Crops (First) */}
        <div className="farm-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <i data-lucide="sprout" className="h-5 w-5 text-farm-green-600"></i>
              <h3 className="font-semibold text-foreground font-poppins">
                <T k="dashboard.userCrops">My Selected Crops</T>
              </h3>
            </div>
            <button
              onClick={() => navigate('/select-crop')}
              className="farm-button-primary px-3 py-2 text-sm flex items-center space-x-2"
            >
              <i data-lucide="plus" className="h-4 w-4"></i>
              <span><T k="dashboard.addCrop">Add Crop</T></span>
            </button>
          </div>
          <div className="mb-3 text-sm text-muted-600 font-poppins">{Math.min(userCrops?.length || 0, 5)}/5 <T k="selectCrop.cropsSelected">crops selected</T></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {(() => {
              const crops = (userCrops || []).slice(0, 5);
              const placeholders = Array.from({ length: Math.max(0, 5 - crops.length) });
              return (
                <>
                  {crops.map((c) => (
                    <div key={c._id || c.id} className="p-4 border border-soft-beige-200 rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/crop-details/${(c.crop || '').toLowerCase()}`)}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground font-poppins">{getCropLabelFromName(c.crop, t)}</h4>
                        <span className="text-xs text-muted-500">{c.season || t('common.season')}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-600"><T k="common.area">Area</T>:</span>
                          <span className="font-medium">{c.area ?? c.areaHectare} <T k="common.hectares">ha</T></span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-600"><T k="dashboard.estimatedYield">Est. Yield</T>:</span>
                          <span className="font-medium">{c.estimatedYield ? Number(c.estimatedYield).toFixed(2) : '--'} {t('common.tonnes', 'tonnes')}</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-soft-beige-100">
                        <span className="text-xs text-muted-400"><T k="dashboard.clickToView">Click to view details</T></span>
                      </div>
                    </div>
                  ))}
                  {placeholders.map((_, idx) => (
                    <div key={`placeholder-${idx}`} className="p-4 border border-dashed border-soft-beige-300 rounded-lg bg-white/70 flex flex-col items-center justify-center text-center text-muted-500">
                      <div className="text-2xl mb-2">➕</div>
                      <div className="text-sm font-poppins mb-2"><T k="dashboard.emptySlot">Empty slot</T></div>
                      <button onClick={() => navigate('/select-crop')} className="text-sm text-farm-green-700 hover:text-farm-green-800 underline"><T k="dashboard.addCrop">Add Crop</T></button>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>

        {/* AI Crop Recommendations (Second) */}
        <div className="farm-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <i data-lucide="target" className="h-5 w-5 text-farm-green-600"></i>
              <h3 className="font-semibold text-foreground font-poppins">
                <T k="dashboard.topCropPredictions">AI Crop Recommendations</T>
              </h3>
              {currentSeason && (
                <span className="px-2 py-1 text-xs bg-farm-green-100 text-farm-green-800 rounded-full">
                  {t(`seasons.${(currentSeason || '').toLowerCase()}`, currentSeason)} <T k="common.season">Season</T>
                </span>
              )}
            </div>
            {profile.nitrogen && profile.phosphorus && profile.potassium && profile.ph && profile.soilType && (
              <button
                onClick={() => fetchCropPredictions()}
                disabled={predictionsLoading}
                className="farm-button-secondary px-3 py-2 text-sm flex items-center space-x-2"
              >
                <i data-lucide="refresh-cw" className={`h-4 w-4 ${predictionsLoading ? 'animate-spin' : ''}`}></i>
                <span><T k="common.refresh">Refresh</T></span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {predictionsLoading ? (
              <div className="p-4 border border-soft-beige-200 rounded-lg bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green-500 mx-auto mb-4"></div>
                <p className="text-muted-500 font-poppins">
                  <T k="common.loading">Loading predictions...</T>
                </p>
              </div>
            ) : predictions.length === 0 ? (
              <div className="p-4 border border-soft-beige-200 rounded-lg bg-white flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-500 font-poppins mb-2">
                    <T k="dashboard.noPredictions">No AI predictions available.</T>
                  </p>
                  {(!profile.nitrogen || !profile.phosphorus || !profile.potassium || !profile.ph || !profile.soilType) ? (
                    <>
                      <p className="text-xs text-muted-400 mb-3">
                        <T k="dashboard.completeProfile">Complete your profile with soil data to get AI crop recommendations.</T>
                      </p>
                      <button onClick={() => navigate('/profile')} className="farm-button-primary px-4 py-2 text-sm">
                        <T k="dashboard.completeProfileButton">Complete Profile</T>
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-400 mb-3">
                        <T k="dashboard.predictionsAutoLoad">AI predictions will load automatically when available.</T>
                      </p>
                      <button onClick={() => fetchCropPredictions()} disabled={predictionsLoading} className="farm-button-secondary px-4 py-2 text-sm flex items-center space-x-2">
                        <i data-lucide="refresh-cw" className={`h-4 w-4 ${predictionsLoading ? 'animate-spin' : ''}`}></i>
                        <span><T k="common.refresh">Refresh Predictions</T></span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              predictions.map((prediction) => (
                <div key={prediction.id} className="p-4 border border-soft-beige-200 rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/crop-details/${prediction.crop.toLowerCase()}`)}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground font-poppins">{getCropLabelFromName(prediction.crop, t)}</h4>
                    <span className="text-xs text-muted-500">{prediction.probability}%</span>
                  </div>
                  <p className="text-xs text-muted-600"><T k="dashboard.clickToView">Click to view details</T></p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weather, Crop Progress, Field Map */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {/* Weather Card - compact wrapper */}
          <div className="lg:col-span-1">
            <div
              className="farm-card p-6 h-full hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground font-poppins"><T k="dashboard.weatherTitle">Weather</T></h3>
                <i data-lucide="arrow-right" className="h-4 w-4 text-muted-400"></i>
              </div>
              <WeatherApp />
            </div>
          </div>

          {/* Recommendation Strength (percentages) */}
          <div className="farm-card p-4 lg:col-span-1 h-full">
            <div className="flex items-center space-x-2 mb-4">
              <i data-lucide="sprout" className="h-5 w-5 text-farm-green-600"></i>
              <h3 className="font-semibold text-foreground font-poppins"><T k="dashboard.recommendationStrength">Recommendation Strength</T></h3>
            </div>
            <div className="space-y-1 pr-1">
              {(predictions || []).slice(0, 5).map((p) => (
                <div key={p.id} className="p-1.5 bg-soft-beige-100 rounded-lg border border-soft-beige-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-farm-green-900 font-poppins">{getCropLabelFromName(p.crop, t)}</span>
                    <span className="text-[11px] font-medium text-farm-green-700 font-poppins">{p.probability}%</span>
                  </div>
                  <div className="w-full bg-soft-beige-200 rounded-full h-1">
                    <div className="bg-farm-green-600 h-1 rounded-full" style={{ width: `${p.probability}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map - Using Optimized Component */}
          <div
            className="farm-card p-6 md:col-span-2 lg:col-span-1 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <i data-lucide="map-pin" className="h-5 w-5 text-farm-green-600"></i>
                <h3 className="font-semibold text-foreground font-poppins"><T k="dashboard.locationAndCrops">Location & Crops</T></h3>
              </div>
              <i data-lucide="arrow-right" className="h-4 w-4 text-muted-400"></i>
            </div>
            <OptimizedMap predictions={predictions} showCropInfo={true} coordinates={weatherData.coordinates} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-8">
          {/* Crop Recommendation Card */}
          <div
            onClick={() => navigate('/crop-prediction')}
            className="farm-card p-6 hover:shadow-xl transition-all duration-300 block cursor-pointer"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Lightbulb className="h-5 w-5 text-farm-green-600" />
              <h3 className="font-semibold text-farm-green-700 font-poppins">{t('dashboard.cropRecommendation', 'Crop Recommendation')}</h3>
            </div>
            <p className="text-sm text-gray-500 font-poppins">{t('dashboard.getAiSuggestions', 'Get AI-powered crop suggestions')}</p>
            <div className="mt-4 text-farm-green-600 flex items-center font-poppins">
              {t('dashboard.tryItNow', 'Try it now')} <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          {/* Yield Estimation Card */}
          <div
            onClick={() => navigate('/yield-estimation')}
            className="farm-card p-6 hover:shadow-xl transition-all duration-300 block cursor-pointer"
          >
            <div className="flex items-center space-x-2 mb-2">
              <BarChart2 className="h-5 w-5 text-golden-yellow-600" />
              <h3 className="font-semibold text-golden-yellow-700 font-poppins">{t('dashboard.yieldEstimation', 'Yield Estimation')}</h3>
            </div>
            <p className="text-sm text-gray-500 font-poppins">{t('dashboard.predictYields', 'Predict your crop yields')}</p>
            <div className="mt-4 text-golden-yellow-600 flex items-center font-poppins">
              {t('dashboard.estimateNow', 'Estimate now')} <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
