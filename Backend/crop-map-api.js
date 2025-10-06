// Separate API for crop details map functionality
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Get map data for crop details page with district-wise threshold popups
router.get('/crop-map/:cropName', async (req, res) => {
    try {
        const { cropName } = req.params;
        const crop = cropName.toLowerCase();

        // Get user location
        let userLat = 15.8497, userLng = 74.4977; // Default Belagavi, Karnataka
        try {
            const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
            if (GOOGLE_API_KEY) {
                const geoPayload = {
                    considerIp: true,
                    wifiAccessPoints: [
                        {
                            "macAddress": "00:25:9c:cf:1c:ac",
                            "signalStrength": -43,
                            "signalToNoiseRatio": 0
                        }
                    ],
                    cellTowers: [
                        {
                            "cellId": 42,
                            "locationAreaCode": 415,
                            "mobileCountryCode": 404,
                            "mobileNetworkCode": 1,
                            "signalStrength": -60
                        }
                    ]
                };
                const geoResp = await axios.post(`https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`, geoPayload);
                userLat = geoResp.data.location.lat;
                userLng = geoResp.data.location.lng;
            }
        } catch (err) {
            console.warn('Using default location for map');
        }

        // Load processed_cycles.json for district data
        const fs = require('fs');
        const path = require('path');
        let districtData = [];

        try {
            const processedCyclesPath = path.join(__dirname, 'processed_cycles.json');
            if (fs.existsSync(processedCyclesPath)) {
                const processedCycles = JSON.parse(fs.readFileSync(processedCyclesPath, 'utf8'));

                // Find all districts with this crop data
                for (const [stateName, stateInfo] of Object.entries(processedCycles)) {
                    const districts = stateInfo?.districts;
                    if (districts) {
                        for (const [districtName, districtInfo] of Object.entries(districts)) {
                            const seasons = ['kharif', 'rabi', 'zaid'];
                            for (const season of seasons) {
                                const cropData = districtInfo?.[season]?.[crop];
                                if (cropData) {
                                    // Get district coordinates
                                    try {
                                        const GEOCODING_API_KEY = process.env.GEOCODING_API_KEY;
                                        if (!GEOCODING_API_KEY) {
                                            return res.status(500).json({
                                                error: 'Geocoding API key not configured'
                                            });
                                        }

                                        const geocodeResp = await axios.get(
                                            `https://maps.googleapis.com/maps/api/geocode/json?address=${districtName},${stateName},India&key=${GEOCODING_API_KEY}`
                                        );
                                        if (geocodeResp.data.results.length > 0) {
                                            const location = geocodeResp.data.results[0].geometry.location;

                                            // Calculate threshold data
                                            const cycle1Data = cropData.standard_cycles?.cycle_1;
                                            const maxProduction = (cycle1Data?.max_production || 0.1) * 1000;
                                            const avgProduction = (cycle1Data?.avg_production || 0.05) * 1000;
                                            const threshold = maxProduction * 0.8;

                                            districtData.push({
                                                district: districtName,
                                                state: stateName,
                                                season: season,
                                                lat: location.lat,
                                                lng: location.lng,
                                                thresholds: {
                                                    max: maxProduction,
                                                    avg: avgProduction,
                                                    threshold: threshold,
                                                    cycleDays: cropData.cycle_days || 0
                                                },
                                                seasonTotal: {
                                                    production: (cropData.season_total?.production || 0) * 1000,
                                                    yield: cropData.season_total?.yield || 0,
                                                    count: cropData.season_total?.count || 0
                                                }
                                            });
                                        }
                                    } catch (geocodeErr) {
                                        console.warn(`Failed to geocode ${districtName}, ${stateName}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load district data:', err.message);
        }

        // Create static map URL with district markers
        let mapUrl = '';
        if (process.env.GOOGLE_MAPS_API_KEY && districtData.length > 0) {
            const markers = districtData
                .slice(0, 20) // Limit to 20 markers to avoid URL length issues
                .map((d, index) => `markers=color:blue%7Clabel:${index + 1}%7C${d.lat},${d.lng}`)
                .join('&');

            mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${userLat},${userLng}&zoom=6&size=800x600&${markers}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        }

        res.json({
            success: true,
            crop: cropName,
            userLocation: { lat: userLat, lng: userLng },
            districts: districtData,
            mapUrl: mapUrl,
            totalDistricts: districtData.length
        });

    } catch (err) {
        console.error('Crop map API error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to load crop map data',
            details: err.message
        });
    }
});

module.exports = router;
