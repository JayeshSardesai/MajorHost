// API endpoint for handling map click location data
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Get region data for clicked location on map
const getRegionData = async (req, res) => {
    try {
        const { lat, lng, cropName } = req.params;
        const crop = cropName.toLowerCase();

        console.log(`🗺️ Getting region data for: ${lat}, ${lng} - Crop: ${crop}`);

        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
        const GEOCODING_API_KEY = process.env.GEOCODING_API_KEY;

        if (!GEOCODING_API_KEY) {
            return res.status(500).json({
                error: 'Geocoding API key not configured'
            });
        }

        // Get location details for clicked coordinates with timeout and fallback
        let clickedDistrict = 'Unknown', clickedState = 'Karnataka';
        let geocodingFailed = true; // Force fallback to bypass geocoding issues

        // BYPASS GEOCODING - Use coordinate-based detection directly
        console.log('🔍 BYPASSING geocoding - using coordinate-based district detection...');
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        // Karnataka coordinate ranges for major districts
        const districtCoordinates = {
            'bangalore rural': { lat: 12.9716, lng: 77.5946, range: 0.5 },
            'mysore': { lat: 12.2958, lng: 76.6394, range: 0.4 },
            'mandya': { lat: 12.5218, lng: 76.8951, range: 0.3 },
            'hassan': { lat: 13.0033, lng: 76.1004, range: 0.3 },
            'tumkur': { lat: 13.3379, lng: 77.1022, range: 0.3 },
            'ramanagara': { lat: 12.7206, lng: 77.2781, range: 0.3 },
            'kolar': { lat: 13.1358, lng: 78.1297, range: 0.3 },
            'chikballapur': { lat: 13.4355, lng: 77.7315, range: 0.3 },
            'belgaum': { lat: 15.8497, lng: 74.4977, range: 0.4 },
            'bagalkot': { lat: 16.1781, lng: 75.6961, range: 0.3 }
        };

        let closestDistrict = 'bangalore rural'; // Default fallback
        let minDistance = Infinity;

        for (const [district, coords] of Object.entries(districtCoordinates)) {
            const distance = Math.sqrt(
                Math.pow(latNum - coords.lat, 2) + Math.pow(lngNum - coords.lng, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestDistrict = district;
            }
        }

        clickedDistrict = closestDistrict;
        clickedState = 'Karnataka';
        console.log(`🎯 Coordinate-based detection: ${clickedDistrict} (distance: ${minDistance.toFixed(4)})`);

        // OLD GEOCODING CODE (COMMENTED OUT)
        /*
        try {
            const revResp = await axios.get(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${GEOCODING_API_KEY}`,
                { timeout: 3000 }
            );

            if (revResp.data.status === 'OK' && revResp.data.results.length > 0) {
                const components = revResp.data.results[0].address_components;
                const findType = t => components.find(c => c.types.includes(t))?.long_name || '';
                clickedDistrict = findType('administrative_area_level_2') || findType('locality') || findType('sublocality') || 'Unknown';
                clickedState = findType('administrative_area_level_1') || 'Karnataka';
                console.log(`✅ Geocoding successful: ${clickedDistrict}, ${clickedState}`);
                geocodingFailed = false;
            } else {
                console.warn(`⚠️ Geocoding API returned status: ${revResp.data.status}`);
                geocodingFailed = true;
            }
        } catch (geoError) {
            console.warn('⚠️ Geocoding API timeout/error:', geoError.message);
            geocodingFailed = true;
        }
        */

        // Remove duplicate fallback code since we're using coordinate detection directly above

        console.log(`📍 Clicked location: ${clickedDistrict}, ${clickedState}`);

        // Load processed_cycles.json for threshold data - EXACT SAME LOGIC AS SERVER.JS
        let thresholdData = null;
        try {
            const processedCyclesPath = path.join(__dirname, 'processed_cycles.json');
            console.log('🔍 Looking for processed_cycles.json at:', processedCyclesPath);

            if (fs.existsSync(processedCyclesPath)) {
                const processedCycles = JSON.parse(fs.readFileSync(processedCyclesPath, 'utf8'));

                const stateKey = String(clickedState).toLowerCase();
                let districtKey = String(clickedDistrict).toLowerCase();
                const seasonKey = String(determineSeason()).toLowerCase();
                const cropKey = crop;

                // Apply district name normalization - CORRECTED MAPPING
                const districtMapping = {
                    'bangalore division': 'bangalore rural',
                    'bangalore_division': 'bangalore rural',
                    'mysore division': 'mysore',
                    'mysore_division': 'mysore',
                    'belgaum division': 'belgaum',
                    'belgaum_division': 'belgaum',
                    'belagavi': 'belgaum',
                    'belagavi division': 'belgaum',
                    'bengaluru_urban': 'bangalore rural',
                    'bengaluru': 'bangalore rural'
                };

                console.log(`🔍 Original district: "${districtKey}"`);
                console.log(`🔍 Available mappings: ${JSON.stringify(districtMapping)}`);
                console.log(`🔍 Checking mapping for key: "${districtKey}"`);
                console.log(`🔍 Mapping result: ${districtMapping[districtKey] || 'NOT FOUND'}`);

                const normalizedDistrict = districtMapping[districtKey] || districtKey;
                districtKey = normalizedDistrict;

                console.log(`🔍 Normalized district: ${String(clickedDistrict).toLowerCase()} -> ${districtKey}`);

                console.log(`🔍 Looking for threshold data: ${stateKey}.districts.${districtKey}.${seasonKey}.${cropKey}`);
                console.log(`🔍 DEBUG: Actual lookup path: processedCycles?.${stateKey}?.districts?.${districtKey}?.${seasonKey}?.${cropKey}`);
                console.log(`🔍 DEBUG: Available districts in ${stateKey}:`, Object.keys(processedCycles?.[stateKey]?.districts || {}));

                // First try district-specific data - EXACT SAME AS SERVER.JS
                thresholdData = processedCycles?.[stateKey]?.districts?.[districtKey]?.[seasonKey]?.[cropKey];

                if (thresholdData) {
                    console.log(`📊 Threshold data found: ${!!thresholdData}`);
                    console.log('✅ Found district-specific threshold data for crop');
                } else {
                    console.log(`📊 Threshold data found: ${!!thresholdData}`);
                    console.log('⚠️ District data not found, checking surrounding districts...');

                    // Define surrounding districts for major regions - ENHANCED MAPPING
                    const surroundingDistricts = {
                        'mysore': ['mandya', 'hassan', 'chamarajanagar', 'kodagu', 'bangalore rural', 'ramanagara'],
                        'bangalore rural': ['ramanagara', 'tumkur', 'kolar', 'chikballapur', 'mandya', 'hassan', 'mysore'],
                        'belagavi': ['bagalkot', 'dharwad', 'uttara kannada', 'gadag', 'belgaum'],
                        'belgaum': ['bagalkot', 'dharwad', 'uttara kannada', 'gadag', 'belagavi', 'bangalore rural', 'mysore', 'mandya'],
                        'bagalkot': ['belagavi', 'bijapur', 'gadag', 'dharwad', 'belgaum'],
                        'mandya': ['mysore', 'hassan', 'ramanagara', 'tumkur', 'bangalore rural', 'chamarajanagar'],
                        'hassan': ['mysore', 'mandya', 'chikmagalur', 'kodagu', 'shimoga', 'tumkur'],
                        'tumkur': ['bangalore rural', 'ramanagara', 'mandya', 'hassan', 'chitradurga'],
                        'kolar': ['bangalore rural', 'chikballapur', 'tumkur'],
                        'ramanagara': ['bangalore rural', 'mandya', 'tumkur', 'hassan']
                    };

                    // Check surrounding districts first - EXACT SAME AS SERVER.JS
                    const currentDistrictKey = districtKey.replace(/\s+/g, ' ');
                    const nearbyDistricts = surroundingDistricts[currentDistrictKey] || [];

                    console.log(`🔍 Current district key: "${currentDistrictKey}"`);
                    console.log(`🔍 Available surrounding districts: ${JSON.stringify(Object.keys(surroundingDistricts))}`);
                    console.log(`🔍 Found nearby districts: ${nearbyDistricts.join(', ')}`);

                    for (const nearbyDistrict of nearbyDistricts) {
                        const nearbyKey = nearbyDistrict.toLowerCase().replace(/\s+/g, ' ');
                        console.log(`🔍 Checking nearby district: ${nearbyDistrict} -> key: ${nearbyKey}`);
                        const nearbyData = processedCycles?.[stateKey]?.districts?.[nearbyKey]?.[seasonKey]?.[cropKey];
                        if (nearbyData) {
                            thresholdData = nearbyData;
                            console.log(`✅ Found threshold data from nearby district: ${nearbyDistrict}`);
                            console.log(`📊 Threshold data found: ${!!thresholdData}`);
                            break;
                        } else {
                            console.log(`❌ No data found for ${nearbyKey}`);
                        }
                    }

                    // If no nearby district data, fallback to any district in the state - ENHANCED SEARCH
                    if (!thresholdData) {
                        console.log('⚠️ No nearby district data found, checking state-level data...');
                        const stateData = processedCycles?.[stateKey]?.districts;
                        if (stateData) {
                            console.log(`🔍 Searching through ${Object.keys(stateData).length} districts in ${stateKey} for ${cropKey}`);
                            for (const [districtName, districtData] of Object.entries(stateData)) {
                                const cropData = districtData?.[seasonKey]?.[cropKey];
                                console.log(`🔍 Checking ${districtName}: ${cropData ? 'HAS' : 'NO'} ${cropKey} data`);
                                if (cropData) {
                                    thresholdData = cropData;
                                    console.log(`✅ Found state-level threshold data from district: ${districtName}`);
                                    console.log(`📊 Threshold data found: ${!!thresholdData}`);
                                    break;
                                }
                            }
                        }
                    }

                    if (!thresholdData) {
                        console.log('⚠️ No threshold data found for this crop in any location');
                    } else {
                        console.log('✅ Final threshold data found successfully');
                    }
                }
            } else {
                console.warn('❌ processed_cycles.json file not found at path:', processedCyclesPath);
            }
        } catch (err) {
            console.error('❌ Failed to load processed_cycles.json:', err.message);
        }

        // Get production data for clicked location from database
        const UserSelection = require('./models/User').UserSelection;
        const RegionProduction = require('./models/User').RegionProduction;

        const currentSeason = determineSeason();
        const currentCycle = await determineCycle(crop, clickedDistrict, clickedState, currentSeason);

        // Get farmer production data for clicked location - EXACT SAME LOGIC AS SERVER.JS
        const districtVariations = [
            String(clickedDistrict).toLowerCase()
        ];

        const currentCycleFarmerProduction = await UserSelection.aggregate([
            {
                $match: {
                    cropLower: crop,
                    districtLower: { $in: districtVariations },
                    stateLower: String(clickedState).toLowerCase(),
                    seasonLower: String(currentSeason).toLowerCase(),
                    cycle: currentCycle
                }
            },
            {
                $group: {
                    _id: null,
                    totalProduction: { $sum: '$totalProduction' },
                    farmerCount: { $sum: 1 }
                }
            }
        ]);

        const farmerProduction = await UserSelection.aggregate([
            {
                $match: {
                    cropLower: crop,
                    districtLower: { $in: districtVariations },
                    stateLower: String(clickedState).toLowerCase(),
                    seasonLower: String(currentSeason).toLowerCase()
                }
            },
            {
                $group: {
                    _id: null,
                    totalProduction: { $sum: '$totalProduction' },
                    farmerCount: { $sum: 1 },
                    avgYield: { $avg: '$actualYield' }
                }
            }
        ]);

        // Get region production data - EXACT SAME LOGIC AS CROP DETAILS
        const cycleRegionProduction = await RegionProduction.aggregate([
            {
                $match: {
                    cropLower: crop,
                    stateLower: String(clickedState).toLowerCase(),
                    districtLower: { $in: districtVariations },
                    seasonLower: String(currentSeason).toLowerCase(),
                    cycle: currentCycle
                }
            },
            {
                $group: {
                    _id: null,
                    totalProduction: { $sum: '$totalProduction' },
                    totalSubmissions: { $sum: '$submissionsCount' }
                }
            }
        ]);

        const regionProduction = await RegionProduction.aggregate([
            {
                $match: {
                    cropLower: crop,
                    districtLower: { $in: districtVariations },
                    stateLower: String(clickedState).toLowerCase(),
                    seasonLower: String(currentSeason).toLowerCase()
                }
            },
            {
                $group: {
                    _id: null,
                    totalProduction: { $sum: '$totalProduction' },
                    submissionsCount: { $sum: '$submissionsCount' }
                }
            }
        ]);

        // Calculate threshold using EXACT SAME LOGIC as crop details API
        let threshold = 0.1; // Default fallback threshold in raw units
        let maxCycleProduction = 0.1;
        let avgCycleProduction = 0.05;

        if (thresholdData) {
            // Get max and avg production for current cycle from processed_cycles.json (use raw values)
            const cycleKey = `cycle_${currentCycle}`;
            const cycleData = thresholdData.standard_cycles?.[cycleKey];
            maxCycleProduction = (cycleData?.max_production || 0.1); // Use raw values
            avgCycleProduction = (cycleData?.avg_production || 0.05); // Use raw values

            threshold = maxCycleProduction * 0.8; // 80% of max production capacity
            console.log(`✅ Using threshold data: max=${maxCycleProduction}, avg=${avgCycleProduction}, threshold=${threshold}`);
        } else {
            console.log(`⚠️ No threshold data found, using default: ${threshold}`);
        }

        // Use both UserSelection and RegionProduction data for more accurate current cycle production - EXACT SAME AS CROP DETAILS
        const actualCurrentCycleProduction = Math.max(
            currentCycleFarmerProduction[0]?.totalProduction || 0,
            cycleRegionProduction[0]?.totalProduction || 0
        );

        console.log(`📊 Current cycle: ${currentCycle}, Actual production: ${actualCurrentCycleProduction}`);

        // Determine if threshold is reached
        const thresholdReached = actualCurrentCycleProduction >= threshold;

        const farmerCount = farmerProduction[0]?.farmerCount || 0;
        const avgYield = farmerProduction[0]?.avgYield || 0;

        // Calculate threshold status and opportunity message
        let opportunityMessage = 'No Data Available';
        if (threshold > 0) {
            if (actualCurrentCycleProduction >= threshold) {
                opportunityMessage = '⚠️ Warning: Production above threshold - market may be saturated';
            } else {
                opportunityMessage = '✅ Good Opportunity: Production below threshold - potential for growth';
            }
        }

        return res.json({
            success: true,
            crop: cropName,
            location: {
                district: clickedDistrict,
                state: clickedState,
                coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }
            },
            production: {
                actual: actualCurrentCycleProduction,
                threshold: threshold,
                thresholdReached: thresholdReached,
                opportunity: opportunityMessage
            },
            farmers: {
                count: farmerCount
            },
            season: currentSeason,
            cycle: currentCycle,
            thresholdData: {
                found: thresholdData !== null,
                maxCycleProduction: maxCycleProduction,
                avgCycleProduction: avgCycleProduction
            }
        });

        console.log(`📊 Threshold data found: ${thresholdData !== null}`);

    } catch (err) {
        console.error('❌ Region data API error:', err);
        return res.status(500).json({
            error: 'Failed to get region data',
            details: err.message
        });
    }
};

// Helper function to determine current season
function determineSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 10) return 'Kharif';
    if (month >= 11 || month <= 2) return 'Rabi';
    return 'Zaid';
}

// Helper function to determine production cycle
async function determineCycle(crop, district, state, season) {
    try {
        const UserSelection = require('./models/User').UserSelection;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

        const existingSelections = await UserSelection.countDocuments({
            cropLower: String(crop).toLowerCase(),
            districtLower: String(district).toLowerCase(),
            stateLower: String(state).toLowerCase(),
            seasonLower: String(season).toLowerCase(),
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        if (existingSelections <= 50) return 1;
        else if (existingSelections <= 100) return 2;
        else return 3;
    } catch (err) {
        console.warn('Failed to determine cycle:', err.message);
        return 1;
    }
}

// Helper function to normalize district names
function normalizeDistrictName(districtName) {
    const districtMapping = {
        'belgaum_division': 'belgaum',
        'bangalore_division': 'bangalore_urban',
        'mysore_division': 'mysore',
        'belagavi': 'belgaum',
        'bengaluru_urban': 'bangalore_urban',
        'bengaluru': 'bangalore_urban'
    };

    const normalized = String(districtName).toLowerCase().replace(/\s+/g, '_');
    return districtMapping[normalized] || normalized;
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}

// Dynamically find surrounding districts using geographic coordinates across all states
async function getSurroundingDistricts(clickedLat, clickedLng, processedCycles, currentSeason, cropKey, GOOGLE_MAPS_API_KEY) {
    try {
        // Get all available districts from ALL states in processed_cycles.json
        const allAvailableDistricts = [];

        for (const [stateName, stateData] of Object.entries(processedCycles)) {
            if (stateData?.districts) {
                for (const [districtName, districtData] of Object.entries(stateData.districts)) {
                    if (districtData?.[currentSeason]?.[cropKey]) {
                        allAvailableDistricts.push({
                            district: districtName,
                            state: stateName
                        });
                    }
                }
            }
        }

        console.log(`🔍 Found ${allAvailableDistricts.length} districts across all states with ${cropKey} data for ${currentSeason} season`);

        // Get coordinates for each district and calculate distance
        const districtDistances = [];

        for (const districtInfo of allAvailableDistricts) {
            try {
                // Get district center coordinates using geocoding - search across India
                const geocodeResp = await axios.get(
                    `https://maps.googleapis.com/maps/api/geocode/json?address=${districtInfo.district}+district+${districtInfo.state}+India&key=${GEOCODING_API_KEY}`,
                    { timeout: 3000 }
                );

                if (geocodeResp.data.status === 'OK' && geocodeResp.data.results.length > 0) {
                    const location = geocodeResp.data.results[0].geometry.location;
                    const distance = calculateDistance(
                        parseFloat(clickedLat),
                        parseFloat(clickedLng),
                        location.lat,
                        location.lng
                    );

                    districtDistances.push({
                        district: districtInfo.district,
                        state: districtInfo.state,
                        distance: distance,
                        coordinates: location
                    });

                    console.log(`📍 ${districtInfo.district}, ${districtInfo.state}: ${distance.toFixed(1)}km away`);
                }
            } catch (geoError) {
                console.warn(`⚠️ Failed to geocode ${districtInfo.district}, ${districtInfo.state}:`, geoError.message);
                // Continue with next district
            }
        }

        // Sort by distance and return closest districts (within 300km to allow cross-state)
        districtDistances.sort((a, b) => a.distance - b.distance);
        const nearbyDistricts = districtDistances
            .filter(d => d.distance <= 300) // Within 300km for cross-state districts
            .slice(0, 8) // Top 8 closest districts
            .map(d => d.district);

        console.log(`✅ Found ${nearbyDistricts.length} nearby districts across states: ${nearbyDistricts.join(', ')}`);
        return nearbyDistricts;

    } catch (error) {
        console.warn('⚠️ Error finding surrounding districts dynamically:', error.message);

        // Fallback to basic hardcoded mapping for major districts
        const surroundingMap = {
            'mysore': ['mandya', 'hassan', 'chamarajanagar', 'kodagu', 'tumkur'],
            'bangalore_urban': ['bangalore_rural', 'ramanagara', 'tumkur', 'kolar', 'chikballapur'],
            'belgaum': ['bagalkot', 'dharwad', 'uttara_kannada', 'gadag', 'haveri'],
            'bagalkot': ['belgaum', 'dharwad', 'gadag', 'raichur', 'koppal'],
            'dharwad': ['belgaum', 'bagalkot', 'gadag', 'haveri', 'uttara_kannada'],
            'gadag': ['dharwad', 'bagalkot', 'haveri', 'koppal', 'bellary'],
            'haveri': ['dharwad', 'gadag', 'uttara_kannada', 'shimoga', 'davanagere'],
            'uttara_kannada': ['dharwad', 'haveri', 'shimoga', 'udupi', 'dakshina_kannada'],
            'shimoga': ['haveri', 'uttara_kannada', 'davanagere', 'chikmagalur', 'udupi'],
            'davanagere': ['shimoga', 'haveri', 'gadag', 'chitradurga', 'tumkur'],
            'chitradurga': ['davanagere', 'tumkur', 'bellary', 'anantapur', 'kolar'],
            'tumkur': ['bangalore_urban', 'chitradurga', 'davanagere', 'hassan', 'chikballapur'],
            'kolar': ['bangalore_urban', 'chikballapur', 'chitradurga', 'anantapur', 'vellore'],
            'chikballapur': ['bangalore_urban', 'kolar', 'tumkur', 'anantapur', 'chitradurga'],
            'hassan': ['mysore', 'tumkur', 'chikmagalur', 'kodagu', 'mandya'],
            'mandya': ['mysore', 'hassan', 'ramanagara', 'chamarajanagar', 'bangalore_rural'],
            'ramanagara': ['bangalore_urban', 'mandya', 'chamarajanagar', 'tumkur', 'kolar'],
            'chamarajanagar': ['mysore', 'mandya', 'ramanagara', 'kodagu', 'dharmapuri'],
            'kodagu': ['mysore', 'hassan', 'chamarajanagar', 'dakshina_kannada', 'chikmagalur'],
            'dakshina_kannada': ['uttara_kannada', 'kodagu', 'udupi', 'hassan', 'chikmagalur'],
            'udupi': ['uttara_kannada', 'dakshina_kannada', 'shimoga', 'chikmagalur'],
            'chikmagalur': ['hassan', 'shimoga', 'kodagu', 'dakshina_kannada', 'udupi'],
            'bellary': ['gadag', 'chitradurga', 'koppal', 'raichur', 'anantapur'],
            'koppal': ['bagalkot', 'gadag', 'bellary', 'raichur', 'dharwad'],
            'raichur': ['bagalkot', 'koppal', 'bellary', 'gulbarga', 'bidar'],
            'gulbarga': ['raichur', 'bidar', 'yadgir', 'bellary', 'koppal'],
            'bidar': ['raichur', 'gulbarga', 'yadgir', 'nizamabad', 'latur'],
            'yadgir': ['gulbarga', 'bidar', 'raichur', 'bellary', 'koppal']
        };

        const normalizedKey = normalizeDistrictName(clickedDistrict);
        return surroundingMap[normalizedKey] || [];
    }
}

module.exports = { getRegionData };
