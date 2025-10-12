import React from 'react';

const OptimizedMap = ({ coordinates }) => {
  // If the Dashboard has not passed the coordinates yet, display the loading state.
  if (!coordinates || !coordinates.lat || !coordinates.lng) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 font-poppins">Waiting for location...</p>
        </div>
      </div>
    );
  }

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    return <p className="text-red-500">Error: Google Maps API Key is missing.</p>;
  }

  // Once coordinates are received, build and display the map.
  const { lat, lng } = coordinates;
  const center = `${lat},${lng}`;
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=12&size=600x300&maptype=roadmap&markers=color:blue%7Clabel:U%7C${center}&key=${GOOGLE_MAPS_API_KEY}`;

  console.log('✅ OptimizedMap received coordinates. Rendering map.');

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-soft-beige-200">
      <img
        src={mapUrl}
        alt="Map showing your current location"
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
};

export default OptimizedMap;