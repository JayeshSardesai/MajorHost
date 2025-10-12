import { useState, useEffect } from 'react';

// This interface should be exported if other files need it
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

                        // Using fetch to match the project's style
                        const response = await fetch(
                            `${import.meta.env.VITE_API_URL}/api/location`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ latitude, longitude })
                            }
                        );

                        if (!response.ok) {
                            // Try to get a specific error message from the backend
                            const errorData = await response.json();
                            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                        }

                        const data: LocationData = await response.json();
                        setLocationData(data);

                    } catch (apiError: any) {
                        setError(apiError.message || 'Could not fetch location details from the server.');
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