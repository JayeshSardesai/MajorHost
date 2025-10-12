import React, { useEffect, useRef, useState } from 'react';

// This component now uses the interactive Maps JavaScript API
const OptimizedMap = ({ coordinates }) => {
  const mapRef = useRef(null); // A reference to the div where the map will be rendered
  const [map, setMap] = useState(null); // State to hold the map instance
  const [marker, setMarker] = useState(null); // State to hold the marker instance

  // This effect handles loading the Google Maps script
  useEffect(() => {
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Error: Google Maps API Key is missing.");
      return;
    }

    // Check if the script is already loaded
    if (window.google && window.google.maps) {
      return; // Already loaded
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // This effect initializes the map and updates it when coordinates change
  useEffect(() => {
    // Wait until the Google Maps script is loaded and we have coordinates
    if (window.google && window.google.maps && coordinates) {

      const center = { lat: coordinates.lat, lng: coordinates.lng };

      // If the map hasn't been created yet, create it
      if (!map && mapRef.current) {
        const newMap = new window.google.maps.Map(mapRef.current, {
          center: center,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
        });
        setMap(newMap);

        const newMarker = new window.google.maps.Marker({
          position: center,
          map: newMap,
          title: "Your Location"
        });
        setMarker(newMarker);

        console.log('✅ Interactive map created.');
      }
      // If the map already exists, just update its center and marker position
      else if (map) {
        map.panTo(center);
        if (marker) {
          marker.setPosition(center);
        }
        console.log('✅ Interactive map updated with new coordinates.');
      }
    }
  }, [coordinates, map, marker]); // Rerun this effect if these values change

  // Loading state while waiting for coordinates from the Dashboard
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

  // Render the div that the Google Map will attach to
  return (
    <div
      ref={mapRef}
      className="w-full h-64 rounded-lg border border-soft-beige-200"
      aria-label="Map showing your current location"
    />
  );
};

export default OptimizedMap;