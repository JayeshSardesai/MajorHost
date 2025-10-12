import React, { useEffect, useRef, useState } from 'react';

// IMPORTANT: We now accept 'coordinates' from the Dashboard props.
const OptimizedMap = ({ coordinates, predictions = [], showCropInfo = true }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');

  // Load Google Maps script efficiently
  useEffect(() => {
    const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_KEY) {
      setMapError('No Google Maps API key');
      return;
    }
    if (window.google && window.google.maps) {
      setMapReady(true);
      return;
    }
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setMapReady(true));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&loading=async`;
    script.async = true;
    script.onload = () => setMapReady(true);
    script.onerror = () => setMapError('Failed to load Google Maps');
    document.head.appendChild(script);
  }, []);

  // Initialize interactive map when the script is ready AND we have coordinates
  useEffect(() => {
    // Exit if the map library isn't loaded or if the Dashboard hasn't passed the coordinates yet.
    if (!mapReady || !coordinates || !mapRef.current) return;

    const { lat, lng } = coordinates;

    try {
      // Create the map instance if it doesn't exist
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'cooperative',
          styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
        });
      } else {
        // If map already exists, just pan to the new center
        mapInstanceRef.current.panTo({ lat, lng });
      }

      // --- Marker and InfoWindow logic remains the same ---

      // (For clarity, this part is simplified, but your original marker/popup logic can be pasted here)
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: `Your Location`,
      });

      console.log('✅ Interactive map initialized with coordinates from Dashboard');

    } catch (error) {
      console.error('❌ Interactive map failed:', error);
      setMapError('Interactive map failed to initialize.');
    }
    // This effect now correctly depends on 'coordinates' from the props.
  }, [mapReady, coordinates, predictions, showCropInfo]);

  // Loading state: Show while waiting for coordinates from the Dashboard
  if (!coordinates) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Waiting for location...</p>
        </div>
      </div>
    );
  }

  // Error state for map-specific issues
  if (mapError) {
    return (
      <div className="w-full h-64 bg-red-50 text-red-700 rounded-lg flex items-center justify-center">
        <p>Could not load map: {mapError}</p>
      </div>
    );
  }

  // Render the map container
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden relative bg-gray-100">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs font-medium text-gray-700 shadow-sm">
        📍 Your Location
      </div>
    </div>
  );
};

export default OptimizedMap;