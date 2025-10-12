import React from 'react';

// This component is now a simple, reliable static map viewer.
const OptimizedMap = ({ coordinates }) => {

  // 1. If the Dashboard is still fetching the location, show a loading state.
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

  // 2. Get the API Key from your environment variables.
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    return <p className="text-red-500 p-4">Error: Google Maps API Key is missing.</p>;
  }

  // 3. Build the static map URL, exactly like in CropDetails.jsx.
  const { lat, lng } = coordinates;
  const base = 'https://maps.googleapis.com/maps/api/staticmap';
  const center = `${lat},${lng}`;
  const zoom = 12;
  const size = '600x300'; // Using a standard size for the map image
  const marker = `markers=color:blue%7Clabel:U%7C${center}`; // "U" for "You"

  const mapUrl = `${base}?center=${center}&zoom=${zoom}&size=${size}&maptype=roadmap&${marker}&key=${GOOGLE_MAPS_API_KEY}`;

  console.log('✅ OptimizedMap received coordinates. Rendering static map.');

  // 4. Render the map image.
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-soft-beige-200 bg-gray-100">
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