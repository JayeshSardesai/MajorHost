import React, { useState } from 'react';
import { Menu, X, Leaf, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import T from './T';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-30 w-full border-b border-farm-green-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center">
          <div className="relative">
            <Leaf className="h-8 w-8 text-farm-green-500" />
            <Sun className="h-4 w-4 text-golden-yellow-500 absolute -top-1 -right-1" />
          </div>
          <span className="ml-2 text-xl font-bold text-farm-green-700 font-poppins">FarmFlow</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <button onClick={() => navigate('/dashboard')} className="text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins">
            <T k="dashboard.title">Dashboard</T>
          </button>
          <button onClick={() => navigate('/select-crop')} className="text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins">
            <T k="dashboard.selectCrop">Select Crop</T>
          </button>
          <button onClick={() => navigate('/profile')} className="text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins">
            <T k="dashboard.profile">Profile</T>
          </button>
          <LanguageSwitcher inline={true} className="ml-2" />
          <button onClick={handleLogout} className="text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins">
            <T k="dashboard.logout">Logout</T>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button onClick={toggleMenu} className="md:hidden p-2">
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-farm-green-200">
          <div className="container mx-auto py-4 space-y-3 px-4">
            <button onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
              <T k="dashboard.title">Dashboard</T>
            </button>
            <button onClick={() => { navigate('/select-crop'); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
              <T k="dashboard.selectCrop">Select Crop</T>
            </button>
            <button onClick={() => { navigate('/profile'); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
              <T k="dashboard.profile">Profile</T>
            </button>
            <div className="py-2">
              <LanguageSwitcher inline={true} className="w-full" />
            </div>
            <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
              <T k="dashboard.logout">Logout</T>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
