import React, { useState, useEffect } from "react";
import { useLocation, type LocationData } from "../hooks/useLocation";
import T from './T';
import { useTranslation } from 'react-i18next';

interface WeatherData {
  name: string;
  country: string;
  temp: number;
  description: string;
  humidity: number;
  icon: string;
}

interface ForecastData {
  date: string;
  temp: number;
  description: string;
  icon: string;
}

interface Coordinates {
  lat: number | null;
  lng: number | null;
}

interface LocationInfo {
  state: string;
  district: string;
}

export default function WeatherApp() {
  const { t, i18n } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [locationInfo, setLocationInfo] = useState<LocationInfo>({ state: '', district: '' });
  const [coordinates, setCoordinates] = useState<Coordinates>({ lat: null, lng: null });

  // Use the enhanced location hook
  const { location: locationData, loading: locationLoading, error: locationError } = useLocation({
    autoFetch: true,
    timeout: 15000
  });

  const apiKey = "c76c099025fdd8cbb647172c0eba0197"; // 🔑 Replace with your API key

  // Fallback to browser geolocation
  const useBrowserGeolocation = async () => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ lat: latitude, lng: longitude });
        },
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // Fetch weather data using coordinates
  const fetchWeatherData = async (lat: number, lng: number) => {
    try {
      // Current weather
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
      const weatherResponse = await fetch(weatherUrl);
      const weatherData = await weatherResponse.json();

      if (weatherData.cod !== 200) {
        throw new Error('Unable to fetch current weather');
      }

      setWeather({
        name: weatherData.name,
        country: weatherData.sys.country,
        temp: weatherData.main.temp,
        description: weatherData.weather[0].description,
        humidity: weatherData.main.humidity,
        icon: weatherData.weather[0].icon,
      });

      // 5-day forecast
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
      const forecastResponse = await fetch(forecastUrl);
      const forecastData = await forecastResponse.json();

      if (forecastData.cod !== "200") {
        throw new Error('Unable to fetch forecast');
      }

      const dailyForecast = forecastData.list.filter((entry) =>
        entry.dt_txt.includes("12:00:00")
      );

      setForecast(
        dailyForecast.map((day) => ({
          date: day.dt_txt.split(" ")[0],
          temp: day.main.temp,
          description: day.weather[0].description,
          icon: day.weather[0].icon,
        }))
      );

      // Only use reverse geocoding as absolute fallback
      if (!locationInfo.state && !locationInfo.district) {
        console.log('🔄 Using reverse geocoding fallback for location info...');
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
          const nomRes = await fetch(nominatimUrl, {
            headers: { "Accept": "application/json", "Accept-Language": "en" }
          });
          const nomData = await nomRes.json();
          const addr = nomData?.address || {};
          const state = addr.state || "";
          const district = addr.state_district || addr.district || addr.county || addr.city || addr.town || addr.village || "";
          console.log(`🗺️ Reverse geocoding result: ${district}, ${state}`);
          setLocationInfo({ state, district });
        } catch (geoErr) {
          console.warn('Reverse geocoding failed', geoErr);
          setLocationInfo({ state: 'Unknown', district: 'Unknown' });
        }
      }

    } catch (weatherErr) {
      console.error('Weather fetch error:', weatherErr);
      setError(t('weather.errorFetch', '⚠️ Error fetching weather data.'));
    }
  };

  // Effect to handle location data from the hook
  useEffect(() => {
    const handleLocationData = async () => {
      if (locationData && 'lat' in locationData && 'lng' in locationData) {
        try {
          const { lat, lng, address, locationSource } = locationData as LocationData;
          const { state, district } = address || {};
          
          console.log(`🗺️ Location obtained via ${locationSource}: ${district}, ${state} (${lat}, ${lng})`);
          setCoordinates({ lat, lng });
          setLocationInfo({ state: state || '', district: district || '' });
          await fetchWeatherData(lat, lng);
        } catch (err) {
          console.error('❌ Weather fetch failed:', err);
          setError(t('weather.errorFetch', '⚠️ Error fetching weather data.'));
        }
      } else if (locationError) {
        console.error('❌ Location detection failed:', locationError);
        
        // Final fallback to browser geolocation
        try {
          console.log('🌐 Using browser geolocation as final fallback...');
          const { lat, lng } = await useBrowserGeolocation();
          setCoordinates({ lat, lng });
          await fetchWeatherData(lat, lng);
        } catch (err) {
          console.error('❌ All location methods failed:', err);
          setError(t('weather.unableToGetLocation', '⚠️ Unable to get location. Please check permissions or try again.'));
        }
      }
    };

    if (!locationLoading) {
      handleLocationData();
    }
  }, [locationData, locationError, locationLoading]);

  // Update loading state based on location loading
  useEffect(() => {
    setLoading(locationLoading);
  }, [locationLoading]);

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-2 text-center">
        🌍 <T k="weather.title">Weather</T>
      </h3>

      {loading && (
        <div className="text-center py-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-farm-green-500 mx-auto mb-2"></div>
          <p className="text-xs text-gray-600"><T k="common.loadingWeather">Loading weather...</T></p>
        </div>
      )}
      
      {error && (
        <div className="text-center py-2">
          <p className="text-red-500 bg-red-50 rounded-lg p-2 text-xs">{error}</p>
        </div>
      )}

      {weather && (
        <div className="bg-gradient-to-br from-farm-green-50 to-soft-beige-50 rounded-lg p-3 text-center mb-2">
          <h4 className="text-[11px] font-semibold mb-1 text-gray-800">
            {locationInfo.district ? `${locationInfo.district}, ` : ''}{locationInfo.state}{locationInfo.state ? ', ' : ''}{t('weather.country','India')}
          </h4>
          <p className="text-base font-bold text-gray-900 mb-1">🌡 {Math.round(weather.temp)} °C</p>
          <p className="text-[11px] text-gray-600">💧 {weather.humidity}%</p>
        </div>
      )}

      {forecast.length > 0 && (
        <div className="mt-2">
          <h4 className="text-[11px] font-semibold mb-2 text-center text-gray-800">📅 <T k="weather.fiveDayForecast">5-Day Forecast</T></h4>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {forecast.slice(0, 3).map((day, index) => (
                <div key={index} className="bg-gray-50 rounded-md p-2 text-center border border-gray-200">
                  <p className="font-semibold text-[10px] text-gray-700 mb-1">
                    {new Date(day.date).toLocaleDateString(i18n.language || 'en-US', { weekday: 'short' })}
                  </p>
                  <img
                    src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                    alt=""
                    className="w-6 h-6 mx-auto mb-1"
                  />
                  <p className="font-medium text-[11px] text-gray-900">{Math.round(day.temp)}°C</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {forecast.slice(3, 5).map((day, index) => (
                <div key={index} className="bg-gray-50 rounded-md p-2 text-center border border-gray-200">
                  <p className="font-semibold text-[10px] text-gray-700 mb-1">
                    {new Date(day.date).toLocaleDateString(i18n.language || 'en-US', { weekday: 'short' })}
                  </p>
                  <img
                    src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                    alt=""
                    className="w-6 h-6 mx-auto mb-1"
                  />
                  <p className="font-medium text-[11px] text-gray-900">{Math.round(day.temp)}°C</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
