import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InteractiveMap from './InteractiveMap';
import Navbar from './Navbar';
import T from './T';
import { useTranslation } from 'react-i18next';
import { getCropLabelFromName } from '../constants/crops';
import SpeedometerGauge from './SpeedometerGauge';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CropDetails = () => {
  const { cropName } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Helper function to translate state and district names
  const translateLocationName = (name, type = 'state') => {
    if (!name) return name;
    const key = `${type}s.${name.toLowerCase().replace(/\s+/g, '_')}`;
    const translated = t(key);
    return translated !== key ? translated : name; // Fallback to original name if translation not found
  };
  const [cropDetails, setCropDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Location dropdown states
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [selectedLocationData, setSelectedLocationData] = useState(null);

  // Helper function to get coordinates for a location
  const getCoordinatesForLocation = (state, district) => {
    console.log('🔍 getCoordinatesForLocation called with:', state, district);
    // This is a simplified mapping - in a real app, you'd fetch this from an API
    const locationCoordinates = {
      'karnataka': {
        'bangalore_rural': { lat: 12.9716, lng: 77.5946 },
        'mysore': { lat: 12.2958, lng: 76.6394 },
        'mandya': { lat: 12.5242, lng: 76.8958 },
        'hassan': { lat: 13.0035, lng: 76.1004 },
        'tumkur': { lat: 13.3392, lng: 77.1139 },
        'bagalkot': { lat: 16.1862, lng: 75.7893 },
        'belgaum': { lat: 15.8497, lng: 74.4977 },
        'bellary': { lat: 15.1394, lng: 76.9214 },
        'bengaluru_urban': { lat: 12.9716, lng: 77.5946 },
        'bidar': { lat: 17.9134, lng: 77.5301 },
        'bijapur': { lat: 16.8244, lng: 75.7154 },
        'chamarajanagar': { lat: 11.9261, lng: 76.9396 },
        'chikballapur': { lat: 13.4352, lng: 77.7315 },
        'chikmagalur': { lat: 13.3161, lng: 75.7720 },
        'chitradurga': { lat: 14.2264, lng: 76.4008 },
        'dakshin_kannad': { lat: 12.8406, lng: 75.2479 },
        'davangere': { lat: 14.4644, lng: 75.9218 },
        'dharwad': { lat: 15.4589, lng: 75.0078 },
        'gadag': { lat: 15.4316, lng: 75.6319 },
        'gulbarga': { lat: 17.3297, lng: 76.8343 },
        'haveri': { lat: 14.7936, lng: 75.4044 },
        'kodagu': { lat: 12.3372, lng: 75.8069 },
        'kolar': { lat: 13.1372, lng: 78.1336 },
        'koppal': { lat: 15.3548, lng: 76.2080 },
        'raichur': { lat: 16.2076, lng: 77.3463 },
        'shimoga': { lat: 13.9299, lng: 75.5681 },
        'udupi': { lat: 13.3409, lng: 74.7421 },
        'uttar_kannad': { lat: 14.8495, lng: 74.1290 },
        'yadgir': { lat: 16.7667, lng: 77.1333 }
      },
      'maharashtra': {
        'mumbai_city': { lat: 19.0760, lng: 72.8777 },
        'pune': { lat: 18.5204, lng: 73.8567 },
        'nagpur': { lat: 21.1458, lng: 79.0882 },
        'nashik': { lat: 19.9975, lng: 73.7898 },
        'aurangabad': { lat: 19.8762, lng: 75.3433 },
        'solapur': { lat: 17.6599, lng: 75.9064 },
        'kolhapur': { lat: 16.7050, lng: 74.2433 },
        'amravati': { lat: 20.9374, lng: 77.7796 },
        'nanded': { lat: 19.1383, lng: 77.3210 },
        'sangli': { lat: 16.8524, lng: 74.5815 },
        'malegaon': { lat: 20.5598, lng: 74.5259 },
        'jalgaon': { lat: 21.0077, lng: 75.5626 },
        'akola': { lat: 20.7000, lng: 77.0000 },
        'latur': { lat: 18.4088, lng: 76.5604 },
        'ahmednagar': { lat: 19.0952, lng: 74.7496 },
        'chandrapur': { lat: 19.9615, lng: 79.2961 },
        'parbhani': { lat: 19.2433, lng: 76.7772 },
        'ichalkaranji': { lat: 16.6919, lng: 74.4605 },
        'jalna': { lat: 19.8413, lng: 75.8864 },
        'bhusawal': { lat: 21.0436, lng: 75.7851 },
        'panvel': { lat: 19.0330, lng: 73.0297 },
        'satara': { lat: 17.6805, lng: 73.9933 },
        'beed': { lat: 18.9894, lng: 75.7564 },
        'yavatmal': { lat: 20.3932, lng: 78.1320 },
        'kamptee': { lat: 21.2333, lng: 79.2000 },
        'gondia': { lat: 21.4500, lng: 80.2000 },
        'barshi': { lat: 18.2333, lng: 75.7000 },
        'achalpur': { lat: 21.2574, lng: 77.5086 },
        'osmanabad': { lat: 18.1667, lng: 76.0500 },
        'nandurbar': { lat: 21.3667, lng: 74.2500 },
        'wardha': { lat: 20.7500, lng: 78.6167 },
        'udgir': { lat: 18.3833, lng: 77.1167 },
        'hinganghat': { lat: 20.5667, lng: 78.8333 }
      },
      'andhra_pradesh': {
        'anantapur': { lat: 14.6819, lng: 77.6006 },
        'chittoor': { lat: 13.2144, lng: 79.1000 },
        'east_godavari': { lat: 16.9333, lng: 82.2167 },
        'guntur': { lat: 16.3008, lng: 80.4428 },
        'krishna': { lat: 16.1667, lng: 81.1333 },
        'kurnool': { lat: 15.8300, lng: 78.0500 },
        'prakasam': { lat: 15.5000, lng: 79.5000 },
        'sri_potti_sriramulu_nellore': { lat: 14.4333, lng: 79.9667 },
        'srikakulam': { lat: 18.3000, lng: 83.9000 },
        'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
        'vizianagaram': { lat: 18.1167, lng: 83.4167 },
        'west_godavari': { lat: 16.7000, lng: 81.1000 },
        'ysr_kadapa': { lat: 14.4667, lng: 78.8167 }
      },
      'tamil_nadu': {
        'chennai': { lat: 13.0827, lng: 80.2707 },
        'coimbatore': { lat: 11.0168, lng: 76.9558 },
        'madurai': { lat: 9.9252, lng: 78.1198 },
        'tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
        'salem': { lat: 11.6643, lng: 78.1460 },
        'tirunelveli': { lat: 8.7139, lng: 77.7567 },
        'tiruppur': { lat: 11.1085, lng: 77.3411 },
        'erode': { lat: 11.3410, lng: 77.7172 },
        'vellore': { lat: 12.9202, lng: 79.1500 },
        'thoothukudi': { lat: 8.7642, lng: 78.1348 },
        'dindigul': { lat: 10.3450, lng: 77.9600 },
        'thanjavur': { lat: 10.7869, lng: 79.1378 },
        'ranipet': { lat: 12.9333, lng: 79.3333 },
        'kancheepuram': { lat: 12.8333, lng: 79.7000 },
        'karur': { lat: 10.9500, lng: 78.0833 },
        'tiruvallur': { lat: 13.1333, lng: 79.9000 },
        'cuddalore': { lat: 11.7500, lng: 79.7500 },
        'nagapattinam': { lat: 10.7667, lng: 79.8333 },
        'namakkal': { lat: 11.2167, lng: 78.1667 },
        'nilgiris': { lat: 11.4000, lng: 76.7000 },
        'perambalur': { lat: 11.2333, lng: 78.8833 },
        'pudukkottai': { lat: 10.3833, lng: 78.8167 },
        'ramanathapuram': { lat: 9.3833, lng: 78.8333 },
        'sivaganga': { lat: 9.8667, lng: 78.4833 },
        'tenkasi': { lat: 8.9667, lng: 77.3000 },
        'theni': { lat: 10.0167, lng: 77.4833 },
        'tirupathur': { lat: 12.5000, lng: 78.5667 },
        'tiruvannamalai': { lat: 12.2167, lng: 79.0667 },
        'tiruvarur': { lat: 10.7667, lng: 79.6333 },
        'viluppuram': { lat: 11.9500, lng: 79.5000 },
        'virudhunagar': { lat: 9.5833, lng: 77.9500 },
        'ariyalur': { lat: 11.1333, lng: 79.0833 },
        'chengalpattu': { lat: 12.6833, lng: 79.9833 },
        'dharmapuri': { lat: 12.1167, lng: 78.1667 },
        'kallakurichi': { lat: 11.7333, lng: 78.9667 },
        'krishnagiri': { lat: 12.5167, lng: 78.2167 },
        'mayiladuthurai': { lat: 11.1000, lng: 79.6500 }
      },
      'telangana': {
        'hyderabad': { lat: 17.3850, lng: 78.4867 },
        'warangal': { lat: 17.9689, lng: 79.5941 },
        'nizamabad': { lat: 18.6711, lng: 78.0938 },
        'khammam': { lat: 17.2473, lng: 80.1514 },
        'karimnagar': { lat: 18.4386, lng: 79.1288 },
        'ramagundam': { lat: 18.8000, lng: 79.4500 },
        'mahbubnagar': { lat: 16.7333, lng: 77.9833 },
        'nalgonda': { lat: 17.0500, lng: 79.2667 },
        'adilabad': { lat: 19.6667, lng: 78.5333 },
        'suryapet': { lat: 17.1406, lng: 79.6201 },
        'miryalaguda': { lat: 16.8667, lng: 79.5667 },
        'tadipatri': { lat: 14.9167, lng: 78.0167 },
        'siddipet': { lat: 18.1000, lng: 78.8500 },
        'wanaparthy': { lat: 16.3667, lng: 78.0667 },
        'kagaznagar': { lat: 19.3333, lng: 79.4833 },
        'gadwal': { lat: 16.2333, lng: 77.8000 },
        'sircilla': { lat: 18.3833, lng: 78.8167 },
        'tandur': { lat: 17.2500, lng: 77.5833 },
        'vikarabad': { lat: 17.3333, lng: 77.9000 },
        'sangareddy': { lat: 17.6167, lng: 78.0833 },
        'medak': { lat: 18.0333, lng: 78.2667 },
        'nirmal': { lat: 19.1000, lng: 78.3500 },
        'kamareddy': { lat: 18.3167, lng: 78.3333 },
        'jagtial': { lat: 18.8000, lng: 78.9167 },
        'jangaon': { lat: 17.7167, lng: 79.1833 },
        'bhadrachalam': { lat: 17.6667, lng: 80.8833 },
        'bhupalpally': { lat: 18.4667, lng: 79.8667 },
        'asifabad': { lat: 19.3667, lng: 79.2833 },
        'mahabubabad': { lat: 17.6000, lng: 80.0167 },
        'mancherial': { lat: 18.8667, lng: 79.4333 },
        'mulugu': { lat: 18.0333, lng: 80.1167 },
        'nagarkurnool': { lat: 16.4833, lng: 78.3167 },
        'narayanpet': { lat: 16.7500, lng: 77.5000 },
        'peddapalli': { lat: 18.6167, lng: 79.3667 },
        'rangareddy': { lat: 17.3833, lng: 78.4333 },
        'yadadri_bhuvanagiri': { lat: 17.6000, lng: 78.9500 }
      },
      'goa': {
        'north_goa': { lat: 15.5000, lng: 73.8333 },
        'south_goa': { lat: 15.2000, lng: 74.0000 }
      },
      'kerala': {
        'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
        'kochi': { lat: 9.9312, lng: 76.2673 },
        'kozhikode': { lat: 11.2588, lng: 75.7804 },
        'thrissur': { lat: 10.5276, lng: 76.2144 },
        'kollam': { lat: 8.8932, lng: 76.6141 },
        'palakkad': { lat: 10.7867, lng: 76.6548 },
        'malappuram': { lat: 11.0400, lng: 76.0800 },
        'kannur': { lat: 11.8745, lng: 75.3704 },
        'kasaragod': { lat: 12.5000, lng: 74.9833 },
        'kottayam': { lat: 9.5833, lng: 76.5167 },
        'alappuzha': { lat: 9.4900, lng: 76.3264 },
        'pathanamthitta': { lat: 9.2667, lng: 76.7833 },
        'idukki': { lat: 9.8500, lng: 76.9667 },
        'wayanad': { lat: 11.6050, lng: 76.0833 }
      }
    };

    // Return coordinates if found, otherwise return default India coordinates
    const result = locationCoordinates[state]?.[district] || { lat: 20.5937, lng: 78.9629 };
    console.log('📍 getCoordinatesForLocation returning:', result);
    return result;
  };

  // Get user's actual location from localStorage (from dashboard) - memoized to prevent unnecessary re-renders
  const getUserCoordinates = useMemo(() => {
    const locationData = localStorage.getItem('locationData');
    console.log('🔍 Getting user coordinates from localStorage:', locationData);

    if (locationData) {
      try {
        const parsed = JSON.parse(locationData);
        console.log('📍 Parsed location data:', parsed);
        if (parsed.coordinates && parsed.coordinates.lat && parsed.coordinates.lng) {
          console.log('✅ Using user coordinates from localStorage:', parsed.coordinates);
          return parsed.coordinates;
        }
      } catch (e) {
        console.warn('Failed to parse location data:', e);
      }
    }
    // Fallback to cropDetails coordinates if no user location found
    console.log('⚠️ Using fallback coordinates:', cropDetails?.coordinates);
    return cropDetails?.coordinates || { lat: 20.5937, lng: 78.9629 };
  }, [cropDetails?.coordinates]); // Only recalculate if cropDetails.coordinates changes

  // Get user's actual location name from localStorage (from dashboard) - memoized to prevent unnecessary re-renders
  const getUserLocationName = useMemo(() => {
    const locationData = localStorage.getItem('locationData');
    if (locationData) {
      try {
        const parsed = JSON.parse(locationData);
        if (parsed.address && parsed.address.district && parsed.address.state) {
          return `${parsed.address.district}, ${parsed.address.state}`;
        }
      } catch (e) {
        console.warn('Failed to parse location data:', e);
      }
    }
    // Fallback to cropDetails location if no user location found
    return cropDetails?.location ? `${cropDetails.location.district}, ${cropDetails.location.state}` : 'Unknown Location';
  }, [cropDetails?.location?.district, cropDetails?.location?.state]); // Only recalculate if cropDetails location changes

  // Get coordinates for map - either user's location or selected location
  const coordinates = getUserCoordinates;

  // Memoized map coordinates - only recalculate when selectedState, selectedDistrict, or coordinates change
  const mapCoordinates = useMemo(() => {
    if (selectedState && selectedDistrict) {
      const selectedCoords = getCoordinatesForLocation(selectedState, selectedDistrict);
      console.log('🗺️ Using selected coordinates:', selectedCoords, 'for', selectedState, selectedDistrict);
      return selectedCoords;
    } else {
      console.log('🗺️ Using user coordinates:', coordinates, 'selectedState:', selectedState, 'selectedDistrict:', selectedDistrict);
      return coordinates;
    }
  }, [selectedState, selectedDistrict, coordinates]);

  // Memoized map location name - only recalculate when selectedState, selectedDistrict, or getUserLocationName change
  const mapLocationName = useMemo(() => {
    if (selectedState && selectedDistrict) {
      return `${selectedDistrict}, ${selectedState}`;
    } else {
      return getUserLocationName;
    }
  }, [selectedState, selectedDistrict, getUserLocationName]);

  useEffect(() => {
    loadCropDetails();
    loadLocations();
  }, [cropName]);

  // Set initial state and district when cropDetails loads
  useEffect(() => {
    if (cropDetails?.location && window.districtsByState) {
      setSelectedState(cropDetails.location.state);
      setDistricts(window.districtsByState[cropDetails.location.state] || []);
      setSelectedDistrict(cropDetails.location.district);
    }
  }, [cropDetails]);

  const loadLocations = async () => {
    try {
      setLoadingLocations(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${apiUrl}/api/locations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStates(data.states);
          // Store districts data for later use
          window.districtsByState = data.districtsByState;
        }
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleStateChange = (state) => {
    setSelectedState(state);
    setSelectedDistrict('');
    // Load districts for selected state
    loadDistrictsForState(state);
  };

  const loadDistrictsForState = (state) => {
    if (window.districtsByState && window.districtsByState[state]) {
      setDistricts(window.districtsByState[state]);
    } else {
      setDistricts([]);
    }
  };

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
    // Load crop details for selected location
    if (selectedState && district) {
      loadCropDetailsForLocation(selectedState, district);
      // Trigger map popup for selected location
      triggerMapPopup(selectedState, district);
    }
  };

  const triggerMapPopup = (state, district) => {
    // Get coordinates for the selected location
    // For now, we'll use a default coordinate, but this should ideally fetch from an API
    const coordinates = getCoordinatesForLocation(state, district);

    // Set location data for popup
    setSelectedLocationData({
      locationName: `${district}, ${state}`,
      coordinates: coordinates
    });
    setShowMapPopup(true);

    // Reset popup trigger after a short delay
    setTimeout(() => {
      setShowMapPopup(false);
    }, 100);
  };


  const loadCropDetailsForLocation = async (state, district) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await fetch(`${apiUrl}/api/crop-details/${cropName}?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCropDetails(data.cropDetails);

          // Update map URL for new location
          const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          if (GOOGLE_KEY && data.cropDetails.coordinates) {
            const base = 'https://maps.googleapis.com/maps/api/staticmap';
            const size = '640x320';
            const center = `${data.cropDetails.coordinates.lat},${data.cropDetails.coordinates.lng}`;
            const zoom = 12;
            const marker = `markers=color:green%7Clabel:${data.cropDetails.crop.charAt(0).toUpperCase()}%7C${center}`;
            const url = `${base}?center=${center}&zoom=${zoom}&size=${size}&${marker}&key=${GOOGLE_KEY}`;
            setMapUrl(url);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load crop details for location:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCropDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      console.log('🔍 Loading crop details for:', cropName);

      // Get location from localStorage (set by dashboard)
      const locationData = localStorage.getItem('locationData');
      let locationParams = '';

      if (locationData) {
        try {
          const parsed = JSON.parse(locationData);
          if (parsed.coordinates && parsed.address) {
            const { lat, lng } = parsed.coordinates;
            const { state, district } = parsed.address;
            locationParams = `?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&lat=${lat}&lng=${lng}`;
            console.log(`📍 Passing location from dashboard: ${district}, ${state}`);
          }
        } catch (e) {
          console.warn('Failed to parse location data:', e);
        }
      }

      // Fetch comprehensive crop details from backend
      const response = await fetch(`${apiUrl}/api/crop-details/${cropName}${locationParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Crop details response:', data);

        if (data.success) {
          setCropDetails(data.cropDetails);

          // Build map URL using location coordinates if available
          const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          console.log('🗺️ Google Maps API Key available:', !!GOOGLE_KEY);

          if (GOOGLE_KEY && data.cropDetails.location) {
            const base = 'https://maps.googleapis.com/maps/api/staticmap';
            const size = '640x320';

            // Use actual location coordinates if available, otherwise default center
            let center = '20.5937,78.9629'; // Default India center
            let zoom = 6;

            // If we have coordinates from the stored dashboard location, use them
            if (data.cropDetails.coordinates && data.cropDetails.coordinates.lat && data.cropDetails.coordinates.lng) {
              center = `${data.cropDetails.coordinates.lat},${data.cropDetails.coordinates.lng}`;
              zoom = 12; // Closer zoom for specific location
              console.log('📍 Using stored coordinates:', center);
            } else {
              console.log('📍 Using default center:', center);
            }

            const marker = `markers=color:green%7Clabel:${data.cropDetails.crop.charAt(0).toUpperCase()}%7C${center}`;
            const url = `${base}?center=${center}&zoom=${zoom}&size=${size}&${marker}&key=${GOOGLE_KEY}`;
            console.log('🗺️ Generated map URL:', url);
            setMapUrl(url);
          } else {
            console.log('🗺️ No Google Maps API key or location data available');
          }
        } else {
          console.error('❌ API returned success: false', data);
          setError(data.error || 'Failed to load crop details');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ HTTP error:', response.status, errorText);
        setError(`Failed to fetch crop details: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('❌ Failed to load crop details:', err);
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  const refreshData = async () => {
    setLoading(true);
    await loadCropDetails();
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-beige-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farm-green-500 mx-auto mb-4"></div>
          <p className="text-muted-600 font-poppins"><T k="cropDetails.loading">Loading crop details...</T></p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-soft-beige-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <i data-lucide="alert-circle" className="h-12 w-12 mx-auto"></i>
          </div>
          <h2 className="text-xl font-bold text-foreground font-poppins mb-2"><T k="common.error">Error</T></h2>
          <p className="text-muted-600 font-poppins mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="farm-button-primary px-4 py-2"
          >
            <T k="common.backToDashboard">Back to Dashboard</T>
          </button>
        </div>
      </div>
    );
  }

  if (!cropDetails) {
    return (
      <div className="min-h-screen bg-soft-beige-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-400 mb-4">
            <i data-lucide="search" className="h-12 w-12 mx-auto"></i>
          </div>
          <h2 className="text-xl font-bold text-foreground font-poppins mb-2"><T k="cropDetails.notFound">Crop Not Found</T></h2>
          <p className="text-muted-600 font-poppins mb-4"><T k="cropDetails.notAvailable">The requested crop data is not available.</T></p>
          <button
            onClick={() => navigate('/dashboard')}
            className="farm-button-primary px-4 py-2"
          >
            <T k="common.backToDashboard">Back to Dashboard</T>
          </button>
        </div>
      </div>
    );
  }

  const { crop, location, season, currentCycle, thresholds, regional, cycles } = cropDetails;
  const seasonDisplay = season ? t(`seasons.${String(season).toLowerCase()}`, season) : '';

  return (
    <div className="min-h-screen bg-soft-beige-950">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-soft-beige-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-muted-600 hover:text-farm-green-600 transition-colors"
              >
                <i data-lucide="arrow-left" className="h-5 w-5"></i>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground font-poppins">
                  {getCropLabelFromName(crop, t)}
                </h1>
                <p className="text-muted-600 font-poppins"><T k="cropDetails.subtitle">Crop Details & Production Analysis</T></p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="farm-button-primary px-4 py-2 flex items-center space-x-2"
              >
                <i data-lucide="arrow-left" className="h-4 w-4"></i>
                <span><T k="common.backToDashboard">Back to Dashboard</T></span>
              </button>
              <button
                onClick={refreshData}
                disabled={loading}
                className="farm-button-secondary px-4 py-2 flex items-center space-x-2"
              >
                <i data-lucide="refresh-cw" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}></i>
                <span><T k="common.refresh">Refresh</T></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Upper summary: thresholds and district */}
        <div className="farm-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <i data-lucide="map-pin" className="h-5 w-5 text-farm-green-600"></i>
              <h3 className="font-semibold text-foreground font-poppins">{location.district}, {location.state}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs bg-farm-green-100 text-farm-green-800 rounded-full">{seasonDisplay} <T k="common.season">Season</T></span>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"><T k="cropDetails.cycle">Cycle</T> {currentCycle}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-soft-beige-100 rounded-lg">
              <div className="text-sm font-medium text-foreground font-poppins mb-1"><T k="cropDetails.cycleThreshold">Cycle Threshold (District-wise)</T></div>
              <div className="text-2xl font-bold text-farm-green-700 font-poppins">{thresholds.cycleMax.toFixed(3)} {t('common.tonnes', 'tonnes')}</div>
              <div className="text-xs text-muted-600 font-poppins"><T k="common.max">Max</T>: {thresholds.cycleMax.toFixed(3)} | <T k="common.avg">Avg</T>: {thresholds.cycleAvg.toFixed(3)} {t('common.tonnes', 'tonnes')}</div>
            </div>
            <div className="p-4 bg-soft-beige-100 rounded-lg">
              <div className="text-sm font-medium text-foreground font-poppins mb-1"><T k="cropDetails.seasonThreshold">Season Threshold (District-wise)</T></div>
              <div className="text-2xl font-bold text-farm-green-700 font-poppins">{thresholds.seasonMax.toFixed(3)} {t('common.tonnes', 'tonnes')}</div>
              <div className="text-xs text-muted-600 font-poppins">{season} <T k="cropDetails.seasonMaxCapacity">season max capacity</T></div>
            </div>
            <div className="p-4 bg-soft-beige-100 rounded-lg">
              <div className="text-sm font-medium text-foreground font-poppins mb-1"><T k="cropDetails.stateThreshold">State Threshold</T></div>
              <div className="text-2xl font-bold text-farm-green-700 font-poppins">{thresholds.stateMax.toFixed(3)} {t('common.tonnes', 'tonnes')}</div>
              <div className="text-xs text-muted-600 font-poppins"><T k="cropDetails.sumOfDistricts">Sum of all districts in state</T></div>
            </div>
          </div>

          {/* Threshold Status */}
          <div className={`mt-4 p-4 rounded-lg border-2 ${cycles.threshold.reached ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground font-poppins mb-1">
                {cycles.threshold.reached ? t('cropDetails.thresholdReached', '⚠️ THRESHOLD REACHED') : t('cropDetails.goodOpportunity', '✅ GOOD OPPORTUNITY')}
              </div>
              <div className="text-sm text-muted-600 font-poppins">
                {cycles.threshold.reached ?
                  t('cropDetails.thresholdAdviceBad', 'Consider switching to other crops. This region may be saturated for this crop.') :
                  t('cropDetails.thresholdAdviceGood', 'This region has capacity for more production of this crop.')}
              </div>
              <div className="text-xs text-muted-600 font-poppins mt-1">
                <T k="cropDetails.current">Current</T>: {cycles.threshold.current.toFixed(3)} / <T k="cropDetails.threshold">Threshold</T>: {cycles.threshold.value.toFixed(3)} {t('common.tonnes', 'tonnes')} ({cycles.threshold.percentage}%)
              </div>
            </div>
          </div>

          {/* Actual Farmer Production */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-farm-green-50 rounded-lg border border-farm-green-200">
              <div className="text-sm font-medium text-foreground font-poppins mb-1"><T k="cropDetails.cycleProduction">Cycle Production</T></div>
              <div className="text-2xl font-bold text-farm-green-700 font-poppins">{regional.cycle.totalProduction.toFixed(3)} {t('common.tonnes', 'tonnes')}</div>
              <div className="text-xs text-muted-600 font-poppins">{regional.cycle.submissions} {t('common.farmers', 'farmers')} <T k="cropDetails.inCurrentCycle">in current cycle</T></div>
            </div>
            <div className="p-4 bg-soft-beige-100 rounded-lg">
              <div className="text-sm font-medium text-foreground font-poppins mb-1"><T k="cropDetails.seasonProduction">Season Production</T></div>
              <div className="text-2xl font-bold text-foreground font-poppins">{regional.season.totalProduction.toFixed(3)} {t('common.tonnes', 'tonnes')}</div>
              <div className="text-xs text-muted-600 font-poppins">{regional.season.submissions} {t('common.farmers', 'farmers')} <T k="cropDetails.thisSeason">this season</T></div>
            </div>
            <div className="p-4 bg-soft-beige-100 rounded-lg">
              <div className="text-sm font-medium text-foreground font-poppins mb-1"><T k="cropDetails.stateProduction">State Production</T></div>
              <div className="text-2xl font-bold text-foreground font-poppins">{regional.state.totalProduction.toFixed(3)} {t('common.tonnes', 'tonnes')}</div>
              <div className="text-xs text-muted-600 font-poppins">{regional.state.submissions} {t('common.farmers', 'farmers')} <T k="cropDetails.acrossState">across state</T></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left block: Production vs Threshold Charts */}
          <div className="farm-card p-6">
            <div className="flex items-center space-x-2 mb-4">
              <i data-lucide="bar-chart-2" className="h-5 w-5 text-golden-yellow-600"></i>
              <h3 className="font-semibold text-foreground font-poppins"><T k="cropDetails.prodVsThreshold">Production vs Threshold Analysis</T></h3>
            </div>

            {/* Overall Threshold Status Chart */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-foreground font-poppins mb-3"><T k="cropDetails.districtThreshold">District Threshold Status</T></div>
              <div className="flex items-center justify-center">
                <SpeedometerGauge
                  done={cycles.threshold.current}
                  total={cycles.threshold.value}
                  size={220}
                  label={t('cropDetails.ofThreshold', 'of Threshold')}
                  units={t('common.tonnes', 'tonnes')}
                  thresholds={{ warn: cycles.threshold.value * 0.7, bad: cycles.threshold.value * 0.9 }}
                  showNeedle={false}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-600 font-poppins mt-2">
                <span><T k="cropDetails.current">Current</T>: {(cycles.threshold.current * 1000).toFixed(0)} {t('common.tonnes', 'tonnes')}</span>
                <span><T k="cropDetails.threshold">Threshold</T>: {(cycles.threshold.value * 1000).toFixed(0)} {t('common.tonnes', 'tonnes')}</span>
              </div>
            </div>

            {/* Cycle-wise Production Chart */}
            {cycles.data && cycles.data.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm font-medium text-foreground font-poppins mb-3"><T k="cropDetails.prodByCycle">Production by Cycle</T></div>
                {cycles.data.map((cycleData, index) => {
                  const maxProduction = Math.max(...cycles.data.map(c => c.production));
                  const cycleThreshold = thresholds.cycleMax || maxProduction;
                  const productionPercentage = (cycleData.production / cycleThreshold) * 100;
                  const isCurrentCycle = cycleData.cycle === currentCycle;

                  return (
                    <div key={cycleData.cycle} className={`p-4 rounded-lg border ${isCurrentCycle ? 'border-blue-300 bg-blue-50' : 'border-soft-beige-200 bg-white'}`}>
                      <div className="flex items-center justify-between text-sm font-poppins mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-foreground font-medium"><T k="cropDetails.cycle">Cycle</T> {cycleData.cycle}</span>
                          {isCurrentCycle && <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"><T k="cropDetails.current">Current</T></span>}
                        </div>
                        <span className="text-muted-600">{cycleData.farmers} {t('common.farmers', 'farmers')}</span>
                      </div>

                      {/* Gauges: Production vs Cycle Threshold and Avg Yield */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col items-center">
                          <SpeedometerGauge
                            done={cycleData.production}
                            total={cycleThreshold}
                            size={180}
                            label={t('cropDetails.prodVsCycle', 'Production vs Cycle Threshold')}
                            units={t('common.tonnes', 'tonnes')}
                            thresholds={{ warn: cycleThreshold * 0.7, bad: cycleThreshold * 0.9 }}
                            showNeedle={false}
                          />
                          <div className="text-xs text-muted-600 font-poppins mt-1">
                            {(cycleData.production * 1000).toFixed(0)} / {(cycleThreshold * 1000).toFixed(0)} {t('common.tonnes', 'tonnes')}
                          </div>
                        </div>

                        <div className="flex flex-col items-center">
                          {(() => {
                            const maxAvgYield = Math.max(...cycles.data.map(c => c.avgYield));
                            return (
                              <SpeedometerGauge
                                value={cycleData.avgYield}
                                min={0}
                                max={maxAvgYield || 1}
                                size={180}
                                label={t('cropDetails.avgYield', 'Average Yield')}
                                units={t('common.tonnesPerHa', 'tonnes/ha')}
                                thresholds={{ warn: (maxAvgYield || 1) * 0.7, bad: (maxAvgYield || 1) * 0.9 }}
                                showNeedle={false}
                              />
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-600 font-poppins"><T k="cropDetails.noCycleData">No cycle data available for this crop in your region.</T></div>
            )}

            {/* Production Summary Gauges (speedometer with threshold as limit) */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-foreground font-poppins mb-3"><T k="cropDetails.regionalSummary">Regional Production Summary</T></div>
              {(() => {
                const cycleLimit = thresholds?.cycleMax || 1;
                const seasonLimit = thresholds?.seasonMax || 1;
                const stateLimit = thresholds?.stateMax || 1;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center">
                      <div className="text-xs text-muted-600 font-poppins mb-1"><T k="cropDetails.cycle">Cycle</T></div>
                      <SpeedometerGauge
                        done={regional.cycle.totalProduction}
                        total={cycleLimit}
                        size={180}
                        label={`${regional.cycle.totalProduction.toFixed(3)}${t('common.tonnesShort', 't')}`}
                        units={t('common.tonnesShort', 't')}
                        thresholds={{ warn: cycleLimit * 0.7, bad: cycleLimit * 0.9 }}
                        showNeedle={false}
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-xs text-muted-600 font-poppins mb-1"><T k="common.season">Season</T></div>
                      <SpeedometerGauge
                        done={regional.season.totalProduction}
                        total={seasonLimit}
                        size={180}
                        label={`${regional.season.totalProduction.toFixed(3)}${t('common.tonnesShort', 't')}`}
                        units={t('common.tonnesShort', 't')}
                        thresholds={{ warn: seasonLimit * 0.7, bad: seasonLimit * 0.9 }}
                        showNeedle={false}
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-xs text-muted-600 font-poppins mb-1"><T k="common.state">State</T></div>
                      <SpeedometerGauge
                        done={regional.state.totalProduction}
                        total={stateLimit}
                        size={180}
                        label={`${regional.state.totalProduction.toFixed(3)}${t('common.tonnesShort', 't')}`}
                        units={t('common.tonnesShort', 't')}
                        thresholds={{ warn: stateLimit * 0.7, bad: stateLimit * 0.9 }}
                        showNeedle={false}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right block: interactive map */}
          <div className="farm-card p-6">
            <div className="flex items-center space-x-2 mb-4">
              <i data-lucide="map" className="h-5 w-5 text-farm-green-600"></i>
              <h3 className="font-semibold text-foreground font-poppins"><T k="cropDetails.interactiveMap">Interactive Map</T></h3>
            </div>

            {/* Location Selection Dropdown */}
            <div className="mb-6 p-4 bg-soft-beige-50 rounded-lg border border-soft-beige-200">
              <div className="flex items-center space-x-2 mb-3">
                <i data-lucide="map-pin" className="h-4 w-4 text-farm-green-600"></i>
                <h4 className="font-medium text-foreground font-poppins"><T k="cropDetails.selectLocation">Select Location</T></h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* State Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-foreground font-poppins mb-2">
                    <T k="cropDetails.selectState">Select State</T>
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => handleStateChange(e.target.value)}
                    disabled={loadingLocations}
                    className="w-full px-3 py-2 border border-soft-beige-300 rounded-lg focus:ring-2 focus:ring-farm-green-500 focus:border-farm-green-500 font-poppins"
                  >
                    <option value="">
                      {loadingLocations ? t('cropDetails.loadingLocations') : t('cropDetails.selectState')}
                    </option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {translateLocationName(state, 'state')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-foreground font-poppins mb-2">
                    <T k="cropDetails.selectDistrict">Select District</T>
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    disabled={!selectedState || districts.length === 0}
                    className="w-full px-3 py-2 border border-soft-beige-300 rounded-lg focus:ring-2 focus:ring-farm-green-500 focus:border-farm-green-500 font-poppins disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!selectedState ? t('cropDetails.selectState') : districts.length === 0 ? t('cropDetails.noDistrictsAvailable') : t('cropDetails.selectDistrict')}
                    </option>
                    {districts.map((district) => (
                      <option key={district} value={district}>
                        {translateLocationName(district, 'district')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedState && selectedDistrict && (
                <div className="mt-3 p-2 bg-farm-green-50 rounded-lg border border-farm-green-200">
                  <div className="flex items-center space-x-2">
                    <i data-lucide="check-circle" className="h-4 w-4 text-farm-green-600"></i>
                    <span className="text-sm font-medium text-farm-green-800 font-poppins">
                      {t('cropDetails.viewingDataFor')}: {translateLocationName(selectedDistrict, 'district')}, {translateLocationName(selectedState, 'state')}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {coordinates && (
              <InteractiveMap
                coordinates={mapCoordinates}
                locationName={mapLocationName}
                cropName={cropName}
                showPopup={false}
                selectedLocationData={null}
              />
            )}
          </div>
        </div>

        {/* Rest of page: keep existing recommendation and estimation cards below */}
      </div>
    </div>
  );
};

export default CropDetails;
