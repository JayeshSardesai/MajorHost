import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Leaf, Sun } from 'lucide-react';
import T from './T';
import { useTranslation } from 'react-i18next';
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const Login = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(''); // Clear error when user types
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${apiUrl}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Store token in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect to dashboard
                navigate('/dashboard');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-soft-beige-950 p-4">
            <div className="w-full max-w-md">
                <div className="farm-card p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center mb-4">
                            <div className="relative">
                                <Leaf className="h-8 w-8 text-farm-green-500" />
                                <Sun className="h-4 w-4 text-golden-yellow-500 absolute -top-1 -right-1" />
                            </div>
                            <span className="ml-2 text-2xl font-bold text-farm-green-700 font-poppins">FarmFlow</span>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground font-poppins"><T k="login.welcome">Welcome back</T></h1>
                        <p className="text-muted-600 mt-2 font-poppins"><T k="login.subtitle">Sign in to your account</T></p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 font-poppins">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2 font-poppins">
                                <T k="login.email">Email Address</T>
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-400" />
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 border border-soft-beige-300 rounded-lg focus:ring-2 focus:ring-farm-green-500 focus:border-transparent bg-white font-poppins"
                                    placeholder={t('login.emailPlaceholder', 'Enter your email')}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2 font-poppins">
                                <T k="login.password">Password</T>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-12 py-3 border border-soft-beige-300 rounded-lg focus:ring-2 focus:ring-farm-green-500 focus:border-transparent bg-white font-poppins"
                                    placeholder={t('login.passwordPlaceholder', 'Enter your password')}
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-400 hover:text-muted-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="farm-button-primary w-full py-3 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <T k="login.signingIn">Signing in...</T> : <T k="login.signIn">Sign In</T>}
                        </button>
                    </form>

                    {/* Sign Up Link */}
                    <div className="text-center mt-6">
                        <p className="text-muted-600 font-poppins">
                            <T k="login.noAccount">Don't have an account?</T>{' '}
                            <Link to="/signup" className="text-farm-green-600 hover:text-farm-green-700 font-medium font-poppins">
                                <T k="login.signUp">Sign up</T>
                            </Link>
                        </p>
                    </div>

                    {/* Back to Landing */}
                    <div className="text-center mt-4">
                        <Link to="/" className="text-muted-500 hover:text-muted-700 text-sm font-poppins">
                            ← <T k="common.backToHome">Back to home</T>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
