/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'farm-green': {
                    50: '#f1f8e9',
                    100: '#dcedc8',
                    200: '#c5e1a5',
                    300: '#aed581',
                    400: '#9ccc65',
                    500: '#8bc34a', // Primary: Fresh Green (#4CAF50)
                    600: '#7cb342',
                    700: '#689f38',
                    800: '#558b2f',
                    900: '#33691e',
                    950: '#1b5e20',
                },
                'earth-brown': {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#eeeeee',
                    300: '#e0e0e0',
                    400: '#bdbdbd',
                    500: '#9e9e9e',
                    600: '#757575',
                    700: '#616161',
                    800: '#424242',
                    900: '#212121',
                    950: '#8D6E63', // Secondary: Warm Earth Brown
                },
                'golden-yellow': {
                    50: '#fffef7',
                    100: '#fefce8',
                    200: '#fef9c3',
                    300: '#fef08a',
                    400: '#fde047',
                    500: '#FBC02D', // Accent: Golden Yellow
                    600: '#ca8a04',
                    700: '#a16207',
                    800: '#854d0e',
                    900: '#713f12',
                    950: '#422006',
                },
                'soft-beige': {
                    50: '#fefefe',
                    100: '#fdfcfb',
                    200: '#faf8f3',
                    300: '#f5f1e8',
                    400: '#f0e9d8',
                    500: '#e8dcc0',
                    600: '#d4c4a3',
                    700: '#b8a885',
                    800: '#9a8b6a',
                    900: '#7d6f55',
                    950: '#FAF3E0', // Neutral: Soft Beige
                },
                'background': '#FAF3E0',
                'foreground': '#2d2d2d',
                'card': '#ffffff',
                'muted': {
                    DEFAULT: '#8D6E63',
                    foreground: '#5d4037',
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#eeeeee',
                    300: '#e0e0e0',
                    400: '#bdbdbd',
                    500: '#9e9e9e',
                    600: '#757575',
                    700: '#616161',
                    800: '#424242',
                    900: '#212121',
                },
            },
            fontFamily: {
                'poppins': ['Poppins', 'sans-serif'],
                'lato': ['Lato', 'sans-serif'],
                'roboto': ['Roboto', 'sans-serif'],
                'open-sans': ['Open Sans', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
