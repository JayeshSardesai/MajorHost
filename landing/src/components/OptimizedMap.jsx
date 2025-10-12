import React, { useEffect, useRef, useState } from 'react';

// This component now renders a fully interactive Google Map.
const OptimizedMap = ({ coordinates, predictions = [] }) => {
  const mapRef = useRef(null); // Reference to the div where the map will be rendered
  const [map, setMap] = useState(null); // State to hold the map instance
  const [marker, setMarker] = useState(null); // State to hold the marker instance
  const [infoWindow, setInfoWindow] = useState(null); // State for the popup window
  const [isScriptLoaded, setIsScriptLoaded] = useState(false); // State to track script loading

  // Effect to load the Google Maps script
  useEffect(() => {
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Error: Google Maps API Key is missing.");
      return;
    }

    if (window.google && window.google.maps) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      console.error("Error: Failed to load Google Maps script.");
    }
    document.head.appendChild(script);
  }, []);

  // Effect to initialize and update the map
  useEffect(() => {
    // Wait until the script is loaded and we have coordinates from the Dashboard
    if (isScriptLoaded && coordinates) {

      const center = { lat: coordinates.lat, lng: coordinates.lng };

      // Create the map instance if it doesn't exist yet
      if (!map && mapRef.current) {
        const newMap = new window.google.maps.Map(mapRef.current, {
          center: center,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          gestureHandling: 'cooperative' // Allows zooming and panning
        });
        setMap(newMap);

        const newMarker = new window.google.maps.Marker({
          position: center,
          map: newMap,
          title: "Your Location"
        });
        setMarker(newMarker);

        const newInfoWindow = new window.google.maps.InfoWindow();
        setInfoWindow(newInfoWindow);

        console.log('✅ Dashboard: Interactive map created.');
      }
      // If the map and marker already exist, just update their positions
      else if (map) {
        map.panTo(center);
        if (marker) {
          marker.setPosition(center);
        }
      }
    }
  }, [isScriptLoaded, coordinates, map, marker]);

  // Effect to handle the popup window for crop predictions
  useEffect(() => {
    if (map && marker && infoWindow && predictions.length > 0) {
      const popupContent = `
         <div style="font-family: Inter, sans-serif; padding: 4px; max-width: 250px;">
           <div style="font-weight: 600; font-size: 14px; color: #065f46; margin-bottom: 8px;">Top Crop Suggestions</div>
           ${predictions.slice(0, 5).map(p => `
             <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
               <span>${p.crop}</span>
               <span style="font-weight: 500; color: #10b981;">${p.probability}%</span>
             </div>
           `).join('')}
         </div>`;

      infoWindow.setContent(popupContent);

      // Clear previous listeners to avoid memory leaks
      window.google.maps.event.clearInstanceListeners(marker);

      // Add a click listener to the marker to open the popup
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    }
  }, [map, marker, infoWindow, predictions]);


  // Show a loading state while waiting for coordinates from the Dashboard
  if (!coordinates) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 font-poppins">Waiting for location...</p>
        </div>
      </div>
    );
  }

  // Render the div that the Google Map will attach to. This is where the magic happens.
  return (
    <div
      ref={mapRef}
      className="w-full h-64 rounded-lg border border-soft-beige-200"
      aria-label="Interactive map showing your current location"
    />
  );
};

export default OptimizedMap;