import { useState, useEffect, useCallback } from 'react';
import locationService from '../services/locationService';

export interface LocationData {
    lat: number;
    lng: number;
    accuracy?: number;
    method?: string;
    locationSource?: string;
    address?: {
        state?: string;
        district?: string;
    };
    mapUrl?: string;
}

export interface UseLocationOptions {
    autoFetch?: boolean;
    timeout?: number;
    enableCache?: boolean;
}

export interface UseLocationReturn {
    location: LocationData | null;
    loading: boolean;
    error: string | null;
    fetchLocation: (forceRefresh?: boolean) => Promise<LocationData>;
    refreshLocation: () => Promise<LocationData>;
    isLocationAvailable: boolean;
    coordinates: { lat: number; lng: number } | null;
    address: { state?: string; district?: string } | null;
    locationSource: string | null;
}

/**
 * React hook for location detection with Wi-Fi triangulation + GPS fallback
 */
export const useLocation = (options: UseLocationOptions = {}): UseLocationReturn => {
    const {
        autoFetch = true,
        timeout = 15000,
        enableCache = true
    } = options;

    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLocation = useCallback(async (forceRefresh = false): Promise<LocationData> => {
        try {
            setLoading(true);
            setError(null);

            let locationData: LocationData;
            if (forceRefresh) {
                locationData = await locationService.refreshLocation();
            } else {
                locationData = await locationService.getCurrentLocationWithTimeout(timeout);
            }

            setLocation(locationData);
            return locationData;
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to get location';
            setError(errorMessage);
            console.error('useLocation error:', errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [timeout]);

    const refreshLocation = useCallback((): Promise<LocationData> => {
        return fetchLocation(true);
    }, [fetchLocation]);

    useEffect(() => {
        if (autoFetch) {
            fetchLocation();
        }
    }, [autoFetch, fetchLocation]);

    return {
        location,
        loading,
        error,
        fetchLocation,
        refreshLocation,
        isLocationAvailable: !!location,
        coordinates: location ? { lat: location.lat, lng: location.lng } : null,
        address: location?.address || null,
        locationSource: location?.locationSource || null
    };
};

export default useLocation;
