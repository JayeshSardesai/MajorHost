import React, { useState } from "react";
import { Link } from "react-router-dom";
import T from "./T";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

import { 
    Leaf, 
    Sprout, 
    Tractor, 
    Sun, 
    Wheat, 
    Droplets, 
    MapPin, 
    Phone, 
    Mail, 
    ArrowRight,
    Menu,
    X,
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
    BarChart3,
    Target,
    Lightbulb
} from "lucide-react";

const Landing = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { t } = useTranslation();

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <div className="min-h-screen bg-soft-beige-950">
            {/* Navigation */}
            <header className="sticky top-0 z-30 w-full border-b border-farm-green-200 bg-white/95 backdrop-blur shadow-sm">
                <div className="container mx-auto flex h-16 items-center justify-between px-6 md:px-8 lg:px-12">
                    <div className="flex items-center">
                        <div className="relative">
                            <Leaf className="h-8 w-8 text-farm-green-500" />
                            <Sun className="h-4 w-4 text-golden-yellow-500 absolute -top-1 -right-1" />
                        </div>
                        <span className="ml-2 text-xl font-bold text-farm-green-700 font-poppins">{t("nav.farmFlow")}</span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-6">
                        <div className="relative group">
                            <a href="#features" className="text-foreground hover:text-farm-green-600 transition-colors font-medium">
                                <T k="nav.features">Features</T>
                            </a>
                            <div className="absolute top-full left-0 w-48 bg-white shadow-lg rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-soft-beige-200">
                                <a href="#crop-prediction" className="block px-4 py-2 hover:bg-farm-green-50 text-sm"><T k="features.cropPrediction.title">Crop Prediction</T></a>
                                <a href="#yield-prediction" className="block px-4 py-2 hover:bg-farm-green-50 text-sm"><T k="features.yieldPrediction.title">Yield Prediction</T></a>
                                <a href="#thresholds" className="block px-4 py-2 hover:bg-farm-green-50 text-sm"><T k="features.thresholds.title">Crop Thresholds</T></a>
                            </div>
                        </div>
                        <a href="#about" className="text-foreground hover:text-farm-green-600 transition-colors font-medium"><T k="nav.about">About</T></a>
                        <a href="#contact" className="text-foreground hover:text-farm-green-600 transition-colors font-medium"><T k="nav.contact">Contact</T></a>
                        <LanguageSwitcher inline={true} className="ml-2" />
                        <Link to="/login" className="text-foreground hover:text-farm-green-600 transition-colors font-medium"><T k="nav.login">Log in</T></Link>
                        <Link to="/signup" className="farm-button-primary">
                            <T k="nav.getStarted">Get Started</T>
                        </Link>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button onClick={toggleMenu} className="md:hidden p-2">
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-farm-green-200">
                        <div className="container mx-auto py-4 space-y-3 px-6 md:px-8 lg:px-12">
                            <a href="#features" className="block py-2 text-foreground hover:text-farm-green-600"><T k="nav.features">Features</T></a>
                            <a href="#about" className="block py-2 text-foreground hover:text-farm-green-600"><T k="nav.about">About</T></a>
                            <a href="#contact" className="block py-2 text-foreground hover:text-farm-green-600"><T k="nav.contact">Contact</T></a>
                            <div className="py-2">
                                <LanguageSwitcher inline={true} className="w-full" />
                            </div>
                            <Link to="/login" className="block py-2 text-foreground hover:text-farm-green-600"><T k="nav.login">Log in</T></Link>
                            <Link to="/signup" className="farm-button-primary w-full text-center">
                                <T k="nav.getStarted">Get Started</T>
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section className="relative py-20 md:py-32 overflow-hidden">
                <div className="hero-gradient absolute inset-0"></div>
                <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Lightbulb className="h-6 w-6 text-farm-green-500" />
                                    <span className="text-farm-green-600 font-medium"><T k="hero.badge">AI-Powered Crop Intelligence</T></span>
                                </div>
                                <h1 className="text-5xl md:text-6xl font-bold text-farm-green-800 leading-tight font-poppins">
                                    <T k="hero.title.line1">Smart Crop</T>
                                    <span className="text-golden-yellow-500 block"><T k="hero.title.line2">Prediction & Yield Analysis</T></span>
                                </h1>
                                <p className="text-xl text-muted-600 max-w-lg leading-relaxed">
                                    <T k="hero.subtitle">FarmFlow uses advanced AI to predict optimal crops, estimate yields, set smart thresholds, and suggest new crops based on your soil and climate conditions.</T>
                                </p>

                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Link to="/signup" className="farm-button-primary flex items-center justify-center sm:justify-start">
                                    <T k="hero.startPredicting">Start Predicting</T> <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                                <Link to="/login" className="farm-button-secondary flex items-center justify-center sm:justify-start">
                                    <T k="hero.accessDashboard">Access Dashboard</T>
                                </Link>

                            </div>
                        </div>

                        <div className="lg:w-1/2">
                            <div className="relative">
                                <div className="bg-white rounded-2xl p-8 shadow-2xl border border-soft-beige-200">
                                    <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-farm-green-100 to-soft-beige-100 flex items-center justify-center relative overflow-hidden">
                                        <div className="text-center relative z-10">
                                            <div className="flex items-center justify-center space-x-4 mb-6">
                                                <BarChart3 className="h-16 w-16 text-golden-yellow-500" />
                                                <Target className="h-16 w-16 text-farm-green-500" />
                                                <Lightbulb className="h-16 w-16 text-farm-green-400" />
                                            </div>
                                            <p className="text-farm-green-700 font-semibold text-lg"><T k="hero.aiCropIntelligence">AI Crop Intelligence</T></p>
                                        </div>
                                        <div className="absolute top-4 right-4">
                                            <Sun className="h-8 w-8 text-golden-yellow-400 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -bottom-4 -left-4 bg-golden-yellow-500 rounded-full p-3 shadow-lg">
                                    <Tractor className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-white">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-farm-green-800 mb-4 font-poppins"><T k="features.title">AI-Powered Farm Intelligence</T></h2>
                        <p className="text-xl text-muted-600 max-w-2xl mx-auto">
                            <T k="features.subtitle">FarmFlow provides comprehensive crop prediction and yield analysis to optimize your farming decisions.</T>
                        </p>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Crop Prediction Card */}
                        <div className="farm-card p-8 text-center group">
                            <div className="h-20 w-20 rounded-full bg-farm-green-100 flex items-center justify-center mb-6 mx-auto group-hover:bg-farm-green-200 transition-colors">
                                <Lightbulb className="h-10 w-10 text-farm-green-600" />
                            </div>
                            <h3 className="text-2xl font-semibold mb-4 text-farm-green-800 font-poppins"><T k="features.cropPrediction.title">Crop Prediction</T></h3>
                            <p className="text-muted-600 mb-6 leading-relaxed">
                                <T k="features.cropPrediction.desc">AI-powered recommendations for optimal crop selection based on soil conditions, climate, and historical data.</T>
                            </p>
                            <div className="flex items-center justify-center space-x-2 text-farm-green-600">
                                <span className="text-sm font-medium"><T k="common.learnMore">Learn More</T></span>
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        </div>

                        {/* Yield Prediction Card */}
                        <div className="farm-card p-8 text-center group">
                            <div className="h-20 w-20 rounded-full bg-golden-yellow-100 flex items-center justify-center mb-6 mx-auto group-hover:bg-golden-yellow-200 transition-colors">
                                <BarChart3 className="h-10 w-10 text-golden-yellow-600" />
                            </div>
                            <h3 className="text-2xl font-semibold mb-4 text-farm-green-800 font-poppins"><T k="features.yieldPrediction.title">Yield Prediction</T></h3>
                            <p className="text-muted-600 mb-6 leading-relaxed">
                                <T k="features.yieldPrediction.desc">Accurate yield estimates using machine learning models trained on extensive agricultural datasets.</T>
                            </p>
                            <div className="flex items-center justify-center space-x-2 text-farm-green-600">
                                <span className="text-sm font-medium"><T k="common.learnMore">Learn More</T></span>
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        </div>

                        {/* Crop Thresholds Card */}
                        <div className="farm-card p-8 text-center group">
                            <div className="h-20 w-20 rounded-full bg-earth-brown-100 flex items-center justify-center mb-6 mx-auto group-hover:bg-earth-brown-200 transition-colors">
                                <Target className="h-10 w-10 text-earth-brown-600" />
                            </div>
                            <h3 className="text-2xl font-semibold mb-4 text-farm-green-800 font-poppins"><T k="features.thresholds.title">Smart Thresholds</T></h3>
                            <p className="text-muted-600 mb-6 leading-relaxed">
                                <T k="features.thresholds.desc">Set optimal limits and thresholds for crops based on yield predictions and market conditions.</T>
                            </p>
                            <div className="flex items-center justify-center space-x-2 text-farm-green-600">
                                <span className="text-sm font-medium"><T k="common.learnMore">Learn More</T></span>
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="practices" className="py-20 bg-soft-beige-100">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-farm-green-800 mb-4 font-poppins"><T k="how.title">How FarmFlow Works</T></h2>
                        <p className="text-xl text-muted-600 max-w-2xl mx-auto">
                            <T k="how.subtitle">Our AI system analyzes multiple factors to provide accurate predictions and smart recommendations.</T>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <div className="flex items-start space-x-4">
                                <div className="h-12 w-12 rounded-full bg-farm-green-100 flex items-center justify-center flex-shrink-0">
                                    <Droplets className="h-6 w-6 text-farm-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2 text-farm-green-800 font-poppins"><T k="how.data.title">Data Analysis</T></h3>
                                    <p className="text-muted-600"><T k="how.data.desc">Analyzes soil composition, weather patterns, and historical crop performance data.</T></p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="h-12 w-12 rounded-full bg-golden-yellow-100 flex items-center justify-center flex-shrink-0">
                                    <Sun className="h-6 w-6 text-golden-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2 text-farm-green-800 font-poppins"><T k="how.ai.title">AI Prediction</T></h3>
                                    <p className="text-muted-600"><T k="how.ai.desc">Machine learning algorithms predict optimal crops and expected yields.</T></p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="h-12 w-12 rounded-full bg-earth-brown-100 flex items-center justify-center flex-shrink-0">
                                    <Target className="h-6 w-6 text-earth-brown-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2 text-farm-green-800 font-poppins"><T k="how.smart.title">Smart Recommendations</T></h3>
                                    <p className="text-muted-600"><T k="how.smart.desc">Suggests new crops and sets optimal thresholds based on predictions.</T></p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-8 shadow-xl border border-soft-beige-200">
                            <div className="aspect-square rounded-xl bg-gradient-to-br from-farm-green-50 to-soft-beige-50 flex items-center justify-center">
                                <div className="text-center">
                                    <BarChart3 className="h-24 w-24 text-farm-green-500 mx-auto mb-4" />
                                    <p className="text-farm-green-700 font-semibold text-lg"><T k="how.aiInsights">AI-Powered Insights</T></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Us Section */}
            <section id="about" className="py-20 bg-white">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl font-bold text-farm-green-800 mb-6 font-poppins"><T k="about.title">About FarmFlow</T></h2>
                            <p className="text-lg text-muted-600 mb-6 leading-relaxed">
                                <T k="about.p1">FarmFlow is an AI-powered agricultural platform that revolutionizes farming decisions through intelligent crop prediction, yield estimation, and smart threshold management.</T>
                            </p>
                            <p className="text-lg text-muted-600 mb-8 leading-relaxed">
                                <T k="about.p2">Our machine learning models analyze soil conditions, climate data, and historical patterns to provide farmers with data-driven insights for optimal crop selection and yield optimization.</T>
                            </p>
                            <Link to="#contact" className="farm-button-accent">
                                <T k="about.cta">Get Started Today</T>
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div className="bg-farm-green-50 rounded-lg p-6 text-center">
                                    <div className="text-3xl font-bold text-farm-green-600 mb-2">95%</div>
                                    <div className="text-farm-green-700 font-medium"><T k="about.predictionAccuracy">Prediction Accuracy</T></div>
                                </div>
                                <div className="bg-golden-yellow-50 rounded-lg p-6 text-center">
                                    <div className="text-3xl font-bold text-golden-yellow-600 mb-2">1000+</div>
                                    <div className="text-golden-yellow-700 font-medium"><T k="about.farmsUsing">Farms Using FarmFlow</T></div>
                                </div>
                            </div>
                            <div className="space-y-4 pt-8">
                                <div className="bg-earth-brown-50 rounded-lg p-6 text-center">
                                    <div className="text-3xl font-bold text-earth-brown-600 mb-2">24/7</div>
                                    <div className="text-earth-brown-700 font-medium"><T k="about.aiMonitoring">AI Monitoring</T></div>
                                </div>
                                <div className="bg-soft-beige-100 rounded-lg p-6 text-center">
                                    <div className="text-3xl font-bold text-soft-beige-700 mb-2">50+</div>
                                    <div className="text-soft-beige-800 font-medium"><T k="about.cropTypesSupported">Crop Types Supported</T></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-20 bg-soft-beige-100">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-farm-green-800 mb-4 font-poppins"><T k="contact.title">Ready to Optimize Your Farm?</T></h2>
                        <p className="text-xl text-muted-600 max-w-2xl mx-auto">
                            <T k="contact.subtitle">Start using AI-powered crop prediction and yield analysis to maximize your agricultural productivity.</T>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="space-y-8">
                            <div className="flex items-start space-x-4">
                                <div className="h-12 w-12 rounded-full bg-farm-green-100 flex items-center justify-center flex-shrink-0">
                                    <MapPin className="h-6 w-6 text-farm-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2 text-farm-green-800 font-poppins"><T k="contact.visit">Visit Our Office</T></h3>
                                    <p className="text-muted-600">123 AI Farm Road<br />Tech Valley, CA 90210</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="h-12 w-12 rounded-full bg-golden-yellow-100 flex items-center justify-center flex-shrink-0">
                                    <Phone className="h-6 w-6 text-golden-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2 text-farm-green-800 font-poppins"><T k="contact.call">Call Us</T></h3>
                                    <p className="text-muted-600">+1 (555) 123-4567</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="h-12 w-12 rounded-full bg-earth-brown-100 flex items-center justify-center flex-shrink-0">
                                    <Mail className="h-6 w-6 text-earth-brown-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2 text-farm-green-800 font-poppins"><T k="contact.email">Email Us</T></h3>
                                    <p className="text-muted-600">hello@farmflow.ai</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-8 shadow-xl border border-soft-beige-200">
                            <form className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder={t("contact.form.firstName")} className="w-full px-4 py-3 border border-soft-beige-300 rounded-lg focus:ring-2 focus:ring-farm-green-500 focus:border-transparent" />
                                    <input type="text" placeholder={t("contact.form.lastName")} className="w-full px-4 py-3 border border-soft-beige-300 rounded-lg focus:ring-2 focus:ring-farm-green-500 focus:border-transparent" />
                                </div>
                                <input type="email" placeholder={t("contact.form.email")} className="w-full px-4 py-3 border border-soft-beige-300 rounded-lg focus:ring-2 focus:ring-farm-green-500 focus:border-transparent" />
                                <textarea placeholder={t("contact.form.message")} rows={4} className="w-full px-4 py-3 border border-soft-beige-300 rounded-lg focus:ring-2 focus:ring-farm-green-500 focus:border-transparent"></textarea>
                                <button type="submit" className="farm-button-primary w-full">
                                    <T k="contact.form.submit">Get Started with FarmFlow</T>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-farm-green-800 text-white py-16">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                        <div>
                            <div className="flex items-center mb-4">
                                <Leaf className="h-8 w-8 text-farm-green-400" />
                                <span className="ml-2 text-xl font-bold font-poppins"><T k="nav.farmFlow">FarmFlow</T></span>
                            </div>
                            <p className="text-farm-green-200 mb-4">
                                <T k="footer.description">AI-powered crop prediction and yield analysis platform helping farmers make data-driven decisions for optimal agricultural productivity.</T>
                            </p>
                            <div className="flex space-x-4">
                                <a href="#" className="h-10 w-10 rounded-full bg-farm-green-700 flex items-center justify-center hover:bg-farm-green-600 transition-colors">
                                    <Facebook className="h-5 w-5" />
                                </a>
                                <a href="#" className="h-10 w-10 rounded-full bg-farm-green-700 flex items-center justify-center hover:bg-farm-green-600 transition-colors">
                                    <Twitter className="h-5 w-5" />
                                </a>
                                <a href="#" className="h-10 w-10 rounded-full bg-farm-green-700 flex items-center justify-center hover:bg-farm-green-600 transition-colors">
                                    <Instagram className="h-5 w-5" />
                                </a>
                                <a href="#" className="h-10 w-10 rounded-full bg-farm-green-700 flex items-center justify-center hover:bg-farm-green-600 transition-colors">
                                    <Linkedin className="h-5 w-5" />
                                </a>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4 font-poppins"><T k="footer.aiFeatures">AI Features</T></h3>
                            <ul className="space-y-2">
                                <li><a href="#crop-prediction" className="text-farm-green-200 hover:text-white transition-colors"><T k="features.cropPrediction.title">Crop Prediction</T></a></li>
                                <li><a href="#yield-prediction" className="text-farm-green-200 hover:text-white transition-colors"><T k="features.yieldPrediction.title">Yield Prediction</T></a></li>
                                <li><a href="#thresholds" className="text-farm-green-200 hover:text-white transition-colors"><T k="features.thresholds.title">Smart Thresholds</T></a></li>
                                <li><a href="#" className="text-farm-green-200 hover:text-white transition-colors"><T k="footer.cropRecommendations">Crop Recommendations</T></a></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4 font-poppins"><T k="footer.platform">Platform</T></h3>
                            <ul className="space-y-2">
                                <li><a href="#about" className="text-farm-green-200 hover:text-white transition-colors"><T k="footer.aboutFarmFlow">About FarmFlow</T></a></li>
                                <li><a href="#contact" className="text-farm-green-200 hover:text-white transition-colors"><T k="nav.contact">Contact</T></a></li>
                                <li><a href="#" className="text-farm-green-200 hover:text-white transition-colors"><T k="footer.apiAccess">API Access</T></a></li>
                                <li><a href="#" className="text-farm-green-200 hover:text-white transition-colors"><T k="footer.documentation">Documentation</T></a></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4 font-poppins"><T k="footer.contactInfo">Contact Info</T></h3>
                            <div className="space-y-2 text-farm-green-200">
                                <p>123 AI Farm Road</p>
                                <p>Tech Valley, CA 90210</p>
                                <p>+1 (555) 123-4567</p>
                                <p>hello@farmflow.ai</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-farm-green-700 pt-8 text-center">
                        <p className="text-farm-green-200">
                            © {new Date().getFullYear()} <T k="nav.farmFlow">FarmFlow</T>. <T k="footer.copyright">All rights reserved.</T> | 
                            <a href="#" className="hover:text-white transition-colors ml-2"><T k="footer.privacy">Privacy Policy</T></a> | 
                            <a href="#" className="hover:text-white transition-colors ml-2"><T k="footer.terms">Terms of Service</T></a>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;