import { useState, useEffect } from 'react';
import locationService from '../services/locationService.js'; // Import the main service
import { LocationData } from './types'; // Assuming you have a types file, or define it here

// It's good practice to have shared types. If you don't have a types file,
// you can copy the LocationData interface from the old file here.
export interface LocationData {
    success: boolean;
    coordinates: {
        lat: number;
        lng: number;
        accuracy: number;
    };
    address: {
        state: string;
        district: string;
    };
    mapUrl: string | null;
    method: string;
    locationSource: string;
}


export const useLocation = () => {
    const [locationData, setLocationData] = useState<LocationData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchLocation = async () => {
            try {
                // Now, this hook is just a simple wrapper around our robust, centralized service
                const data = await locationService.getCurrentLocationWithTimeout();
                setLocationData(data);
            } catch (err: any) {
                setError(err.message || 'An unknown error occurred while fetching location.');
            } finally {
                setLoading(false);
            }
        };

        fetchLocation();
    }, []); // Runs only once on component mount

    return { locationData, error, loading };
};