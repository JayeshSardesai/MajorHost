/**
 * Location utility functions for Wi-Fi triangulation and geolocation
 */

/**
 * Check if the browser supports geolocation
 */
export const isGeolocationSupported = () => {
    return 'geolocation' in navigator;
};

/**
 * Check if the browser supports Wi-Fi scanning (experimental)
 */
export const isWiFiScanningSupported = () => {
    return 'wifi' in navigator || 'RTCPeerConnection' in window;
};

/**
 * Get device location capabilities
 */
export const getLocationCapabilities = () => {
    return {
        geolocation: isGeolocationSupported(),
        wifiScanning: isWiFiScanningSupported(),
        webRTC: 'RTCPeerConnection' in window,
        permissions: 'permissions' in navigator
    };
};

/**
 * Request location permissions
 */
export const requestLocationPermission = async () => {
    if (!('permissions' in navigator)) {
        return { state: 'unknown' };
    }

    try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission;
    } catch (error) {
        console.warn('Failed to query location permission:', error);
        return { state: 'unknown' };
    }
};

/**
 * Format location data for display
 */
export const formatLocation = (location) => {
    if (!location) return 'Location unavailable';
    
    const { address, lat, lng, accuracy, locationSource } = location;
    const { district, state } = address || {};
    
    let displayText = '';
    if (district && state) {
        displayText = `${district}, ${state}`;
    } else if (state) {
        displayText = state;
    } else if (district) {
        displayText = district;
    } else {
        displayText = `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`;
    }
    
    return {
        display: displayText,
        coordinates: `${lat?.toFixed(6)}, ${lng?.toFixed(6)}`,
        accuracy: accuracy ? `±${Math.round(accuracy)}m` : 'Unknown',
        source: locationSource || 'Unknown'
    };
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
};

/**
 * Check if location is within a certain radius
 */
export const isLocationWithinRadius = (location1, location2, radiusKm) => {
    if (!location1 || !location2) return false;
    const distance = calculateDistance(
        location1.lat, location1.lng,
        location2.lat, location2.lng
    );
    return distance <= radiusKm;
};

/**
 * Validate location data
 */
export const validateLocation = (location) => {
    if (!location) return false;
    
    const { lat, lng } = location;
    
    // Check if coordinates are valid
    if (typeof lat !== 'number' || typeof lng !== 'number') return false;
    if (isNaN(lat) || isNaN(lng)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    
    return true;
};

/**
 * Create a location cache key
 */
export const createLocationCacheKey = (prefix = 'location') => {
    return `${prefix}_${Date.now()}`;
};

/**
 * Get location error message
 */
export const getLocationErrorMessage = (error) => {
    if (!error) return 'Unknown location error';
    
    if (typeof error === 'string') return error;
    
    switch (error.code) {
        case 1:
            return 'Location access denied. Please enable location permissions.';
        case 2:
            return 'Location unavailable. Please check your connection.';
        case 3:
            return 'Location request timeout. Please try again.';
        default:
            return error.message || 'Failed to get location';
    }
};

/**
 * Convert coordinates to different formats
 */
export const convertCoordinates = (lat, lng, format = 'decimal') => {
    switch (format) {
        case 'decimal':
            return { lat: parseFloat(lat), lng: parseFloat(lng) };
        case 'dms': // Degrees, Minutes, Seconds
            const latDMS = convertToDMS(lat, 'lat');
            const lngDMS = convertToDMS(lng, 'lng');
            return { lat: latDMS, lng: lngDMS };
        case 'string':
            return `${lat}, ${lng}`;
        default:
            return { lat, lng };
    }
};

/**
 * Convert decimal degrees to DMS format
 */
const convertToDMS = (decimal, type) => {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60 * 100) / 100;
    
    const direction = type === 'lat' 
        ? (decimal >= 0 ? 'N' : 'S')
        : (decimal >= 0 ? 'E' : 'W');
    
    return `${degrees}°${minutes}'${seconds}"${direction}`;
};

export default {
    isGeolocationSupported,
    isWiFiScanningSupported,
    getLocationCapabilities,
    requestLocationPermission,
    formatLocation,
    calculateDistance,
    isLocationWithinRadius,
    validateLocation,
    createLocationCacheKey,
    getLocationErrorMessage,
    convertCoordinates
};
