import React, { useEffect, useRef, useState } from 'react';

const InteractiveMap = ({ coordinates, locationName, cropName, showPopup, selectedLocationData }) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState('');

  // Store map instance reference
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Function to show popup for selected location
  const showLocationPopup = (locationData) => {
    if (!window.google || !window.google.maps || !mapRef.current || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    // Create marker for selected location
    const marker = new window.google.maps.Marker({
      position: { lat: locationData.coordinates.lat, lng: locationData.coordinates.lng },
      map: map,
      title: `${cropName ? cropName.toUpperCase() : 'Crop'} - ${locationData.locationName || 'Location'}`,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#22c55e" stroke="#ffffff" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">
              ${cropName ? cropName.charAt(0).toUpperCase() : 'C'}
            </text>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32)
      }
    });

    // Store marker reference
    markersRef.current.push(marker);

    // Create info window with location data
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 12px; font-family: 'Poppins', sans-serif; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; color: #22c55e; font-size: 14px; font-weight: 600;">
            ${cropName ? cropName.toUpperCase() : 'Crop Location'}
          </h3>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">
            📍 ${locationData.locationName || 'Selected Location'}
          </p>
          <p style="margin: 0; color: #9ca3af; font-size: 10px;">
            ${locationData.coordinates.lat.toFixed(4)}, ${locationData.coordinates.lng.toFixed(4)}
          </p>
        </div>
      `
    });

    // Open the info window
    infoWindow.open(map, marker);
  };

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!GOOGLE_KEY) {
        setError('Google Maps API key not found');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => setError('Failed to load Google Maps');
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current) return;

        try {
          // Use coordinates if available, otherwise try to get user's location
          let center = coordinates && coordinates.lat && coordinates.lng 
            ? { lat: coordinates.lat, lng: coordinates.lng }
            : { lat: 20.5937, lng: 78.9629 }; // Default India center

          // If no coordinates provided, try to get user's current location
          if (!coordinates || !coordinates.lat || !coordinates.lng) {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  center = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  };
                  // Update map center to user's location
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setCenter(center);
                    mapInstanceRef.current.setZoom(12);
                  }
                },
                (error) => {
                  console.log('Geolocation error:', error);
                  // Keep default center if geolocation fails
                }
              );
            }
          }

          console.log('🗺️ Map coordinates received:', coordinates);
          console.log('🗺️ Map center being used:', center);

        const map = new window.google.maps.Map(mapRef.current, {
          zoom: coordinates && coordinates.lat && coordinates.lng ? 12 : 6,
          center: center,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          clickableIcons: false,
          disableDefaultUI: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Store map instance reference
        mapInstanceRef.current = map;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Add marker for the location
        const marker = new window.google.maps.Marker({
          position: center,
          map: map,
          title: `${cropName ? cropName.toUpperCase() : 'Crop'} - ${locationName || 'Location'}`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#22c55e" stroke="#ffffff" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">
                  ${cropName ? cropName.charAt(0).toUpperCase() : 'C'}
                </text>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 32)
          }
        });

        // Store marker reference
        markersRef.current.push(marker);

        // Add info window for current location
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: 'Poppins', sans-serif;">
              <h3 style="margin: 0 0 8px 0; color: #22c55e; font-size: 14px; font-weight: 600;">
                ${cropName ? cropName.toUpperCase() : 'Crop Location'}
              </h3>
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                📍 ${locationName || 'Location'}
              </p>
              ${coordinates && coordinates.lat && coordinates.lng ? `
                <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 10px;">
                  ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}
                </p>
              ` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        // Add click listener for map to show region data
        const mapClickHandler = async (event) => {
          const clickedLat = event.latLng.lat();
          const clickedLng = event.latLng.lng();
          
          console.log(`🗺️ Map clicked at: ${clickedLat}, ${clickedLng}`);
          
          // Show loading indicator
          const loadingInfoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; font-family: 'Poppins', sans-serif; text-align: center;">
                <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #22c55e; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 12px;">Loading region data...</p>
                <style>
                  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
              </div>
            `,
            position: { lat: clickedLat, lng: clickedLng }
          });
          
          loadingInfoWindow.open(map);
          
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/region-data/${clickedLat}/${clickedLng}/${encodeURIComponent(cropName)}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            loadingInfoWindow.close();
            
            if (response.ok) {
              const regionData = await response.json();
              console.log('🗺️ Region data received:', regionData);
              
              // Create popup content for clicked location data
              const isAboveThreshold = regionData.production.actual >= regionData.production.threshold;
              const opportunityColor = isAboveThreshold ? '#ef4444' : '#22c55e';
              const opportunityBg = isAboveThreshold ? '#fef2f2' : '#f0fdf4';
              
              const regionInfoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style="padding: 6px; font-family: 'Poppins', sans-serif; max-width: 200px;">
                    <h3 style="margin: 0 0 6px 0; color: #1f2937; font-size: 12px; font-weight: 700; border-bottom: 1px solid #22c55e; padding-bottom: 3px; text-transform: capitalize;">
                      🌾 ${regionData.crop}
                    </h3>
                    <div style="margin-bottom: 6px; padding: 4px; background: #f8fafc; border-radius: 3px;">
                      <p style="margin: 0; color: #374151; font-size: 10px; font-weight: 600;">
                        📍 ${regionData.location.specificLocation || regionData.location.district}, ${regionData.location.state}
                      </p>
                      <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 9px;">
                        🗓️ ${regionData.season} | 🔄 Cycle ${regionData.cycle}
                      </p>
                    </div>
                    <div style="margin: 4px 0; padding: 6px; border-left: 2px solid ${opportunityColor}; background: ${opportunityBg}; border-radius: 3px;">
                      <div style="font-size: 10px; color: #374151; margin-bottom: 3px; font-weight: 600;">
                        🌾 Production: ${regionData.production.actual.toFixed(2)} tonnes
                      </div>
                      <div style="font-size: 10px; color: #374151; margin-bottom: 3px; font-weight: 600;">
                        📊 Threshold: ${regionData.production.max > 0 ? regionData.production.max.toFixed(2) + ' tonnes' : 'No data'}
                      </div>
                      <div style="font-size: 9px; color: #6b7280;">
                        👨‍🌾 Farmers: ${regionData.farmers.count}
                      </div>
                    </div>
                  </div>
                `,
                position: { lat: clickedLat, lng: clickedLng }
              });

              // Close any existing info windows
              infoWindow.close();
              
              // Open region info window
              regionInfoWindow.open(map);
              
              console.log('✅ Region data popup displayed');
            } else {
              console.error('❌ Failed to fetch region data:', response.statusText);
              
              // Show error popup
              const errorInfoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style="padding: 12px; font-family: 'Poppins', sans-serif; text-align: center;">
                    <p style="margin: 0; color: #dc2626; font-size: 12px;">❌ Failed to load region data</p>
                    <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 10px;">Please try clicking another location</p>
                  </div>
                `,
                position: { lat: clickedLat, lng: clickedLng }
              });
              errorInfoWindow.open(map);
            }
          } catch (error) {
            loadingInfoWindow.close();
            console.error('❌ Error fetching region data:', error);
            
            // Show error popup
            const errorInfoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 12px; font-family: 'Poppins', sans-serif; text-align: center;">
                  <p style="margin: 0; color: #dc2626; font-size: 12px;">❌ Error loading region data</p>
                  <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 10px;">Please try again</p>
                </div>
              `,
              position: { lat: clickedLat, lng: clickedLng }
            });
            errorInfoWindow.open(map);
          }
        };

        // Add the click listener with proper event handling
        map.addListener('click', mapClickHandler);
        
        // Ensure map is interactive
        map.setOptions({
          draggable: true,
          zoomControl: true,
          scrollwheel: true,
          disableDoubleClickZoom: false
        });

        setMapLoaded(true);
        console.log('🗺️ Interactive map loaded successfully');
      } catch (err) {
        console.error('❌ Failed to initialize map:', err);
        setError('Failed to initialize map');
      }
    };

    loadGoogleMaps();
  }, [coordinates, locationName, cropName]);

  // Effect to show popup when location is selected from dropdown
  useEffect(() => {
    if (showPopup && selectedLocationData && window.google && window.google.maps && mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      
      // Update map center to selected location
      map.setCenter({
        lat: selectedLocationData.coordinates.lat,
        lng: selectedLocationData.coordinates.lng
      });
      map.setZoom(12);
      
      // Show popup for selected location
      showLocationPopup(selectedLocationData);
    }
  }, [showPopup, selectedLocationData]);

  if (error) {
    return (
      <div className="h-72 bg-soft-beige-100 rounded border border-soft-beige-200 overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <i data-lucide="map-off" className="h-10 w-10 text-red-400 mx-auto mb-2"></i>
          <p className="text-sm text-red-600 font-poppins">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-80 bg-soft-beige-100 rounded border border-soft-beige-200 overflow-hidden relative">
      <div ref={mapRef} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-soft-beige-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green-500 mx-auto mb-2"></div>
            <p className="text-sm text-muted-600 font-poppins">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
