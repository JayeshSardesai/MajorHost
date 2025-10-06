require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const session = require('express-session');
// const MongoStore = require('connect-mongo'); // Temporarily commented out
const cropMapRouter = require('./crop-map-api');
const nodemailer = require('nodemailer');
let wifi = null;

const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Model
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // Require password only after email is verified (temporary users can be created without password)
    password: { type: String, required: function () { return this.emailVerified === true; } },
    emailVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },
    // Profile fields
    profile: {
        nitrogen: { type: Number },
        phosphorus: { type: Number },
        potassium: { type: Number },
        areaHectare: { type: Number },
        ph: { type: Number },
        crop: { type: String },
        soilType: { type: String },
        farmerCardUrl: { type: String } // Added farmerCardUrl
    },
    // Store dashboard location for consistency across all pages
    dashboardLocation: {
        state: { type: String },
        district: { type: String },
        coordinates: {
            lat: { type: Number },
            lng: { type: Number }
        },
        lastUpdated: { type: Date, default: Date.now }
    },
    createdAt: { type: Date, default: Date.now }
}));

// Soil Data Model (stores N, P, K, pH, soilType per user)
const SoilData = mongoose.model('SoilData', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, unique: true },
    nitrogen: { type: Number },
    phosphorus: { type: Number },
    potassium: { type: Number },
    ph: { type: Number },
    soilType: { type: String },
    updatedAt: { type: Date, default: Date.now }
}));

// User crop selections (each submission of crop+area with estimation)
const UserSelection = mongoose.model('UserSelection', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    crop: { type: String, required: true },
    cropLower: { type: String, index: true },
    areaHectare: { type: Number, required: true },
    originalArea: { type: Number }, // Store original area if < 1 hectare
    estimatedYield: { type: Number }, // per hectare
    actualYield: { type: Number }, // scaled for actual area
    totalProduction: { type: Number },
    season: { type: String, required: true },
    seasonLower: { type: String, index: true },
    state: { type: String },
    stateLower: { type: String, index: true },
    district: { type: String },
    districtLower: { type: String, index: true },
    cycle: { type: Number, default: 1 }, // Production cycle within season
    createdAt: { type: Date, default: Date.now }
}));

// Region aggregate production per crop
const RegionProduction = mongoose.model('RegionProduction', new mongoose.Schema({
    cropLower: { type: String, index: true },
    stateLower: { type: String, index: true },
    districtLower: { type: String, index: true },
    seasonLower: { type: String, index: true },
    totalProduction: { type: Number, default: 0 },
    submissionsCount: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
}, { indexes: [{ cropLower: 1, stateLower: 1, districtLower: 1, seasonLower: 1 }] }));

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-strong-default-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', cropMapRouter);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer storage for farmer card uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || '.png';
        cb(null, `farmercard_${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Added these options to potentially help with connection timeouts
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 5
});

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Verify email transporter at startup for diagnostics
transporter.verify(function (error, success) {
    if (error) {
        console.error('Email transporter verify failed:', error.message || error);
    } else {
        console.log('Email transporter is ready to send messages');
    }
});

// Send OTP Email
const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: email,
        subject: 'FarmFlow Verification Code',
        html: `
            <div style="font-family: Inter, Arial, sans-serif; background:#f8fafc; padding:24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
                <tr>
                  <td style="background:#ecfdf5;padding:20px 24px;border-bottom:1px solid #e2e8f0;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <span style="display:inline-block;width:28px;height:28px;border-radius:6px;background:#10b981;"> </span>
                      <span style="font-size:18px;font-weight:700;color:#065f46;">FarmFlow</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 24px 8px 24px;">
                    <h2 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;color:#111827;font-weight:700;">Verify your email</h2>
                    <p style="margin:0;color:#4b5563;font-size:14px;">Use the code below to complete your FarmFlow signup.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 24px 24px 24px;">
                    <div style="background:#ecfdf5;border:1px dashed #10b981;border-radius:12px;padding:20px;text-align:center;">
                      <div style="font-size:36px;letter-spacing:10px;font-weight:800;color:#065f46;">${otp}</div>
                      <div style="margin-top:10px;font-size:12px;color:#065f46;">Code expires in 10 minutes</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 24px 24px 24px;">
                    <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">If you didn’t request this, you can safely ignore this email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;padding:16px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
                    &copy; ${new Date().getFullYear()} FarmFlow
                  </td>
                </tr>
              </table>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
};

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'FarmFlow API is running' });
});
// 1. New route for Yield Estimation
app.post('/api/yield-estimation', authenticateToken, async (req, res) => {
    try {
        console.log('Proxying request to ML service for yield estimation...');
        // Forward the request body from the React app to the Python ML API
        const response = await axios.post(`${process.env.ML_API_URL}/api/predict-yield`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error proxying to ML service for yield:', error.message);
        res.status(500).json({ error: 'Error getting prediction', details: error.message });
    }
});

// 2. New route for Crop Recommendation
app.post('/api/crop-recommendation', authenticateToken, async (req, res) => {
    try {
        console.log('Proxying request to ML service for crop recommendation...');
        // Forward the request body from the React app to the Python ML API
        const response = await axios.post(`${process.env.ML_API_URL}/api/recommend-crop`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error proxying to ML service for crop:', error.message);
        res.status(500).json({ error: 'Error getting recommendation', details: error.message });
    }
});
// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Send OTP API
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            // Update existing user's OTP
            user.otp = otp;
            user.otpExpiry = otpExpiry;
            await user.save();
        } else {
            // Create new user with OTP
            user = new User({
                email,
                otp,
                otpExpiry,
                name: 'Temporary User' // Will be updated after verification
            });
            await user.save();
        }

        const emailSent = await sendOTPEmail(email, otp);

        if (emailSent) {
            res.json({ success: true, message: 'OTP sent successfully' });
        } else {
            res.status(500).json({ error: 'Failed to send OTP' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// Verify OTP only (no name/password yet)
app.post('/api/check-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (user.otpExpiry < new Date()) {
            return res.status(400).json({ error: 'OTP expired' });
        }

        // Mark email as verified, clear OTP
        user.emailVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        // Save without validation to allow empty password during OTP verification stage
        await user.save({ validateBeforeSave: false });

        return res.json({ success: true, message: 'OTP verified' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Complete Signup after OTP verification
app.post('/api/complete-signup', async (req, res) => {
    try {
        const { email, name, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        if (!user.emailVerified) {
            return res.status(400).json({ error: 'Email not verified' });
        }

        // Update user with verified info
        user.name = name;
        user.password = bcrypt.hashSync(password, 10);
        await user.save();

        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Signup API (legacy - now redirects to OTP flow)
app.post('/api/signup', async (req, res) => {
    try {
        const { email } = req.body;

        // Send OTP for email verification
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        let user = await User.findOne({ email });

        if (user) {
            user.otp = otp;
            user.otpExpiry = otpExpiry;
            await user.save();
        } else {
            user = new User({
                email,
                otp,
                otpExpiry,
                name: 'Temporary User'
            });
            await user.save();
        }

        const emailSent = await sendOTPEmail(email, otp);

        if (emailSent) {
            res.json({ success: true, message: 'OTP sent successfully', requiresOTP: true });
        } else {
            res.status(500).json({ error: 'Failed to send OTP' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Token Verification API
app.get('/api/verify-token', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user,
        message: 'Token is valid'
    });
});

// Logout API
app.post('/api/logout', authenticateToken, (req, res) => {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return success as the client handles token removal
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Dashboard API (protected)
app.get('/api/dashboard', authenticateToken, (req, res) => {
    // Sample dashboard data
    const dashboardData = {
        user: req.user,
        stats: {
            totalCrops: 12,
            activePredictions: 5,
            accuracy: 95.2,
            yieldIncrease: 23.5
        },
        recentPredictions: [
            { id: 1, crop: 'Wheat', predictedYield: '2.3 tons/acre', confidence: 92 },
            { id: 2, crop: 'Corn', predictedYield: '180 bushels/acre', confidence: 88 },
            { id: 3, crop: 'Soybeans', predictedYield: '45 bushels/acre', confidence: 91 }
        ],
        weather: {
            current: { temp: 22, condition: 'Sunny', humidity: 65 },
            forecast: [
                { day: 'Today', temp: 22, condition: 'Sunny' },
                { day: 'Tomorrow', temp: 19, condition: 'Cloudy' },
                { day: 'Wednesday', temp: 24, condition: 'Partly Cloudy' }
            ]
        }
    };

    res.json({ success: true, data: dashboardData });
});

// Wi-Fi triangulation location detection function
async function getWiFiLocation() { return null }

// GPS fallback location detection function
async function getGPSLocation() {
    try {
        const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
        if (!GOOGLE_API_KEY) {
            console.log('⚠️ Google API key not available for GPS fallback');
            return null;
        }

        console.log('🛰️ Using GPS/IP-based geolocation as fallback...');

        // Use IP-based geolocation as GPS fallback
        const payload = { considerIp: true };

        const geoRes = await axios.post(
            `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`,
            payload
        );

        const { lat, lng } = geoRes.data.location;
        const accuracy = geoRes.data.accuracy;

        console.log(`📍 GPS fallback location: ${lat}, ${lng} (accuracy: ${accuracy}m)`);

        return { lat, lng, accuracy, method: 'gps' };
    } catch (error) {
        console.error('❌ GPS fallback failed:', error.response?.data || error.message);
        return null;
    }
}

// Enhanced geolocation with Wi-Fi triangulation + GPS fallback
app.get('/api/location', async (req, res) => {
    try {
        const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
        const GEOCODING_API_KEY = process.env.GEOCODING_API_KEY;

        console.log('🔑 Google API Keys loaded:', {
            geolocation: GOOGLE_API_KEY ? 'Yes' : 'No',
            maps: GOOGLE_MAPS_API_KEY ? 'Yes' : 'No',
            geocoding: GEOCODING_API_KEY ? 'Yes' : 'No'
        });

        if (!GOOGLE_API_KEY) {
            console.error('❌ GOOGLE_API_KEY not found in environment variables');
            return res.status(500).json({
                error: 'GOOGLE_API_KEY not configured',
                details: 'Please add GOOGLE_API_KEY to your .env file'
            });
        }

        let locationResult = null;

        // Step 1: Try Wi-Fi triangulation first
        console.log('🔄 Step 1: Attempting Wi-Fi triangulation...');
        locationResult = await getWiFiLocation();

        // Step 2: If Wi-Fi fails, use GPS fallback
        if (!locationResult) {
            console.log('🔄 Step 2: Wi-Fi triangulation failed, using GPS fallback...');
            locationResult = await getGPSLocation();
        }

        // Step 3: If both fail, return error
        if (!locationResult) {
            console.error('❌ All location methods failed');
            return res.status(500).json({
                error: 'Failed to determine location',
                details: 'Both Wi-Fi triangulation and GPS fallback failed'
            });
        }

        const { lat, lng, accuracy, method } = locationResult;

        // Reverse geocode for state + district using Maps API key
        console.log('🗺️ Calling Google Geocoding API...');
        let state = '', district = '';

        if (GEOCODING_API_KEY) {
            try {
                const revResp = await axios.get(
                    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${GEOCODING_API_KEY}`
                );

                if (revResp.data.status === 'OK' && revResp.data.results.length > 0) {
                    const components = revResp.data.results[0].address_components;
                    const findType = t => components.find(c => c.types.includes(t))?.long_name || '';
                    district = findType('administrative_area_level_2') || findType('locality') || findType('sublocality');
                    state = findType('administrative_area_level_1');
                    console.log(`🗺️ Address resolved: State: ${state}, District: ${district}`);
                }
            } catch (geocodeErr) {
                console.warn('⚠️ Geocoding failed:', geocodeErr.message);
            }
        }

        // Static map URL for client using Maps API key
        const mapUrl = GOOGLE_MAPS_API_KEY ?
            `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=12&size=640x320&markers=color:green%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}` :
            null;

        console.log(`✅ Location API successful using ${method.toUpperCase()} method`);
        return res.json({
            success: true,
            coordinates: { lat, lng, accuracy },
            address: { state, district },
            mapUrl,
            method: method,
            locationSource: method === 'wifi' ? 'Wi-Fi Triangulation' : 'GPS/IP Geolocation'
        });
    } catch (err) {
        console.error('❌ Location API error:', err.response?.data || err.message);
        if (err.response?.status === 403) {
            return res.status(500).json({
                error: 'Google API key is invalid or quota exceeded',
                details: err.response.data?.error?.message || 'Check your API key and billing'
            });
        }
        return res.status(500).json({
            error: 'Failed to determine location',
            details: err.message
        });
    }
});

// POST endpoint for frontend to send Wi-Fi data directly
app.post('/api/location', async (req, res) => {
    try {
        const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

        if (!GOOGLE_API_KEY) {
            return res.status(500).json({
                error: 'GOOGLE_API_KEY not configured',
                details: 'Please add GOOGLE_API_KEY to your .env file'
            });
        }

        let locationResult = null;
        const { wifiAccessPoints, cellTowers } = req.body || {};

        // Step 1: Try using provided Wi-Fi data
        if (wifiAccessPoints && wifiAccessPoints.length > 0) {
            console.log(`📡 Using provided Wi-Fi data (${wifiAccessPoints.length} networks)`);
            try {
                const payload = {
                    considerIp: false,
                    wifiAccessPoints
                };

                if (cellTowers && cellTowers.length > 0) {
                    payload.cellTowers = cellTowers;
                }

                const geoRes = await axios.post(
                    `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`,
                    payload
                );

                const { lat, lng } = geoRes.data.location;
                const accuracy = geoRes.data.accuracy;
                locationResult = { lat, lng, accuracy, method: 'wifi-provided' };
                console.log(`📍 Wi-Fi triangulation with provided data successful: ${lat}, ${lng}`);
            } catch (wifiErr) {
                console.warn('⚠️ Wi-Fi triangulation with provided data failed:', wifiErr.message);
            }
        }

        // Step 2: If no Wi-Fi data provided or failed, try server-side Wi-Fi scan
        if (!locationResult) {
            console.log('🔄 Attempting server-side Wi-Fi scan...');
            locationResult = await getWiFiLocation();
        }

        // Step 3: If Wi-Fi fails, use GPS fallback
        if (!locationResult) {
            console.log('🔄 Using GPS fallback...');
            locationResult = await getGPSLocation();
        }

        // Step 4: If all methods fail, return error
        if (!locationResult) {
            return res.status(500).json({
                error: 'Failed to determine location',
                details: 'All location methods failed'
            });
        }

        const { lat, lng, accuracy, method } = locationResult;

        // Reverse geocode for address
        let state = '', district = '';
        if (GEOCODING_API_KEY) {
            try {
                const revResp = await axios.get(
                    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${GEOCODING_API_KEY}`
                );

                if (revResp.data.status === 'OK' && revResp.data.results.length > 0) {
                    const components = revResp.data.results[0].address_components;
                    const findType = t => components.find(c => c.types.includes(t))?.long_name || '';
                    let rawDistrict = findType('administrative_area_level_2') || findType('locality') || findType('sublocality');
                    state = findType('administrative_area_level_1');

                    // Use district name exactly as detected without any mapping
                    district = rawDistrict;
                    console.log(`📍 Using exact district name: ${district}`);
                }
            } catch (geocodeErr) {
                console.warn('⚠️ Geocoding failed:', geocodeErr.message);
            }
        }

        const mapUrl = GOOGLE_MAPS_API_KEY ?
            `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=12&size=640x320&markers=color:green%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}` :
            null;

        console.log(`✅ Location API successful using ${method.toUpperCase()} method`);
        console.log(`📍 Detected coordinates: ${lat}, ${lng} (${district}, ${state})`);

        // Store location in user's dashboard location for consistency across all pages
        try {
            const updateResult = await User.findByIdAndUpdate(req.user.userId, {
                dashboardLocation: {
                    state,
                    district,
                    coordinates: { lat, lng },
                    lastUpdated: new Date(),
                    method: method // Store detection method for debugging
                }
            }, { new: true });

            if (updateResult) {
                console.log(`✅ Successfully stored dashboard location: ${state}, ${district} (${lat}, ${lng}) for user ${req.user.userId}`);
                console.log(`🔍 Location detection method: ${method}`);
            } else {
                console.error(`❌ Failed to find user ${req.user.userId} to store location`);
            }
        } catch (storeErr) {
            console.error('❌ Failed to store dashboard location:', storeErr.message);
        }

        return res.json({
            success: true,
            coordinates: { lat, lng, accuracy },
            address: { state, district },
            mapUrl,
            method: method,
            locationSource: method.includes('wifi') ? 'Wi-Fi Triangulation' : 'GPS/IP Geolocation'
        });
    } catch (err) {
        console.error('❌ Location API error:', err.response?.data || err.message);
        return res.status(500).json({
            error: 'Failed to determine location',
            details: err.message
        });
    }
});

// Get user crop selections
app.get('/api/user-crops', authenticateToken, async (req, res) => {
    try {
        // Get current user's dashboard location (metadata only)
        const user = await User.findById(req.user.userId);
        const currentDistrict = user?.dashboardLocation?.district || null;
        const currentState = user?.dashboardLocation?.state || null;

        if (currentDistrict && currentState) {
            console.log(`🗺️ Current dashboard location: ${currentDistrict}, ${currentState}`);
        } else {
            console.log('🗺️ No dashboard location stored; returning all user crops');
        }

        // Return ALL crops for the user (no location filtering) so dashboard always shows every selection
        const userSelections = await UserSelection.find({ userId: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(10); // Latest 10 selections overall

        console.log(`📊 Found ${userSelections.length} crops total for user`);

        const cropData = userSelections.map(selection => ({
            _id: selection._id,
            crop: selection.crop,
            area: selection.areaHectare, // Dashboard expects 'area' field
            areaHectare: selection.areaHectare,
            estimatedYield: selection.estimatedYield,
            actualYield: selection.actualYield,
            totalProduction: selection.totalProduction,
            state: selection.state,
            district: selection.district,
            createdAt: selection.createdAt,
            season: selection.season,
            cycle: selection.cycle
        }));

        res.json({
            success: true,
            crops: cropData,
            location: {
                district: currentDistrict,
                state: currentState
            }
        });
    } catch (error) {
        console.error('Failed to fetch user crops:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user crop selections'
        });
    }
});

// Get weather data
app.get('/api/weather', authenticateToken, async (req, res) => {
    try {
        // Weather API implementation would go here
        res.json({
            success: true,
            message: 'Weather API not implemented yet'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch weather' });
    }
});

// Profile APIs
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('name email profile');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({
            success: true,
            profile: user.profile || {},
            name: user.name,
            email: user.email
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { nitrogen, phosphorus, potassium, areaHectare, ph, crop, soilType } = req.body;
        const update = {
            profile: {
                nitrogen,
                phosphorus,
                potassium,
                areaHectare,
                ph,
                crop,
                soilType
            }
        };
        const user = await User.findByIdAndUpdate(req.user.userId, update, { new: true, runValidators: true }).select('name email profile');
        // Upsert soil data into SoilData collection
        await SoilData.findOneAndUpdate(
            { userId: req.user.userId },
            { $set: { nitrogen, phosphorus, potassium, ph, soilType }, $currentDate: { updatedAt: true } },
            { upsert: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, profile: user.profile });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Upload farmer card image
app.post('/api/profile/farmercard', authenticateToken, upload.single('farmerCard'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const relativeUrl = `/uploads/${req.file.filename}`;
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: { 'profile.farmerCardUrl': relativeUrl } },
            { new: true }
        ).select('profile');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, farmerCardUrl: user.profile?.farmerCardUrl || relativeUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to upload farmer card' });
    }
});

// Crop Prediction API using ML model
app.post('/api/crop-prediction', authenticateToken, async (req, res) => {
    try {
        // Fetch soil data from DB for the authenticated user
        const soil = await SoilData.findOne({ userId: req.user.userId });
        if (!soil || soil.nitrogen == null || soil.phosphorus == null || soil.potassium == null || soil.ph == null || !soil.soilType) {
            return res.status(400).json({ error: 'Soil data incomplete. Please update your profile with N, P, K, pH, and soil type.' });
        }

        const { nitrogen, phosphorus, potassium, ph, soilType } = {
            nitrogen: soil.nitrogen,
            phosphorus: soil.phosphorus,
            potassium: soil.potassium,
            ph: soil.ph,
            soilType: soil.soilType
        };

        console.log('🌾 Crop prediction request (from DB):', { nitrogen, phosphorus, potassium, ph, soilType });

        // Get current weather data for temperature and humidity
        const weatherData = await getCurrentWeatherData(req.user.userId);
        console.log('🌤️ Weather data:', weatherData);

        // Determine current season based on date
        const currentSeason = determineSeason();
        console.log('📅 Current season:', currentSeason);

        // Prepare data for ML model
        const predictionData = {
            SOIL_PH: parseFloat(ph),
            TEMP: weatherData.temperature,
            RELATIVE_HUMIDITY: weatherData.humidity,
            N: parseFloat(nitrogen),
            P: parseFloat(phosphorus),
            K: parseFloat(potassium),
            SOIL: soilType,
            SEASON: currentSeason
        };

        console.log('📊 ML model input data:', predictionData);

        // Call ML model API
        const mlResponse = await axios.post(`${process.env.ML_API_URL}/api/recommend-crop`, predictionData);
        console.log('🤖 ML model response:', mlResponse.data);

        if (mlResponse.data && mlResponse.data.top_5_crops) {
            // Convert probabilities to percentages and format for frontend
            const cropPredictions = Object.entries(mlResponse.data.top_5_crops).map(([crop, probability]) => ({
                crop: crop,
                probability: Math.round(probability * 100),
                confidence: Math.round(probability * 100)
            }));

            console.log('✅ Formatted predictions:', cropPredictions);

            // Build a static map with numbered crop labels (1..5) around user's location
            // First get location (reuse /api/location logic)
            let lat = null, lng = null, mapWithCropsUrl = null;
            try {
                const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
                if (GOOGLE_API_KEY) {
                    // Use Google Geolocation API with IP-based location (no wifi payload)
                    const geoResp = await axios.post(`https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`, { considerIp: true });
                    lat = geoResp.data.location.lat;
                    lng = geoResp.data.location.lng;
                    mapWithCropsUrl = buildStaticMapWithCrops(lat, lng, cropPredictions.map(c => c.crop));
                }
            } catch (locErr) {
                console.warn('Map with crops build failed:', locErr.message);
            }

            res.json({
                success: true,
                predictions: cropPredictions,
                season: currentSeason,
                weather: {
                    temperature: weatherData.temperature,
                    humidity: weatherData.humidity
                },
                mapUrlWithCrops: mapWithCropsUrl
            });
        } else {
            throw new Error('Invalid response from ML model');
        }

    } catch (err) {
        console.error('❌ Crop prediction error:', err);
        res.status(500).json({
            error: 'Failed to get crop predictions',
            details: err.message
        });
    }
});
// Helper functions (determineSeason, getCurrentWeatherData, etc.)
function determineSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 10) return 'Kharif';
    if (month >= 11 || month <= 3) return 'Rabi';
    return 'Zaid';
}
// Helper function to get current weather data
async function getCurrentWeatherData(userId) {
    try {
        const user = await User.findById(userId);
        const location = user?.dashboardLocation?.coordinates;
        const lat = location?.lat || 20.5937; // Fallback to India center
        const lon = location?.lng || 78.9629;
        const apiKey = process.env.OPENWEATHER_API_KEY; // Use an env var for this!

        if (!apiKey) throw new Error("OpenWeather API key is missing.");

        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        return {
            temperature: response.data.main.temp,
            humidity: response.data.main.humidity
        };
    } catch (err) {
        console.warn('Weather API failed, using default values:', err.message);
        return { temperature: 25, humidity: 70 };
    }
}

// Helper: build Google Static Map URL with numbered crop labels around center
function buildStaticMapWithCrops(lat, lng, crops) {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY || lat == null || lng == null) return null;

    // Small offsets so markers don't overlap (approx ~500m depending on lat)
    const delta = 0.01;
    const offsets = [
        { dx: 0, dy: 0 },
        { dx: delta, dy: 0 },
        { dx: -delta, dy: 0 },
        { dx: 0, dy: delta },
        { dx: 0, dy: -delta },
    ];

    const markerParams = crops.slice(0, 5).map((crop, index) => {
        const label = String(index + 1); // 1..5
        const off = offsets[index] || offsets[0];
        const mlat = lat + off.dy;
        const mlng = lng + off.dx;
        return `markers=color:green%7Clabel:${encodeURIComponent(label)}%7C${mlat},${mlng}`;
    });

    const size = '640x320';
    const base = 'https://maps.googleapis.com/maps/api/staticmap';
    const params = [`center=${lat},${lng}`, 'zoom=12', `size=${size}`, ...markerParams, `key=${GOOGLE_API_KEY}`].join('&');
    return `${base}?${params}`;
}

// Map API: build static map with top-5 crop labels given coords and crops
app.post('/api/map', async (req, res) => {
    try {
        const { lat, lng, crops } = req.body || {};
        if (lat == null || lng == null || !Array.isArray(crops) || crops.length === 0) {
            return res.status(400).json({ error: 'lat, lng and crops[] are required' });
        }
        const url = buildStaticMapWithCrops(Number(lat), Number(lng), crops);
        if (!url) {
            return res.status(500).json({ error: 'Failed to build map url' });
        }
        return res.json({ success: true, mapUrl: url });
    } catch (err) {
        console.error('Map API error:', err.message);
        return res.status(500).json({ error: 'Map API failed', details: err.message });
    }
});

// Production Estimation API using ML model
app.post('/api/production-estimation', authenticateToken, async (req, res) => {
    try {
        // Allow payload crop/area override when user selects manually
        const bodyArea = Number(req.body?.areaHectare);
        const bodyCrop = req.body?.crop;
        // Get user profile data for fallback
        const user = await User.findById(req.user.userId).select('profile');
        if (!user) {
            return res.status(400).json({ error: 'User not found.' });
        }

        // Use provided data or fallback to profile data
        const areaHectare = bodyArea || user.profile?.areaHectare;
        const crop = bodyCrop || user.profile?.crop;

        // For crop selection, require the data to be provided in the request
        if (!areaHectare || !crop) {
            return res.status(400).json({
                error: 'Area and crop information missing. Please provide crop and area.',
                details: 'Both crop and areaHectare are required for production estimation.'
            });
        }

        // Validate area limit: maximum 2 hectares per user per crop
        if (areaHectare > 2) {
            return res.status(400).json({
                error: 'Area limit exceeded',
                details: 'Maximum allowed area is 2 hectares per crop selection.',
                maxArea: 2,
                providedArea: areaHectare
            });
        }

        // Check if user already has 5 crops selected
        const existingCrops = await UserSelection.countDocuments({
            userId: req.user.userId
        });

        if (existingCrops >= 5) {
            return res.status(400).json({
                error: 'Crop limit exceeded',
                details: 'Maximum allowed crops per user is 5. Please remove existing crops to add new ones.',
                maxCrops: 5,
                currentCrops: existingCrops
            });
        }

        // Check if user already has this specific crop
        const existingCrop = await UserSelection.findOne({
            userId: req.user.userId,
            cropLower: crop.toLowerCase()
        });

        if (existingCrop) {
            return res.status(400).json({
                error: 'Crop already selected',
                details: `You have already selected ${crop}. Each crop can only be selected once.`,
                existingCrop: crop
            });
        }

        // Get location data for state and district
        let state = 'Unknown', district = 'Unknown';
        try {
            const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
            if (GOOGLE_API_KEY) {
                const geoResp = await axios.post(`https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`, { considerIp: true });
                const { lat, lng } = geoResp.data.location;

                const revResp = await axios.get(
                    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${GOOGLE_API_KEY}`
                );

                if (revResp.data.status === 'OK' && revResp.data.results.length > 0) {
                    const components = revResp.data.results[0].address_components;
                    const findType = t => components.find(c => c.types.includes(t))?.long_name || '';
                    district = findType('administrative_area_level_2') || findType('locality') || findType('sublocality');
                    state = findType('administrative_area_level_1');
                }
            }
        } catch (locErr) {
            console.warn('Location fetch failed for production estimation:', locErr.message);
        }

        // Determine current season
        const currentSeason = determineSeason();

        // Handle area scaling for areas < 1 hectare
        const originalArea = parseFloat(areaHectare);
        const modelArea = originalArea < 1 ? 1 : originalArea; // Always predict for at least 1 hectare
        const scalingFactor = originalArea / modelArea;

        // Prepare data for production estimation model
        const estimationData = {
            Area: modelArea, // Use 1 hectare minimum for model
            State_Name: state,
            District_Name: district,
            Season: currentSeason,
            Crop: crop
        };

        console.log('🌾 Production estimation request:', estimationData, `(scaling factor: ${scalingFactor})`);
        console.log('📍 Location data for UserSelection:', {
            state: req.body.state || state,
            district: req.body.district || district
        });

        // Call production estimation ML model API
        const mlResponse = await axios.post(`${process.env.ML_API_URL}/api/predict-yield`, estimationData);
        console.log('📊 Production estimation response:', mlResponse.data);

        if (mlResponse.data && mlResponse.data.predicted_yield !== undefined) {
            const estimatedYieldPerHectare = mlResponse.data.predicted_yield;
            const actualYield = estimatedYieldPerHectare * scalingFactor; // Scale for actual area

            // Determine production cycle
            const currentCycle = await determineCycle(crop, district, state, currentSeason);

            // Persist user selection and update region aggregate
            try {
                const userSelection = new UserSelection({
                    userId: req.user.userId,
                    crop,
                    cropLower: String(crop).toLowerCase(),
                    areaHectare: originalArea,
                    originalArea: originalArea < 1 ? originalArea : null,
                    estimatedYield: estimatedYieldPerHectare,
                    actualYield: actualYield,
                    totalProduction: actualYield,
                    season: currentSeason,
                    seasonLower: String(currentSeason).toLowerCase(),
                    state: req.body.state || state,
                    stateLower: String(req.body.state || state || '').toLowerCase(),
                    district: req.body.district || district,
                    districtLower: String(req.body.district || district || '').toLowerCase(),
                    cycle: currentCycle,
                    createdAt: new Date() // Explicitly set the crop selection date
                });
                await userSelection.save();

                // Upsert region aggregate - add production as-is without multiplication
                await RegionProduction.findOneAndUpdate(
                    {
                        cropLower: String(crop).toLowerCase(),
                        stateLower: String(req.body.state || state || '').toLowerCase(),
                        districtLower: String(req.body.district || district || '').toLowerCase(),
                        seasonLower: String(currentSeason).toLowerCase(),
                        cycle: currentCycle // Add cycle to the query for proper aggregation
                    },
                    {
                        $inc: {
                            totalProduction: Number(actualYield), // Add actual production value as-is
                            submissionsCount: 1
                        },
                        $set: {
                            updatedAt: new Date(),
                            crop: crop,
                            state: req.body.state || state,
                            district: req.body.district || district,
                            season: currentSeason,
                            cycle: currentCycle
                        }
                    },
                    { upsert: true }
                );
            } catch (persistErr) {
                console.warn('Failed to persist selection/region aggregate:', persistErr.message);
            }

            res.json({
                success: true,
                production: {
                    estimatedYield: estimatedYieldPerHectare,
                    actualYield: actualYield,
                    unit: 'tonnes/hectare',
                    area: originalArea,
                    totalProduction: actualYield,
                    crop: crop,
                    season: currentSeason,
                    cycle: currentCycle,
                    location: {
                        state: req.body.state || state,
                        district: req.body.district || district
                    },
                    scalingInfo: originalArea < 1 ? {
                        originalArea: originalArea,
                        modelArea: modelArea,
                        scalingFactor: scalingFactor
                    } : null
                },
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Invalid response from production estimation model');
        }

    } catch (err) {
        console.error('❌ Production estimation error:', err);
        res.status(500).json({
            error: 'Failed to get production estimation',
            details: err.message
        });
    }
});

// Get production estimates for all crops in dashboard
app.post('/api/production-estimates-all', authenticateToken, async (req, res) => {
    try {
        // Get user profile data
        const user = await User.findById(req.user.userId).select('profile');
        if (!user || !user.profile) {
            return res.status(400).json({ error: 'User profile not found. Please complete your profile first.' });
        }

        const { areaHectare } = user.profile;
        if (!areaHectare) {
            return res.status(400).json({ error: 'Area information missing in profile. Please update your profile.' });
        }

        // Get location data for state and district
        let state = 'Unknown', district = 'Unknown';
        try {
            const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
            if (GOOGLE_API_KEY) {
                const geoResp = await axios.post(`https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`, { considerIp: true });
                const { lat, lng } = geoResp.data.location;

                const revResp = await axios.get(
                    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${GOOGLE_API_KEY}`
                );

                if (revResp.data.status === 'OK' && revResp.data.results.length > 0) {
                    const components = revResp.data.results[0].address_components;
                    const findType = t => components.find(c => c.types.includes(t))?.long_name || '';
                    district = findType('administrative_area_level_2') || findType('locality') || findType('sublocality');
                    state = findType('administrative_area_level_1');
                }
            }
        } catch (locErr) {
            console.warn('Location fetch failed for production estimation:', locErr.message);
        }

        // Determine current season
        const currentSeason = determineSeason();

        // Get crop predictions first to know which crops to estimate
        const soil = await SoilData.findOne({ userId: req.user.userId });
        if (!soil || soil.nitrogen == null || soil.phosphorus == null || soil.potassium == null || soil.ph == null || !soil.soilType) {
            return res.status(400).json({ error: 'Soil data incomplete. Please update your profile with N, P, K, pH, and soil type.' });
        }

        // Get weather data
        const weatherData = await getCurrentWeatherData();

        // Prepare data for crop prediction
        const predictionData = {
            SOIL_PH: parseFloat(soil.ph),
            TEMP: weatherData.temperature,
            RELATIVE_HUMIDITY: weatherData.humidity,
            N: parseFloat(soil.nitrogen),
            P: parseFloat(soil.phosphorus),
            K: parseFloat(soil.potassium),
            SOIL: soil.soilType,
            SEASON: currentSeason
        };

        // Get crop predictions
        const cropResponse = await axios.post('process.env.ML_API_URL/', predictionData);
        const topCrops = cropResponse.data.top_crops;

        // Get production estimates for top 5 crops
        const productionEstimates = [];
        for (const [crop, probability] of Object.entries(topCrops).slice(0, 5)) {
            try {
                const estimationData = {
                    Area: parseFloat(areaHectare),
                    State_Name: state,
                    District_Name: district,
                    Season: currentSeason,
                    Crop: crop
                };

                const mlResponse = await axios.post(`${process.env.ML_API_URL}/api/predict-yield`, estimationData);

                if (mlResponse.data && mlResponse.data.prediction !== undefined) {
                    const estimatedProduction = mlResponse.data.prediction;
                    productionEstimates.push({
                        crop: crop,
                        probability: Math.round(probability * 100),
                        estimatedYield: estimatedProduction,
                        unit: 'quintals/hectare',
                        area: areaHectare,
                        totalProduction: estimatedProduction * areaHectare,
                        season: currentSeason,
                        location: {
                            state: state,
                            district: district
                        }
                    });
                }
            } catch (cropErr) {
                console.warn(`Failed to get production estimate for ${crop}:`, cropErr.message);
                // Add crop with error status
                productionEstimates.push({
                    crop: crop,
                    probability: Math.round(probability * 100),
                    estimatedYield: null,
                    unit: 'quintals/hectare',
                    area: areaHectare,
                    totalProduction: null,
                    season: currentSeason,
                    location: {
                        state: state,
                        district: district
                    },
                    error: 'Estimation failed'
                });
            }
        }

        res.json({
            success: true,
            estimates: productionEstimates,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('❌ Production estimates error:', err);
        res.status(500).json({
            error: 'Failed to get production estimates',
            details: err.message
        });
    }
});

// Helper function to determine production cycle
async function determineCycle(crop, district, state, season) {
    try {
        // Count existing selections for this crop/district/state/season in current month
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

        // Determine cycle based on existing selections (simple logic)
        // Cycle 1: 0-50 selections, Cycle 2: 51-100, Cycle 3: 101+
        if (existingSelections <= 50) return 1;
        else if (existingSelections <= 100) return 2;
        else return 3;
    } catch (err) {
        console.warn('Failed to determine cycle:', err.message);
        return 1; // Default to cycle 1
    }
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}

// Get crop details with regional production and threshold analysis
app.get('/api/crop-details/:cropName', authenticateToken, async (req, res) => {
    try {
        console.log(`🔍 Crop details request for: ${req.params.cropName} by user: ${req.user.userId}`);

        const { cropName } = req.params;
        const crop = cropName.toLowerCase();

        // Check if location is passed from dashboard via query params
        let state = req.query.state;
        let district = req.query.district;
        let userLocation = null;

        if (req.query.lat && req.query.lng) {
            userLocation = {
                lat: parseFloat(req.query.lat),
                lng: parseFloat(req.query.lng)
            };
        }

        // If no location passed from dashboard, use stored location as fallback
        if (!state || !district) {
            try {
                const userProfile = await User.findById(req.user.userId);
                if (userProfile && userProfile.dashboardLocation &&
                    userProfile.dashboardLocation.state && userProfile.dashboardLocation.district) {
                    state = userProfile.dashboardLocation.state;
                    district = userProfile.dashboardLocation.district;
                    userLocation = userProfile.dashboardLocation.coordinates || null;
                    console.log(`📍 Using stored dashboard location: ${district}, ${state}`);
                } else {
                    console.log('📡 No stored location found, attempting fresh location detection...');

                    // Fallback: Try to get fresh location using Google API
                    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
                    const GEOCODING_API_KEY = process.env.GOOGLE_API_KEY; // Use same key for geocoding

                    if (GOOGLE_API_KEY) {
                        try {
                            console.log('📡 Getting fresh location for crop details...');

                            // Get coordinates using geolocation API
                            const geoPayload = { considerIp: true };
                            const geoResp = await axios.post(`https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`, geoPayload, {
                                timeout: 10000
                            });
                            const { lat, lng } = geoResp.data.location;
                            userLocation = { lat, lng };

                            // Get address using geocoding API
                            const revResp = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${GEOCODING_API_KEY}`, {
                                timeout: 10000
                            });

                            if (revResp.data.status === 'OK' && revResp.data.results.length > 0) {
                                const components = revResp.data.results[0].address_components;
                                const findType = t => components.find(c => c.types.includes(t))?.long_name || '';
                                district = findType('administrative_area_level_2') || findType('locality') || findType('sublocality');
                                state = findType('administrative_area_level_1');

                                console.log(`📍 Fresh location detected: ${district}, ${state} (${lat}, ${lng})`);

                                // Store this location for future use
                                try {
                                    await User.findByIdAndUpdate(req.user.userId, {
                                        dashboardLocation: {
                                            state,
                                            district,
                                            coordinates: { lat, lng },
                                            lastUpdated: new Date(),
                                            method: 'crop-details-fallback'
                                        }
                                    });
                                    console.log('✅ Stored fresh location for future use');
                                } catch (storeErr) {
                                    console.warn('⚠️ Failed to store fresh location:', storeErr.message);
                                }
                            } else {
                                throw new Error('Geocoding failed');
                            }
                        } catch (apiErr) {
                            console.warn('⚠️ Fresh location detection failed:', apiErr.message);
                            console.log('🔄 Using fallback location');
                            state = 'Karnataka';
                            district = 'Bangalore Urban';
                            userLocation = { lat: 12.9716, lng: 77.5946 };
                        }
                    } else {
                        console.warn('⚠️ Google API key not configured, using fallback location');
                        state = 'Karnataka';
                        district = 'Bangalore Urban';
                        userLocation = { lat: 12.9716, lng: 77.5946 };
                    }
                }
            } catch (err) {
                console.error('❌ Database error getting user profile:', err.message);
                // Use fallback location even if database fails
                state = 'Karnataka';
                district = 'Bangalore Urban';
                userLocation = { lat: 12.9716, lng: 77.5946 };
                console.log('🔄 Using fallback location due to database error');
            }
        }

        const currentSeason = determineSeason();

        // Calculate current cycle first (needed for queries)
        const currentCycle = await determineCycle(crop, district, state, currentSeason);

        // Load processed_cycles.json for threshold data
        const fs = require('fs');
        const path = require('path');
        let thresholdData = null;
        try {
            const processedCyclesPath = path.join(__dirname, 'processed_cycles.json');
            console.log('🔍 Looking for processed_cycles.json at:', processedCyclesPath);

            if (fs.existsSync(processedCyclesPath)) {
                const processedCycles = JSON.parse(fs.readFileSync(processedCyclesPath, 'utf8'));

                const stateKey = String(state).toLowerCase();
                const districtKey = String(district).toLowerCase();
                const seasonKey = String(currentSeason).toLowerCase();
                const cropKey = crop;

                console.log(`🔍 Looking for: ${stateKey} -> ${districtKey} -> ${seasonKey} -> ${cropKey}`);

                // Apply district name mapping for consistency
                const districtMapping = {
                    'mysore_division': 'mysore',
                    'bangalore_division': 'bengaluru_urban',
                    'bangalore_urban': 'bengaluru_urban',
                    'bengaluru_urban': 'bengaluru_urban',
                    'belagavi': 'belgaum',
                    'belgaum': 'belgaum',
                    'bagalkot': 'bagalkot'
                };

                let mappedDistrictKey = districtKey.replace(/\s+/g, '_');
                if (districtMapping[mappedDistrictKey]) {
                    console.log(`🔄 Mapping district: ${mappedDistrictKey} -> ${districtMapping[mappedDistrictKey]}`);
                    mappedDistrictKey = districtMapping[mappedDistrictKey];
                }

                // First try district-specific data
                thresholdData = processedCycles?.[stateKey]?.districts?.[mappedDistrictKey]?.[seasonKey]?.[cropKey];

                if (thresholdData) {
                    console.log('✅ Found district-specific threshold data for crop');
                } else {
                    console.log('⚠️ District data not found, checking surrounding districts...');

                    // Define surrounding districts for major regions (simplified approach)
                    const surroundingDistricts = {
                        'mysore division': ['mandya', 'hassan', 'chamarajanagar', 'kodagu'],
                        'bangalore urban': ['bangalore rural', 'ramanagara', 'tumkur', 'kolar'],
                        'belagavi': ['bagalkot', 'dharwad', 'uttara kannada', 'gadag'],
                        'bagalkot': ['belagavi', 'bijapur', 'gadag', 'dharwad'],
                        'mandya': ['mysore division', 'hassan', 'ramanagara', 'tumkur']
                    };

                    // Check surrounding districts first
                    const currentDistrictKey = districtKey.replace(/\s+/g, ' ');
                    const nearbyDistricts = surroundingDistricts[currentDistrictKey] || [];

                    for (const nearbyDistrict of nearbyDistricts) {
                        const nearbyKey = nearbyDistrict.toLowerCase().replace(/\s+/g, ' ');
                        const nearbyData = processedCycles?.[stateKey]?.districts?.[nearbyKey]?.[seasonKey]?.[cropKey];
                        if (nearbyData) {
                            thresholdData = nearbyData;
                            console.log(`✅ Found threshold data from nearby district: ${nearbyDistrict}`);
                            break;
                        }
                    }

                    // If no nearby district data, fallback to any district in the state
                    if (!thresholdData) {
                        console.log('⚠️ No nearby district data found, checking state-level data...');
                        const stateData = processedCycles?.[stateKey]?.districts;
                        if (stateData) {
                            for (const [districtName, districtData] of Object.entries(stateData)) {
                                const cropData = districtData?.[seasonKey]?.[cropKey];
                                if (cropData) {
                                    thresholdData = cropData;
                                    console.log(`✅ Found state-level threshold data from district: ${districtName}`);
                                    break;
                                }
                            }
                        }
                    }

                    if (!thresholdData) {
                        console.log('⚠️ No threshold data found for this crop in any location');
                    }
                }
            } else {
                console.warn('❌ processed_cycles.json file not found at path:', processedCyclesPath);
            }
        } catch (err) {
            console.error('❌ Failed to load processed_cycles.json:', err.message);
        }

        // Get actual farmer production data directly from UserSelection for current cycle/season/district
        // Use exact district name from dashboard location
        const districtVariations = [
            String(district).toLowerCase()
        ];

        const currentCycleFarmerProduction = await UserSelection.aggregate([
            {
                $match: {
                    cropLower: crop,
                    districtLower: { $in: districtVariations },
                    stateLower: String(state).toLowerCase(),
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

        // Get district-level production for current season
        const districtProduction = await UserSelection.aggregate([
            {
                $match: {
                    cropLower: crop,
                    districtLower: { $in: districtVariations },
                    stateLower: String(state).toLowerCase(),
                    seasonLower: String(currentSeason).toLowerCase()
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

        // Get cycle-wise production data (actual farmer production)
        const cycleProduction = await UserSelection.aggregate([
            {
                $match: {
                    cropLower: crop,
                    districtLower: { $in: districtVariations },
                    stateLower: String(state).toLowerCase(),
                    seasonLower: String(currentSeason).toLowerCase()
                }
            },
            {
                $group: {
                    _id: '$cycle',
                    totalProduction: { $sum: '$totalProduction' },
                    count: { $sum: 1 },
                    avgYield: { $avg: '$actualYield' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Get season-level production for current district
        const seasonRegionProduction = await RegionProduction.aggregate([
            {
                $match: {
                    cropLower: crop,
                    stateLower: String(state).toLowerCase(),
                    districtLower: { $in: districtVariations },
                    seasonLower: String(currentSeason).toLowerCase()
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

        // Get state-level production (from RegionProduction aggregates)
        const stateRegionProduction = await RegionProduction.aggregate([
            {
                $match: {
                    cropLower: crop,
                    stateLower: String(state).toLowerCase(),
                    seasonLower: String(currentSeason).toLowerCase()
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

        // Also get state-level production from UserSelection for better accuracy
        const stateUserProduction = await UserSelection.aggregate([
            {
                $match: {
                    cropLower: crop,
                    stateLower: String(state).toLowerCase(),
                    seasonLower: String(currentSeason).toLowerCase()
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

        // Also get cycle-specific production from RegionProduction for better accuracy
        const cycleRegionProduction = await RegionProduction.aggregate([
            {
                $match: {
                    cropLower: crop,
                    stateLower: String(state).toLowerCase(),
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

        // Calculate threshold analysis using processed_cycles.json data
        const currentCycleData = cycleProduction.find(c => c._id === currentCycle);
        // Use both UserSelection and RegionProduction data for more accurate current cycle production
        const actualCurrentCycleProduction = Math.max(
            currentCycleFarmerProduction[0]?.totalProduction || 0,
            cycleRegionProduction[0]?.totalProduction || 0
        );

        console.log(`📊 Current cycle: ${currentCycle}, Actual production: ${actualCurrentCycleProduction}`);

        // Use max_production from processed_cycles.json as threshold (use raw values)
        let threshold = 0.1; // Default fallback threshold in raw units
        let maxCycleProduction = 0.1;
        let avgCycleProduction = 0.05;
        let seasonMaxProduction = 0.3;
        let stateMaxProduction = 0.3;

        if (thresholdData) {
            // Get max and avg production for current cycle from processed_cycles.json (use raw values)
            const cycleKey = `cycle_${currentCycle}`;
            const cycleData = thresholdData.standard_cycles?.[cycleKey];

            // Use actual values from processed_cycles.json without any fallback to 0.1
            maxCycleProduction = cycleData?.max_production || 0;
            avgCycleProduction = cycleData?.avg_production || 0;
            seasonMaxProduction = thresholdData.season_total?.production || 0;

            // Set threshold as 70% of max production capacity (more realistic)
            threshold = maxCycleProduction * 0.7;

            console.log(`✅ Threshold data found - Max: ${maxCycleProduction}, Avg: ${avgCycleProduction}, Threshold: ${threshold}`);

            // Calculate state-wise threshold by summing all districts in the state for this crop
            let stateTotal = 0;
            // Re-read processedCycles since it's scoped inside the try block above
            try {
                const processedCyclesPath = path.join(__dirname, 'processed_cycles.json');
                if (fs.existsSync(processedCyclesPath)) {
                    const processedCyclesData = JSON.parse(fs.readFileSync(processedCyclesPath, 'utf8'));
                    if (processedCyclesData && processedCyclesData[state.toLowerCase()]) {
                        const stateDistricts = processedCyclesData[state.toLowerCase()].districts;
                        if (stateDistricts) {
                            for (const [districtName, districtData] of Object.entries(stateDistricts)) {
                                const districtCropData = districtData?.[currentSeason.toLowerCase()]?.[crop];
                                if (districtCropData?.season_total?.production) {
                                    stateTotal += districtCropData.season_total.production;
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('Failed to calculate state threshold:', err.message);
            }
            stateMaxProduction = stateTotal || seasonMaxProduction; // Fallback to district season if no state data

        } else {
            // Fallback: use default values or calculate from existing data
            const totalCycleProduction = cycleProduction.reduce((sum, c) => sum + c.totalProduction, 0);
            if (totalCycleProduction > 0) {
                const avgCycleProductionFallback = totalCycleProduction / Math.max(cycleProduction.length, 1);
                threshold = avgCycleProductionFallback * 0.8;
                maxCycleProduction = avgCycleProductionFallback * 1.5;
                avgCycleProduction = avgCycleProductionFallback;
            }
        }

        // Determine if threshold is reached
        const thresholdReached = actualCurrentCycleProduction >= threshold;

        // Prepare cycle data for response
        const cycleData = cycleProduction.map(c => ({
            cycle: c._id,
            production: c.totalProduction, // Actual farmer production in tonnes
            farmers: c.count,
            avgYield: c.avgYield, // Actual farmer yield in tonnes
            threshold: thresholdData ?
                (thresholdData.standard_cycles?.[`cycle_${c._id}`]?.max_production || 0) : 0 // Threshold for this cycle
        }));

        // Get stored dashboard location coordinates for map display or use fresh location
        let mapCoordinates = userLocation || null;

        if (!mapCoordinates) {
            try {
                const userProfile = await User.findById(req.user.userId);
                if (userProfile && userProfile.dashboardLocation && userProfile.dashboardLocation.coordinates &&
                    userProfile.dashboardLocation.coordinates.lat && userProfile.dashboardLocation.coordinates.lng) {
                    mapCoordinates = userProfile.dashboardLocation.coordinates;
                    console.log(`📍 Using stored dashboard coordinates for map: ${mapCoordinates.lat}, ${mapCoordinates.lng}`);
                } else {
                    console.warn('⚠️ No valid dashboard coordinates found for user, attempting to detect location');
                    // Fallback: try to get location using IP geolocation
                    try {
                        const geoResp = await axios.post(`https://www.googleapis.com/geolocation/v1/geolocate?key=${process.env.GOOGLE_API_KEY}`, { considerIp: true });
                        const { lat, lng } = geoResp.data.location;
                        mapCoordinates = { lat, lng };
                        console.log(`📍 Using IP-based coordinates for map: ${lat}, ${lng}`);
                    } catch (geoErr) {
                        console.warn('Failed to get IP-based location:', geoErr.message);
                        mapCoordinates = { lat: 15.3173, lng: 75.7139 }; // Default to Karnataka center
                    }
                }
            } catch (err) {
                console.warn('Failed to get user coordinates:', err.message);
                mapCoordinates = { lat: 15.3173, lng: 75.7139 }; // Default to Karnataka center
            }
        }

        // Return comprehensive crop details with user location coordinates
        return res.json({
            success: true,
            cropDetails: {
                crop: cropName,
                location: {
                    state: state,
                    district: district
                },
                coordinates: mapCoordinates, // User's actual location for map center
                season: currentSeason,
                currentCycle: currentCycle,
                thresholds: {
                    cycleMax: maxCycleProduction,
                    cycleAvg: avgCycleProduction,
                    seasonMax: seasonMaxProduction,
                    stateMax: stateMaxProduction
                },
                regional: {
                    cycle: {
                        totalProduction: actualCurrentCycleProduction,
                        submissions: currentCycleFarmerProduction[0]?.farmerCount || 0
                    },
                    season: {
                        totalProduction: Math.max(
                            districtProduction[0]?.totalProduction || 0,
                            seasonRegionProduction[0]?.totalProduction || 0
                        ),
                        submissions: Math.max(
                            districtProduction[0]?.farmerCount || 0,
                            seasonRegionProduction[0]?.totalSubmissions || 0
                        )
                    },
                    state: {
                        totalProduction: Math.max(
                            stateUserProduction[0]?.totalProduction || 0,
                            stateRegionProduction[0]?.totalProduction || 0
                        ),
                        submissions: Math.max(
                            stateUserProduction[0]?.farmerCount || 0,
                            stateRegionProduction[0]?.totalSubmissions || 0
                        )
                    }
                },
                cycles: {
                    threshold: {
                        reached: actualCurrentCycleProduction >= threshold,
                        current: actualCurrentCycleProduction,
                        value: threshold,
                        percentage: threshold > 0 ? Math.round((actualCurrentCycleProduction / threshold) * 100) : 0
                    },
                    data: cycleProduction.map(cycle => ({
                        cycle: cycle._id,
                        production: cycle.totalProduction,
                        farmers: cycle.count,
                        avgYield: cycle.avgYield
                    }))
                }
            }
        });
    } catch (err) {
        console.error('❌ Crop details error:', err);
        res.status(500).json({
            error: 'Failed to get crop details',
            details: err.message
        });
    }
});

// Get states and districts for dropdown selection
app.get('/api/locations', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Getting states and districts for dropdown');

        const path = require('path');
        const processedCyclesPath = path.join(__dirname, 'processed_cycles.json');

        if (!fs.existsSync(processedCyclesPath)) {
            return res.status(404).json({
                error: 'Location data not found'
            });
        }

        const processedCycles = JSON.parse(fs.readFileSync(processedCyclesPath, 'utf8'));

        // Extract states and districts from processed_cycles.json
        const states = [];
        const districtsByState = {};

        for (const [stateName, stateData] of Object.entries(processedCycles)) {
            if (stateData?.districts) {
                states.push(stateName);
                districtsByState[stateName] = [];

                for (const [districtName, districtData] of Object.entries(stateData.districts)) {
                    districtsByState[stateName].push(districtName);
                }
            }
        }

        res.json({
            success: true,
            states: states.sort(),
            districtsByState: districtsByState
        });

    } catch (err) {
        console.error('❌ Failed to get locations:', err);
        res.status(500).json({
            error: 'Failed to get location data',
            details: err.message
        });
    }
});

// Get region aggregate production for a crop at current season/state/district
app.get('/api/region-production', authenticateToken, async (req, res) => {
    try {
        const { crop } = req.query;
        if (!crop) return res.status(400).json({ error: 'crop is required' });

        // Use stored dashboard location for consistency
        let state = null, district = null;
        try {
            const userProfile = await User.findById(req.user.userId);
            if (userProfile && userProfile.dashboardLocation && userProfile.dashboardLocation.state) {
                state = userProfile.dashboardLocation.state;
                district = userProfile.dashboardLocation.district;
                console.log(`📍 Region production using stored location: ${state}, ${district}`);
            } else {
                return res.status(400).json({
                    error: 'Location not available. Please visit dashboard first to detect your location.'
                });
            }
        } catch (err) {
            console.error('Failed to get stored location for region production:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve location data' });
        }

        const season = determineSeason();
        const doc = await RegionProduction.findOne({
            cropLower: String(crop).toLowerCase(),
            stateLower: String(state || '').toLowerCase(),
            districtLower: String(district || '').toLowerCase(),
            seasonLower: String(season).toLowerCase()
        });

        res.json({
            success: true, region: {
                crop,
                state,
                district,
                season,
                totalProduction: doc?.totalProduction || 0,
                submissionsCount: doc?.submissionsCount || 0,
                updatedAt: doc?.updatedAt || null
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch region production' });
    }
});

app.get('/', (req, res) => {
    res.send('FarmFlow API is running. Connect via the frontend application.');
});

// Get region production data by coordinates (for map click functionality)
app.get('/api/region-data/:lat/:lng/:cropName', authenticateToken, async (req, res) => {
    try {
        const { lat, lng, cropName } = req.params;
        const crop = cropName.toLowerCase();

        console.log(`🗺️ Getting region data for: ${lat}, ${lng} - Crop: ${crop}`);

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }

        if (!crop) {
            return res.status(400).json({ error: 'Crop parameter is required' });
        }

        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
        if (!GOOGLE_MAPS_API_KEY) {
            return res.status(500).json({
                error: 'Google Maps API key not configured'
            });
        }

        // Get location details for clicked coordinates
        const revResp = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=en&key=${GOOGLE_MAPS_API_KEY}`
        );

        let clickedDistrict = 'Unknown', clickedState = 'Unknown', actualLocationName = 'Unknown Location', specificLocation = 'Unknown';
        if (revResp.data.status === 'OK' && revResp.data.results.length > 0) {
            const components = revResp.data.results[0].address_components;
            const findType = t => components.find(c => c.types.includes(t))?.long_name || '';

            // Get the most specific location name for popup display
            actualLocationName = revResp.data.results[0].formatted_address;

            // Extract specific city/locality for popup (like Mandya, Mysuru)
            specificLocation = findType('locality') || findType('sublocality_level_1') || findType('administrative_area_level_3') || findType('administrative_area_level_2');

            clickedDistrict = findType('administrative_area_level_2') || findType('locality') || findType('sublocality');
            clickedState = findType('administrative_area_level_1');

            console.log(`🌍 Geocoding API Response:`, {
                status: revResp.data.status,
                formatted_address: actualLocationName,
                specific_location: specificLocation,
                district: clickedDistrict,
                state: clickedState
            });
        } else {
            console.log(`❌ Geocoding API failed:`, revResp.data.status, revResp.data.error_message);
        }

        console.log(`📍 Clicked location: ${clickedDistrict}, ${clickedState}`);

        // Load processed_cycles.json for threshold data
        let thresholdData = null;
        try {
            const processedCyclesPath = path.join(__dirname, 'processed_cycles.json');
            if (fs.existsSync(processedCyclesPath)) {
                const processedCycles = JSON.parse(fs.readFileSync(processedCyclesPath, 'utf8'));

                // Look for threshold data in clicked location
                const stateKey = String(clickedState).toLowerCase().replace(/\s+/g, '_');
                let districtKey = String(clickedDistrict).toLowerCase().replace(/\s+/g, '_');
                const currentSeason = determineSeason().toLowerCase();

                // Apply district name mapping for consistency with crop details page
                const districtMapping = {
                    'mysore_division': 'mysore',
                    'bangalore_division': 'bengaluru urban', // Use space, not underscore
                    'bangalore_urban': 'bengaluru urban',
                    'bengaluru_urban': 'bengaluru urban',
                    'belgaum_division': 'belgaum', // Add belgaum division mapping
                    'belagavi': 'belgaum',
                    'belgaum': 'belgaum',
                    'bagalkot': 'bagalkot'
                };

                if (districtMapping[districtKey]) {
                    console.log(`🔄 Mapping district: ${districtKey} -> ${districtMapping[districtKey]}`);
                    districtKey = districtMapping[districtKey];
                }

                thresholdData = processedCycles?.[stateKey]?.districts?.[districtKey]?.[currentSeason]?.[crop];

                console.log(`🔍 Looking for threshold data: ${stateKey}.districts.${districtKey}.${currentSeason}.${crop}`);
                console.log(`📊 Threshold data found: ${!!thresholdData}`);

                // If not found in exact location, implement intelligent fallback
                if (!thresholdData) {
                    console.log(`🔄 Implementing intelligent fallback for ${crop} in ${clickedDistrict}, ${clickedState}`);

                    // Step 1: Try other districts in the same state
                    if (processedCycles[stateKey]?.districts) {
                        const availableDistricts = Object.keys(processedCycles[stateKey].districts);
                        console.log(`🔍 Searching ${availableDistricts.length} districts in ${clickedState}`);

                        for (const fallbackDistrict of availableDistricts) {
                            const fallbackData = processedCycles[stateKey].districts[fallbackDistrict]?.[currentSeason]?.[crop];
                            if (fallbackData) {
                                thresholdData = fallbackData;
                                console.log(`✅ Found fallback data in ${fallbackDistrict}`);
                                break;
                            }
                        }
                    }

                    // Step 2: Try other states if still not found
                    if (!thresholdData) {
                        console.log(`🔄 Searching other states for ${crop} data`);
                        const allStates = Object.keys(processedCycles);

                        for (const fallbackState of allStates) {
                            if (fallbackState === stateKey) continue; // Skip current state

                            const stateDistricts = processedCycles[fallbackState]?.districts;
                            if (stateDistricts) {
                                for (const fallbackDistrict of Object.keys(stateDistricts)) {
                                    const fallbackData = stateDistricts[fallbackDistrict]?.[currentSeason]?.[crop];
                                    if (fallbackData) {
                                        thresholdData = fallbackData;
                                        console.log(`✅ Found inter-state fallback data in ${fallbackDistrict}, ${fallbackState}`);
                                        break;
                                    }
                                }
                                if (thresholdData) break;
                            }
                        }
                    }

                    // Step 3: Generate dynamic threshold if still not found
                    if (!thresholdData) {
                        console.log(`🔧 Generating dynamic threshold for ${crop}`);
                        thresholdData = {
                            standard_cycles: {
                                cycle_1: { max_production: 150 },
                                cycle_2: { max_production: 180 },
                                cycle_3: { max_production: 200 }
                            },
                            season_total: { production: 530 }
                        };
                        console.log(`✅ Generated dynamic threshold data for ${crop}`);
                    }
                }

                // If not found, log available districts and crops for debugging
                if (!thresholdData && processedCycles?.[stateKey]?.districts) {
                    const availableDistricts = Object.keys(processedCycles[stateKey].districts);
                    console.log(`🔍 Available districts in ${stateKey}:`, availableDistricts.slice(0, 10));

                    // Check if the mapped district exists and what crops it has
                    if (processedCycles[stateKey].districts[districtKey]) {
                        const districtSeasons = Object.keys(processedCycles[stateKey].districts[districtKey]);
                        console.log(`🔍 Available seasons in ${districtKey}:`, districtSeasons);

                        if (processedCycles[stateKey].districts[districtKey][currentSeason]) {
                            const districtCrops = Object.keys(processedCycles[stateKey].districts[districtKey][currentSeason]);
                            console.log(`🔍 Available crops in ${districtKey}.${currentSeason}:`, districtCrops);
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to load threshold data:', err.message);
        }

        const currentSeason = determineSeason();
        const currentCycle = await determineCycle(crop, clickedDistrict, clickedState, currentSeason);

        // Ensure districtKey is available outside the try block
        let mappedDistrictKey = String(clickedDistrict).toLowerCase().replace(/\s+/g, '_');
        const districtMapping = {
            'mysore_division': 'mysore',
            'bangalore_division': 'bengaluru urban', // Use space, not underscore
            'bangalore_urban': 'bengaluru urban',
            'bengaluru_urban': 'bengaluru urban',
            'belgaum_division': 'belgaum', // Add belgaum division mapping
            'belagavi': 'belgaum',
            'belgaum': 'belgaum',
            'bagalkot': 'bagalkot'
        };

        if (districtMapping[mappedDistrictKey]) {
            mappedDistrictKey = districtMapping[mappedDistrictKey];
        }

        // Get farmer production data for clicked location using mapped district
        console.log(`🔍 Querying farmer data with: district=${clickedDistrict}, mapped=${mappedDistrictKey}`);
        const farmerProduction = await UserSelection.aggregate([
            {
                $match: {
                    cropLower: crop,
                    districtLower: String(clickedDistrict).toLowerCase(),
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

        // Get region production data
        const regionProduction = await RegionProduction.aggregate([
            {
                $match: {
                    cropLower: crop,
                    districtLower: String(clickedDistrict).toLowerCase(),
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

        // Calculate threshold and production data using same logic as crop details page
        let threshold = 0.1;
        let maxProduction = 0.1;

        console.log(`🔍 Processing threshold data: ${!!thresholdData}`);
        if (thresholdData) {
            const cycleKey = `cycle_${currentCycle}`;
            const cycleData = thresholdData.standard_cycles?.[cycleKey];
            console.log(`🔍 Cycle data for ${cycleKey}:`, cycleData ? 'Found' : 'Not found');

            if (cycleData) {
                // Use actual values from processed_cycles.json without fallback to 0.1
                maxProduction = cycleData.max_production || 0;

                // Set threshold as 70% of max production capacity (same as crop details)
                threshold = maxProduction * 0.7;

                console.log(`✅ Map threshold data - Max: ${maxProduction}, Threshold: ${threshold}`);
            } else {
                console.log(`⚠️ No cycle data found for ${cycleKey}`);
                // Try to use season total as fallback
                if (thresholdData.season_total?.production) {
                    maxProduction = thresholdData.season_total.production / 3; // Divide by 3 cycles
                    threshold = maxProduction * 0.7;
                    console.log(`🔄 Using season fallback - Max: ${maxProduction}, Threshold: ${threshold}`);
                }
            }
        } else {
            console.log(`❌ No threshold data available for ${crop} in ${clickedDistrict}`);
        }

        const actualProduction = Math.max(
            farmerProduction[0]?.totalProduction || 0,
            regionProduction[0]?.totalProduction || 0
        );

        const farmerCount = farmerProduction[0]?.farmerCount || 0;
        const avgYield = farmerProduction[0]?.avgYield || 0;

        // Calculate threshold status
        const thresholdPercentage = threshold > 0 ? Math.min((actualProduction / threshold) * 100, 100) : 0;
        const status = actualProduction >= threshold ? 'Above Threshold' : 'Below Threshold';

        return res.json({
            success: true,
            crop: cropName,
            location: {
                district: clickedDistrict,
                state: clickedState,
                actualLocationName: actualLocationName,
                specificLocation: specificLocation, // Add specific city/locality name
                coordinates: { lat: latitude, lng: longitude }
            },
            production: {
                actual: actualProduction,
                threshold: threshold,
                max: maxProduction,
                percentage: thresholdPercentage,
                status: status
            },
            farmers: {
                count: farmerCount,
                avgYield: avgYield
            },
            season: currentSeason,
            cycle: currentCycle
        });

    } catch (err) {
        console.error('❌ Region data API error:', err);
        return res.status(500).json({
            error: 'Failed to get region data',
            details: err.message
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`🚀 FarmFlow server running on port ${PORT}`);
});

server.on("error", (err) => {
    console.error("❌ Server error:", err);
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Try a different port.`);
        console.error('💡 Suggestion: Kill existing processes or use a different PORT in .env file');
    }
});