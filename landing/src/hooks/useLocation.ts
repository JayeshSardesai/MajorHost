import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';

// Add the 'export' keyword here so other files can import this type
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

// Change from 'const useLocation =' to 'export const useLocation ='
export const useLocation = () => {
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
                            { latitude, longitude },
                            { headers: { Authorization: `Bearer ${token}` } }
                        );

                        setLocationData(response.data);
                    } catch (apiError) {
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
                    setError(geoError.message || 'Could not get device location.');
                    setLoading(false);
                }
            );
        };

        fetchLocation();
    }, []);

    return { locationData, error, loading };
};
