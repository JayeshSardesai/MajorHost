/**
 * Pure Geolocation Service
 * This service reliably gets the user's location using the browser's standard
 * Geolocation API and communicates with the backend to get address details.
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
     * Main method to get the user's current location.
     */
    async getCurrentLocation() {
        const cachedLocation = this.getCachedLocation();
        if (cachedLocation) {
            console.log('📦 Using cached location data.');
            return cachedLocation;
        }

        console.log('🛰️ Requesting fresh user location from browser...');
        const coords = await this.getBrowserCoordinates();
        const locationData = await this.getLocationDetailsFromBackend(coords.lat, coords.lng);
        this.cacheLocation(locationData);
        return locationData;
    }

    /**
     * Gets high-accuracy coordinates using the browser's Geolocation API.
     */
    getBrowserCoordinates() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('Geolocation is not supported by your browser.'));
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    console.log(`✅ Browser geolocation successful: ${latitude}, ${longitude}`);
                    resolve({ lat: latitude, lng: longitude, accuracy });
                },
                (error) => {
                    console.error('❌ Browser geolocation failed:', error.message);
                    reject(new Error(`Could not get device location: ${error.message}`));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Sends coordinates to the backend to get address details.
     */
    async getLocationDetailsFromBackend(latitude, longitude) {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await fetch(`${apiUrl}/api/location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || ''}`
                },
                body: JSON.stringify({ latitude, longitude })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Backend API failed: ${response.status}`);
            }
            const data = await response.json();
            console.log(`✅ Backend processed location: ${data.address.district}, ${data.address.state}`);
            return data;
        } catch (error) {
            console.error('❌ Failed to get location details from backend:', error.message);
            throw error;
        }
    }

    cacheLocation(locationData) {
        this.cache.location = locationData;
        this.cache.timestamp = Date.now();
        localStorage.setItem('locationCache', JSON.stringify({ data: locationData, timestamp: Date.now() }));
    }

    getCachedLocation() {
        try {
            const cached = localStorage.getItem('locationCache');
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < this.cache.maxAge) {
                this.cache.location = data;
                this.cache.timestamp = timestamp;
                return data;
            }
        } catch (e) {
            console.warn('Could not retrieve cached location:', e);
        }
        return null;
    }

    async getCurrentLocationWithTimeout(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('Geolocation is not supported by your browser.'));
            }

            const timer = setTimeout(() => {
                reject(new Error('Geolocation timeout'));
            }, timeout);

            // #### THE FIX: Use an arrow function here ####
            // This ensures `this` refers to the `locationService` object
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    clearTimeout(timer);
                    const { latitude, longitude } = position.coords;
                    try {
                        // Now `this.reverseGeocode` will be found correctly
                        const address = await this.reverseGeocode({ lat: latitude, lng: longitude });
                        resolve({
                            coordinates: { lat: latitude, lng: longitude },
                            address: address,
                        });
                    } catch (error) {
                        reject(error);
                    }
                },
                (error) => {
                    clearTimeout(timer);
                    reject(error);
                },
                { enableHighAccuracy: true, timeout, maximumAge: 0 }
            );
        });
    }

    async refreshLocation() {
        this.cache.location = null;
        localStorage.removeItem('locationCache');
        return await this.getCurrentLocationWithTimeout();
    }
}

const locationService = new LocationService();
export default locationService;