/**
 * Unified Geolocation Service
 * This service reliably gets the user's location using the browser's Geolocation
 * API and uses a public service to get address details (reverse geocoding).
 * It includes a 5-minute cache to prevent excessive API calls.
 */
class LocationService {
    constructor() {
        this.cache = {
            location: null,
            timestamp: null,
            maxAge: 5 * 60 * 1000 // 5-minute cache
        };
    }

    /**
     * Main method to get the user's current location and address.
     * It checks the cache first before fetching fresh data.
     */
    async getCurrentLocation() {
        const cachedLocation = this.getCachedLocation();
        if (cachedLocation) {
            console.log('📦 Using cached location data.');
            return cachedLocation;
        }

        console.log('🛰️ Requesting fresh user location from browser...');
        // 1. Get high-accuracy coordinates from the browser.
        const coords = await this.getBrowserCoordinates();
        // 2. Convert coordinates to a readable address.
        const address = await this.reverseGeocode(coords);

        const locationData = {
            success: true,
            coordinates: { lat: coords.lat, lng: coords.lng },
            address: address
        };

        // 3. Cache the final result.
        this.cacheLocation(locationData);
        return locationData;
    }

    /**
     * Gets coordinates using the browser's Geolocation API via a Promise.
     */
    getBrowserCoordinates() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('Geolocation is not supported by your browser.'));
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    console.log(`✅ Browser geolocation successful: ${latitude}, ${longitude}`);
                    resolve({ lat: latitude, lng: longitude });
                },
                (error) => {
                    console.error('❌ Browser geolocation failed:', error.message);
                    reject(new Error(`Could not get device location: ${error.message}`));
                }, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
            );
        });
    }

    /**
     * Converts coordinates {lat, lng} into a human-readable address.
     * This function was missing, which caused the crash.
     */
    async reverseGeocode({ lat, lng }) {
        try {
            // Using a free, reliable reverse geocoding service.
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();

            if (data && data.address) {
                const address = {
                    district: data.address.county || data.address.city_district || data.address.city || '',
                    state: data.address.state || '',
                    country: data.address.country || '',
                };
                console.log(`✅ Reverse geocoding successful: ${address.district}, ${address.state}`);
                return address;
            }
            throw new Error('Could not parse address from geocoding response.');
        } catch (error) {
            console.error('❌ Reverse geocoding failed:', error);
            throw new Error('Failed to convert coordinates to address.');
        }
    }

    /**
     * Caches the location data to localStorage and memory.
     */
    cacheLocation(locationData) {
        const timestamp = Date.now();
        this.cache.location = locationData;
        this.cache.timestamp = timestamp;
        localStorage.setItem('locationData', JSON.stringify({ data: locationData, timestamp }));
    }

    /**
     * Retrieves valid location data from the cache if it's not expired.
     */
    getCachedLocation() {
        try {
            const cached = localStorage.getItem('locationData');
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < this.cache.maxAge) {
                return data;
            }
        } catch (e) {
            console.warn('Could not retrieve cached location:', e);
        }
        return null;
    }
}

// Export a single instance of the service for the whole app to use.
const locationService = new LocationService();
export default locationService;