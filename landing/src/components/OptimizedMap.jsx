import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from '../hooks/useLocation';

const OptimizedMap = ({ predictions = [], showCropInfo = true }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [staticMapUrl, setStaticMapUrl] = useState('');

  // Use the same location service as other components
  const { location, loading: locationLoading, error: locationError } = useLocation({
    autoFetch: true,
    timeout: 10000
  });

  // Load Google Maps script efficiently
  useEffect(() => {
    const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_KEY) {
      setMapError('No Google Maps API key');
      return;
    }

    // Check if already loaded
    if (window.google && window.google.maps) {
      setMapReady(true);
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setMapReady(true));
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&loading=async`;
    script.async = true;
    script.onload = () => setMapReady(true);
    script.onerror = () => setMapError('Failed to load Google Maps');
    document.head.appendChild(script);
  }, []);

  // Generate static map immediately when location is available
  useEffect(() => {
    if (!location || !location.lat || !location.lng) return;

    const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_KEY) return;

    const { lat, lng, address } = location;
    const base = 'https://maps.googleapis.com/maps/api/staticmap';
    const size = '640x320';
    const marker = `markers=color:0x10b981%7Csize:mid%7C${lat},${lng}`;
    const url = `${base}?center=${lat},${lng}&zoom=12&size=${size}&${marker}&maptype=roadmap&style=feature:poi%7Celement:labels%7Cvisibility:off&key=${GOOGLE_KEY}`;
    
    setStaticMapUrl(url);
    console.log('🗺️ Static map ready for', address?.district || 'Unknown', address?.state || 'Unknown');
  }, [location]);

  // Initialize interactive map when ready
  useEffect(() => {
    if (!mapReady || !location || !mapRef.current) return;

    const { lat, lng, address } = location;
    
    try {
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'cooperative',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });
      }

      // Clear existing markers
      if (window.mapMarkers) {
        window.mapMarkers.forEach(marker => marker.setMap(null));
      }
      window.mapMarkers = [];

      // Add location marker
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: `${address?.district || 'Location'}, ${address?.state || ''}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#10b981" stroke="#065f46" stroke-width="2"/>
              <circle cx="16" cy="16" r="4" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });
      window.mapMarkers.push(marker);

      // Add crop info popup if enabled and predictions available
      if (showCropInfo && predictions && predictions.length > 0) {
        const popupContent = `
          <div style="min-width:220px;font-family:system-ui,-apple-system,sans-serif;padding:4px;">
            <div style="font-weight:600;margin-bottom:8px;color:#065f46;font-size:14px;">
              📍 ${address?.district || 'Current Location'}${address?.state ? `, ${address.state}` : ''}
            </div>
            <div style="font-weight:500;margin-bottom:6px;color:#374151;font-size:13px;">Recommended Crops:</div>
            ${predictions.slice(0, 3).map((p, i) => `
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;padding:2px 0;">
                <span style="color:#1f2937;">${i + 1}. ${(p.crop || '').toUpperCase()}</span>
                <span style="color:#10b981;font-weight:600;">${p.probability}%</span>
              </div>
            `).join('')}
            ${predictions.length > 3 ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">+${predictions.length - 3} more crops</div>` : ''}
          </div>
        `;
        
        const infoWindow = new window.google.maps.InfoWindow({ content: popupContent });
        marker.addListener('click', () => infoWindow.open(mapInstanceRef.current, marker));
      }

      console.log('✅ Interactive map initialized with location data');
    } catch (error) {
      console.error('❌ Interactive map failed:', error);
      setMapError('Interactive map failed');
    }
  }, [mapReady, location, predictions, showCropInfo]);

  // Loading state - always show something to prevent blank space
  if (locationLoading && !staticMapUrl) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Getting location...</p>
        </div>
      </div>
    );
  }

  // Error state - only show if no static map is available
  if (locationError && !staticMapUrl && !location) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">📍</div>
          <p className="text-sm text-gray-600">Location unavailable</p>
          <p className="text-xs text-gray-500">{locationError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden relative bg-gray-100">
      {/* Static map loads immediately */}
      {staticMapUrl && (
        <img
          src={staticMapUrl}
          alt="Location Map"
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            mapReady && !mapError ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
        />
      )}
      
      {/* Interactive map overlays when ready */}
      {!mapError && (
        <div
          ref={mapRef}
          className={`absolute inset-0 transition-opacity duration-300 ${
            mapReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      
      {/* Location info overlay */}
      {location && location.address && (
        <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs font-medium text-gray-700 shadow-sm">
          📍 {location.address.district}{location.address.state ? `, ${location.address.state}` : ''}
        </div>
      )}
      
      {/* Source info */}
      {location && location.locationSource && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 rounded px-2 py-1 text-xs text-white">
          {location.locationSource}
        </div>
      )}
    </div>
  );
};

export default OptimizedMap;
