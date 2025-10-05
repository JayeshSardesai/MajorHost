/**
 * Enhanced Location Service with Wi-Fi Triangulation + GPS Fallback
 * Prioritizes Wi-Fi triangulation for accuracy, falls back to GPS/browser geolocation
 */

class LocationService {
    constructor() {
        this.cache = {
            location: null,
            timestamp: null,
            maxAge: 5 * 60 * 1000 // 5 minutes cache
        };
    }

    /**
     * Get cached location if still valid
     */
    getCachedLocation() {
        if (this.cache.location && this.cache.timestamp) {
            const age = Date.now() - this.cache.timestamp;
            if (age < this.cache.maxAge) {
                console.log('📦 Using cached location data');
                return this.cache.location;
            }
        }
        return null;
    }

    /**
     * Cache location data
     */
    cacheLocation(locationData) {
        this.cache.location = locationData;
        this.cache.timestamp = Date.now();

        // Also store in localStorage for persistence
        try {
            localStorage.setItem('locationCache', JSON.stringify({
                data: locationData,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Failed to cache location in localStorage:', e);
        }
    }

    /**
     * Load cached location from localStorage
     */
    loadCachedLocation() {
        try {
            const cached = localStorage.getItem('locationCache');
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                if (age < this.cache.maxAge) {
                    this.cache.location = data;
                    this.cache.timestamp = timestamp;
                    return data;
                }
            }
        } catch (e) {
            console.warn('Failed to load cached location:', e);
        }
        return null;
    }

    /**
     * Scan Wi-Fi networks using Web APIs (if available)
     * Note: This requires HTTPS and user permission
     */
    async scanWiFiNetworks() {
        try {
            console.log('📡 Attempting to scan Wi-Fi networks...');

            // Check if navigator.wifi is available (experimental API)
            if ('wifi' in navigator) {
                const networks = await navigator.wifi.getNetworks();
                const wifiAccessPoints = networks
                    .filter(network => network.bssid && network.signalStrength)
                    .map(network => ({
                        macAddress: network.bssid,
                        signalStrength: network.signalStrength,
                        channel: network.channel || 0
                    }));

                console.log(`📡 Found ${wifiAccessPoints.length} Wi-Fi networks via Web API`);
                return wifiAccessPoints;
            }

            // Alternative: Try to get network info via WebRTC (limited)
            if ('RTCPeerConnection' in window) {
                return await this.getNetworkInfoViaWebRTC();
            }

            console.log('⚠️ Wi-Fi scanning not available in browser');
            return [];
        } catch (error) {
            console.warn('⚠️ Wi-Fi scanning failed:', error.message);
            return [];
        }
    }

    /**
     * Get network information via WebRTC (limited but works in most browsers)
     */
    async getNetworkInfoViaWebRTC() {
        return new Promise((resolve) => {
            try {
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                const networkInfo = [];

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        const candidate = event.candidate.candidate;
                        // Extract network information from ICE candidates
                        if (candidate.includes('typ host')) {
                            const match = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                            if (match) {
                                networkInfo.push({
                                    type: 'local_ip',
                                    address: match[1]
                                });
                            }
                        }
                    } else {
                        // ICE gathering complete
                        resolve(networkInfo);
                    }
                };

                // Create a data channel to trigger ICE gathering
                pc.createDataChannel('location');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));

                // Timeout after 3 seconds
                setTimeout(() => resolve(networkInfo), 3000);
            } catch (error) {
                console.warn('WebRTC network info failed:', error);
                resolve([]);
            }
        });
    }

    /**
     * Get location using browser's geolocation API (GPS fallback)
     */
    async getBrowserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            console.log('🛰️ Using browser geolocation (GPS)...');

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    console.log(`📍 Browser geolocation successful: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);
                    resolve({
                        lat: latitude,
                        lng: longitude,
                        accuracy: accuracy,
                        method: 'browser-gps'
                    });
                },
                (error) => {
                    console.error('❌ Browser geolocation failed:', error.message);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Get location using backend Wi-Fi triangulation
     */
    async getLocationViaBackend(wifiData = null) {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            let url = `${apiUrl}/api/location`;
            let method = 'GET';
            let body = null;

            // If we have Wi-Fi data, send it via POST
            if (wifiData && wifiData.length > 0) {
                method = 'POST';
                body = JSON.stringify({ wifiAccessPoints: wifiData });
                console.log(`📡 Sending ${wifiData.length} Wi-Fi networks to backend`);
            } else {
                console.log('🔄 Requesting backend location detection');
            }

            const response = await fetch(url, {
                method,
                headers,
                body
            });

            if (!response.ok) {
                throw new Error(`Backend location API failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.coordinates) {
                console.log(`✅ Backend location successful via ${data.locationSource}`);
                return {
                    ...data.coordinates,
                    address: data.address,
                    mapUrl: data.mapUrl,
                    method: data.method,
                    locationSource: data.locationSource
                };
            } else {
                throw new Error('Invalid response from backend location API');
            }
        } catch (error) {
            console.error('❌ Backend location failed:', error.message);
            throw error;
        }
    }

    /**
     * Main method to get location with Wi-Fi triangulation + GPS fallback
     */
    async getCurrentLocation() {
        try {
            // Step 1: Check cache first
            const cached = this.getCachedLocation() || this.loadCachedLocation();
            if (cached) {
                return cached;
            }

            console.log('🔄 Starting enhanced location detection...');
            let locationResult = null;

            // Step 2: Try Wi-Fi triangulation
            try {
                console.log('🔄 Step 1: Attempting Wi-Fi triangulation...');
                const wifiNetworks = await this.scanWiFiNetworks();

                if (wifiNetworks.length > 0) {
                    // Send Wi-Fi data to backend for triangulation
                    locationResult = await this.getLocationViaBackend(wifiNetworks);
                } else {
                    // No Wi-Fi data available, let backend try server-side scanning
                    console.log('🔄 No client-side Wi-Fi data, trying backend Wi-Fi scan...');
                    locationResult = await this.getLocationViaBackend();
                }
            } catch (wifiError) {
                console.warn('⚠️ Wi-Fi triangulation failed:', wifiError.message);
            }

            // Step 3: If Wi-Fi triangulation failed, use browser GPS
            if (!locationResult) {
                try {
                    console.log('🔄 Step 2: Wi-Fi failed, using browser GPS fallback...');
                    const browserLocation = await this.getBrowserLocation();
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

                    // Get address information from backend using GPS coordinates
                    try {
                        const addressResponse = await fetch(`${apiUrl}/api/location`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                            },
                            body: JSON.stringify({
                                coordinates: {
                                    lat: browserLocation.lat,
                                    lng: browserLocation.lng
                                }
                            })
                        });

                        if (addressResponse.ok) {
                            const addressData = await addressResponse.json();
                            locationResult = {
                                ...browserLocation,
                                address: addressData.address,
                                mapUrl: addressData.mapUrl,
                                locationSource: 'Browser GPS + Backend Geocoding'
                            };
                        } else {
                            locationResult = {
                                ...browserLocation,
                                address: { state: 'Unknown', district: 'Unknown' },
                                locationSource: 'Browser GPS Only'
                            };
                        }
                    } catch (geocodeError) {
                        console.warn('⚠️ Address lookup failed:', geocodeError.message);
                        locationResult = {
                            ...browserLocation,
                            address: { state: 'Unknown', district: 'Unknown' },
                            locationSource: 'Browser GPS Only'
                        };
                    }
                } catch (gpsError) {
                    console.error('❌ Browser GPS also failed:', gpsError.message);
                }
            }

            // Step 4: If all methods failed
            if (!locationResult) {
                throw new Error('All location detection methods failed');
            }

            // Cache the successful result
            this.cacheLocation(locationResult);

            console.log(`✅ Location detection successful via ${locationResult.locationSource}`);
            return locationResult;

        } catch (error) {
            console.error('❌ Location detection completely failed:', error.message);
            throw error;
        }
    }

    /**
     * Force refresh location (bypass cache)
     */
    async refreshLocation() {
        this.cache.location = null;
        this.cache.timestamp = null;
        localStorage.removeItem('locationCache');
        return await this.getCurrentLocation();
    }

    /**
     * Get location with timeout
     */
    async getCurrentLocationWithTimeout(timeoutMs = 15000) {
        return Promise.race([
            this.getCurrentLocation(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Location detection timeout')), timeoutMs)
            )
        ]);
    }
}

// Export singleton instance
const locationService = new LocationService();
export default locationService;
