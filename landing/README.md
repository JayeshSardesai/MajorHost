# FarmFlow - AI-Powered Crop Prediction Platform

A full-stack application that combines React frontend with Node.js backend for AI-powered crop prediction and weather integration.

## Features

- **Landing Page**: Beautiful marketing page with weather integration
- **User Authentication**: Login and signup functionality with JWT tokens
- **Dashboard**: User dashboard with farm statistics and weather data
- **Weather Integration**: Real-time weather data and 5-day forecast
- **API Integration**: RESTful API for user management and data retrieval

## Project Structure

```
landing/
├── src/
│   ├── components/
│   │   ├── Landing.tsx      # Main landing page
│   │   ├── Login.jsx        # Login component
│   │   ├── Signup.jsx       # Signup component
│   │   ├── Dashboard.jsx    # User dashboard
│   │   └── WeatherApp.tsx   # Weather component
│   ├── App.jsx              # Main app with routing
│   └── main.jsx             # Entry point
└── package.json

Backend/
├── server.js                # Express server with API routes
├── package.json
└── public/                  # Static HTML files (legacy)
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or cloud instance)
- OpenWeatherMap API key (for weather data)

## Installation & Setup

### 1. Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file in the Backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/farmflow
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-super-secret-session-key
NODE_ENV=development
```

### 2. Frontend Setup

```bash
cd landing
npm install
```

### 3. Start the Backend Server

```bash
cd Backend
npm start
```

The backend will run on `http://localhost:5000`

### 4. Start the Frontend Development Server

```bash
cd landing
npm run dev
```

The frontend will run on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/signup` - User registration

### Dashboard
- `GET /api/dashboard` - Get dashboard data (requires JWT token)

### Health Check
- `GET /api/health` - API health status

## Usage

1. **Landing Page**: Visit `http://localhost:5173` to see the main landing page
2. **Sign Up**: Click "Get Started" to create a new account
3. **Login**: Use your credentials to access the dashboard
4. **Dashboard**: View your farm statistics and weather data

## Features

### Weather Integration
- Real-time weather data based on user location
- 5-day weather forecast
- Automatic location detection (requires browser permission)

### User Authentication
- Secure JWT-based authentication
- Password hashing with bcrypt
- Session management

### Dashboard
- Farm statistics overview
- Recent crop predictions
- Weather widget integration
- Quick action buttons

## Technologies Used

### Frontend
- React 19
- React Router DOM
- Tailwind CSS
- Lucide React (icons)
- Vite (build tool)

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcrypt for password hashing
- CORS for cross-origin requests

### External APIs
- OpenWeatherMap API for weather data

## Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/farmflow
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret-key
NODE_ENV=development
```

### Frontend
The weather API key is hardcoded in `WeatherApp.tsx`. For production, move it to environment variables.

## Development

### Adding New Features
1. Create new components in `src/components/`
2. Add routes in `App.jsx`
3. Create corresponding API endpoints in `Backend/server.js`

### Styling
The project uses Tailwind CSS with custom color schemes:
- `farm-green-*` - Primary brand colors
- `soft-beige-*` - Background colors
- `golden-yellow-*` - Accent colors

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check the connection string in `.env`

2. **CORS Errors**
   - Backend is configured to allow requests from `http://localhost:5173`
   - Update CORS settings if using different ports

3. **Weather API Errors**
   - Check if the OpenWeatherMap API key is valid
   - Ensure location permissions are granted in the browser

4. **JWT Token Issues**
   - Clear localStorage and try logging in again
   - Check if the JWT_SECRET is properly set

## Production Deployment

1. Build the frontend: `npm run build`
2. Set up environment variables for production
3. Configure MongoDB for production
4. Set up proper CORS settings
5. Use HTTPS in production

## License

This project is for educational purposes.
