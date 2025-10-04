import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Leaf, Sun } from 'lucide-react';
import T from './T';
import { useTranslation } from 'react-i18next';

const Signup = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [otp, setOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState('email'); // 'email' | 'otp' | 'details'
    const [emailSent, setEmailSent] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(''); // Clear error when user types
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: formData.email })
            });

            const data = await response.json();

            if (response.ok) {
                setEmailSent(true);
                setStep('otp');
            } else {
                setError(data.error || t('errors.failedSendOtp'));
            }
        } catch (err) {
            setError(t('errors.network'));
        } finally {
            setLoading(false);
        }
    };

    const handleOTPSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/check-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    otp
                })
            });

            const data = await response.json();

            if (response.ok) {
                setStep('details');
            } else {
                setError(data.error || t('errors.verificationFailed'));
            }
        } catch (err) {
            setError(t('errors.network'));
        } finally {
            setLoading(false);
        }
    };

    const handleDetailsSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError(t('errors.passwordsNoMatch'));
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/complete-signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    name: formData.name,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/dashboard');
            } else {
                setError(data.error || t('errors.signupFailed'));
            }
        } catch (err) {
            setError(t('errors.network'));
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
                        <h1 className="text-2xl font-bold text-foreground font-poppins">
                            {step === 'email' && <T k="signup.create">Create account</T>}
                            {step === 'otp' && <T k="signup.verifyEmail">Verify your email</T>}
                            {step === 'details' && <T k="signup.setup">Set up your account</T>}
                        </h1>
                        <p className="text-muted-600 mt-2 font-poppins">
                            {step === 'email' && <T k="signup.join">Join FarmFlow today</T>}
                            {step === 'otp' && <T k="signup.enterCode">Enter the code sent to your email</T>}
                            {step === 'details' && <T k="signup.enterName">Enter your name and create a password</T>}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 font-poppins">
                            {error}
                        </div>
                    )}

                    {/* Email Step */}
                    {step === 'email' && (
                        <form onSubmit={handleEmailSubmit} className="space-y-6">
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
                                        placeholder={t('login.emailPlaceholder')}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="farm-button-primary w-full py-3 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <T k="signup.sendingOtp">Sending OTP...</T> : <T k="signup.sendCode">Send Verification Code</T>}
                            </button>
                        </form>
                    )}

                    {/* OTP Verification Step */}
                    {step === 'otp' && (
                        <form onSubmit={handleOTPSubmit} className="space-y-6">
                            <div className="text-center mb-4">
                                <p className="text-sm text-muted-600 font-poppins">
                                    <T k="signup.sentCodeTo">We've sent a verification code to</T> <strong>{formData.email}</strong>
                                </p>
                            </div>

                            <div>
                                <label htmlFor="otp" className="block text-sm font-medium text-foreground mb-2 font-poppins">
                                    <T k="signup.verificationCode">Verification Code</T>
                                </label>
                                <input
                                    type="text"
                                    id="otp"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full px-4 py-3 border border-soft-beige-300 rounded-lg focus:ring-2 focus:ring-farm-green-500 focus:border-transparent text-center text-2xl tracking-widest bg-white font-poppins"
                                    placeholder="000000"
                                    maxLength="6"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="farm-button-primary w-full py-3 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <T k="signup.verifying">Verifying...</T> : <T k="signup.verify">Verify Code</T>}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('email')}
                                className="w-full text-muted-500 hover:text-muted-700 text-sm font-poppins"
                            >
                                ← <T k="signup.backToEmail">Back to email</T>
                            </button>
                        </form>
                    )}

                    {/* Details Step */}
                    {step === 'details' && (
                        <form onSubmit={handleDetailsSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2 font-poppins">
                                    <T k="signup.fullName">Full Name</T>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-400" />
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 border border-soft-beige-300 rounded-lg focus:ring-2 focus:ring-farm-green-500 focus:border-transparent bg-white font-poppins"
                                        placeholder={t('signup.fullName')}
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
                                        placeholder={t('login.passwordPlaceholder')}
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

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2 font-poppins">
                                    <T k="signup.confirmPassword">Confirm Password</T>
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-400" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-12 py-3 border border-soft-beige-300 rounded-lg focus:ring-2 focus:ring-farm-green-500 focus:border-transparent bg-white font-poppins"
                                        placeholder={t('login.passwordPlaceholder')}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-400 hover:text-muted-600"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="farm-button-primary w-full py-3 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <T k="signup.creating">Creating account...</T> : <T k="signup.createAccount">Create Account</T>}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('otp')}
                                className="w-full text-muted-500 hover:text-muted-700 text-sm font-poppins"
                            >
                                ← <T k="signup.backToVerification">Back to verification</T>
                            </button>
                        </form>
                    )}

                    {/* Login Link */}
                    <div className="text-center mt-6">
                        <p className="text-muted-600 font-poppins">
                            <T k="signup.already">Already have an account?</T>{' '}
                            <Link to="/login" className="text-farm-green-600 hover:text-farm-green-700 font-medium font-poppins">
                                <T k="login.signIn">Sign in</T>
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

export default Signup;
