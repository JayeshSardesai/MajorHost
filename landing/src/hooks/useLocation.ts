// In landing/src/hooks/useLocation.ts

import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';

// Define a type for your location data for better type safety
interface LocationData {
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
    mapUrl: string;
    method: string;
    locationSource: string;
}

const useLocation = () => {
    // Explicitly type the state variables
    const [locationData, setLocationData] = useState<LocationData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchLocation = () => {
            if (!navigator.geolocation) {
                setError('Geolocation is not supported by your browser.');
                setLoading(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const token = localStorage.getItem('token');

                        const response = await axios.post<LocationData>(
                            `${import.meta.env.VITE_API_URL}/api/location`,
                            {
                                latitude: latitude,
                                longitude: longitude,
                            },
                            {
                                headers: { Authorization: `Bearer ${token}` },
                            }
                        );

                        setLocationData(response.data);
                    } catch (apiError) {
                        // Handle potential Axios errors to get a useful message
                        if (axios.isAxiosError(apiError)) {
                            const axiosError = apiError as AxiosError<{ error?: string }>;
                            const serverError = axiosError.response?.data?.error || 'An unknown server error occurred.';
                            setError(serverError);
                        } else {
                            setError('Could not fetch location details from the server.');
                        }
                        console.error('API Error:', apiError);
                    } finally {
                        setLoading(false);
                    }
                },
                (geoError) => {
                    // The geoError.message is a string, which now matches our state type
                    setError(geoError.message || 'Could not get device location.');
                    setLoading(false);
                }
            );
        };

        fetchLocation();
    }, []);

    return { locationData, error, loading };
};

export default useLocation;