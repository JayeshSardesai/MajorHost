import React, { useState, useEffect } from "react";
import T from './T';
import { useTranslation } from 'react-i18next';
import locationService from '../services/locationService'; // Import our corrected service

const WeatherApp = () => {
  const { t, i18n } = useTranslation();

  // State for weather, forecast, errors, and loading status
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [locationAddress, setLocationAddress] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Your OpenWeatherMap API key
  const apiKey = "c76c099025fdd8cbb647172c0eba0197";

  useEffect(() => {
    const fetchLocationAndWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Get location data directly from our robust service
        const locationData = await locationService.getCurrentLocation();

        if (locationData && locationData.success) {
          const { lat, lng } = locationData.coordinates;
          setLocationAddress(locationData.address); // Save the address for display

          // --- 2. Fetch Current Weather ---
          const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=${i18n.language}`;
          const weatherResponse = await fetch(weatherUrl);
          const currentWeatherData = await weatherResponse.json();

          if (currentWeatherData.cod !== 200) {
            throw new Error(currentWeatherData.message || 'Unable to fetch current weather');
          }

          setWeather({
            temp: currentWeatherData.main.temp,
            description: currentWeatherData.weather[0].description,
            humidity: currentWeatherData.main.humidity,
            icon: currentWeatherData.weather[0].icon,
          });

          // --- 3. Fetch 5-Day Forecast ---
          const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=${i18n.language}`;
          const forecastResponse = await fetch(forecastUrl);
          const forecastData = await forecastResponse.json();

          if (forecastData.cod !== "200") {
            throw new Error(forecastData.message || 'Unable to fetch forecast');
          }

          // Filter the forecast to get one entry per day (at noon)
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
        } else {
          throw new Error("Location data could not be retrieved.");
        }
      } catch (err) {
        console.error('WeatherApp process error:', err);
        setError(err.message || t('weather.errorFetch', '⚠️ Error fetching data.'));
      } finally {
        setLoading(false);
      }
    };

    fetchLocationAndWeather();
  }, [i18n.language, t]); // Re-fetch if language changes


  // --- Rendering Logic ---

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-2 text-center">
        🌍 <T k="weather.title">Weather</T>
      </h3>

      {loading && (
        <div className="text-center py-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2"></div>
          <p className="text-xs text-gray-600"><T k="common.loadingWeather">Loading weather...</T></p>
        </div>
      )}

      {error && (
        <div className="text-center py-2">
          <p className="text-red-500 bg-red-50 rounded-lg p-2 text-xs">{error}</p>
        </div>
      )}

      {!loading && !error && weather && locationAddress && (
        <>
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-3 text-center mb-2">
            <h4 className="text-[11px] font-semibold mb-1 text-gray-800">
              {locationAddress.district}, {locationAddress.state}
            </h4>
            <p className="text-base font-bold text-gray-900 mb-1">
              <img src={`https://openweathermap.org/img/wn/${weather.icon}.png`} alt={weather.description} className="inline-block w-8 h-8 -mt-2" />
              {Math.round(weather.temp)}°C
            </p>
            <p className="text-[11px] text-gray-600 capitalize">{weather.description}</p>
            <p className="text-[11px] text-gray-600">💧 {weather.humidity}%</p>
          </div>

          {forecast.length > 0 && (
            <div className="mt-2">
              <h4 className="text-[11px] font-semibold mb-2 text-center text-gray-800">📅 <T k="weather.fiveDayForecast">5-Day Forecast</T></h4>
              <div className="grid grid-cols-5 gap-2">
                {forecast.map((day, index) => (
                  <div key={index} className="bg-gray-50 rounded-md p-2 text-center border border-gray-200">
                    <p className="font-semibold text-[10px] text-gray-700 mb-1">
                      {new Date(day.date).toLocaleDateString(i18n.language, { weekday: 'short' })}
                    </p>
                    <img
                      src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                      alt={day.description}
                      className="w-8 h-8 mx-auto"
                    />
                    <p className="font-medium text-[11px] text-gray-900">{Math.round(day.temp)}°C</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WeatherApp;