import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { Menu, X, Leaf, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import T from './T';
import LanguageSwitcher from './LanguageSwitcher';

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState({ nitrogen: '', phosphorus: '', potassium: '', areaHectare: '', ph: '', soilType: '', photoUrl: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/'); return; }
    (async () => {
      try {
        const resp = await fetch('http://localhost:5000/api/profile', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (resp.ok) {
          const data = await resp.json();
          setProfile({
            nitrogen: data.profile?.nitrogen ?? '',
            phosphorus: data.profile?.phosphorus ?? '',
            potassium: data.profile?.potassium ?? '',
            areaHectare: data.profile?.areaHectare ?? '',
            ph: data.profile?.ph ?? '',
            soilType: data.profile?.soilType ?? '',
            photoUrl: data.profile?.photoUrl ?? ''
          });
          // If any profile value exists, default to view mode
          const hasData = [data.profile?.nitrogen, data.profile?.phosphorus, data.profile?.potassium, data.profile?.areaHectare, data.profile?.ph, data.profile?.soilType]
            .some(v => v !== undefined && v !== null && v !== '');
          setIsEditing(!hasData ? true : false);
        } else if (resp.status === 401) {
          navigate('/');
        }
      } catch (e) {
        setError(t('profile.errorLoad'));
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nitrogen: Number(profile.nitrogen) || 0,
          phosphorus: Number(profile.phosphorus) || 0,
          potassium: Number(profile.potassium) || 0,
          areaHectare: Number(profile.areaHectare) || 0,
          ph: Number(profile.ph) || 0,
          soilType: profile.soilType
        })
      });
      if (!resp.ok) throw new Error('Save failed');
      // Clear cached predictions to force refresh on dashboard
      localStorage.removeItem('cropPredictions');
      localStorage.removeItem('productionEstimates');
      
      setIsEditing(false);
      navigate('/dashboard');
    } catch (e) {
      setError(t('profile.errorSave'));
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!isEditing) return;
    
    setUploadingPhoto(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('farmerCard', file);
      
      const resp = await fetch('http://localhost:5000/api/profile/farmercard', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
      });
      
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.photoUrl) {
          setProfile(prev => ({ ...prev, photoUrl: data.photoUrl }));
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (e) {
      setError(t('profile.errorUpload'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><T k="common.loading">Loading...</T></div>;

  return (
    <div className="min-h-screen bg-soft-beige-950">
      <Navbar />

      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10">
        <div className="farm-card p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground font-poppins">
              <T k="profile.title">Update Profile</T>
            </h1>
          </div>
          {error && <div className="mb-4 text-red-600">{error}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1 font-poppins">
                  <T k="profile.nitrogen">Nitrogen (N)</T>
                </label>
                <input type="number" value={profile.nitrogen} onChange={(e)=>setProfile({...profile, nitrogen: e.target.value})} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" required disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1 font-poppins">
                  <T k="profile.phosphorus">Phosphorus (P)</T>
                </label>
                <input type="number" value={profile.phosphorus} onChange={(e)=>setProfile({...profile, phosphorus: e.target.value})} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" required disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1 font-poppins">
                  <T k="profile.potassium">Potassium (K)</T>
                </label>
                <input type="number" value={profile.potassium} onChange={(e)=>setProfile({...profile, potassium: e.target.value})} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" required disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1 font-poppins">
                  <T k="profile.areaHectare">Area (Hectares)</T>
                </label>
                <input type="number" value={profile.areaHectare} onChange={(e)=>setProfile({...profile, areaHectare: e.target.value})} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" required disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1 font-poppins">
                  <T k="profile.ph">pH Level</T>
                </label>
                <input type="number" step="0.1" value={profile.ph} onChange={(e)=>setProfile({...profile, ph: e.target.value})} className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" required disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1 font-poppins">
                  <T k="profile.soilType">Soil Type</T>
                </label>
                <select 
                  value={profile.soilType} 
                  onChange={(e)=>setProfile({...profile, soilType: e.target.value})} 
                  className="w-full px-3 py-2 border border-soft-beige-300 rounded-md" 
                  required 
                  disabled={!isEditing}
                >
                  <option value=""><T k="profile.selectSoil">Select soil type</T></option>
                  <option value="Loamy soil"><T k="profile.soil.loamy">Loamy soil</T></option>
                  <option value="Alluvial soil"><T k="profile.soil.alluvial">Alluvial soil</T></option>
                  <option value="Laterite soil"><T k="profile.soil.laterite">Laterite soil</T></option>
                  <option value="Sandy soil"><T k="profile.soil.sandy">Sandy soil</T></option>
                  <option value="Sandy Loamy soil"><T k="profile.soil.sandyLoamy">Sandy Loamy soil</T></option>
                  <option value="Light Loamy soil"><T k="profile.soil.lightLoamy">Light Loamy soil</T></option>
                  <option value="Well-drained soil"><T k="profile.soil.wellDrained">Well-drained soil</T></option>
                  <option value="Well-drained loamy soil"><T k="profile.soil.wellDrainedLoamy">Well-drained loamy soil</T></option>
                </select>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1 font-poppins">
                <T k="profile.farmerCardPhoto">Farmer Card Photo</T>
              </label>
              
              {/* Photo Preview */}
              {profile.photoUrl && (
                <div className="mb-3">
                  <img 
                    src={`http://localhost:5000${profile.photoUrl}`} 
                    alt="Farmer Card" 
                    className="w-32 h-32 object-cover rounded-lg border border-soft-beige-300"
                  />
                </div>
              )}
              
              {/* File Input */}
              <div className="flex items-center space-x-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e)=>handleUpload(e.target.files?.[0])} 
                  className="block w-full text-sm text-muted-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-farm-green-50 file:text-farm-green-700 hover:file:bg-farm-green-100" 
                  disabled={!isEditing || uploadingPhoto} 
                />
                {uploadingPhoto && (
                  <div className="flex items-center space-x-2 text-sm text-muted-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-farm-green-500"></div>
                    <span><T k="profile.uploading">Uploading...</T></span>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-muted-600 mt-1 font-poppins">
                <T k="profile.uploadHelp">Upload a clear photo of your farmer identification card</T>
              </p>
            </div>
            <div className="flex justify-end gap-3">
              {!isEditing && (
                <button type="button" onClick={()=>setIsEditing(true)} className="farm-button-primary px-4 py-2">
                  <T k="profile.update">Update</T>
                </button>
              )}
              {isEditing && (
                <>
                  <button type="button" onClick={()=>{ setIsEditing(false); }} className="px-4 py-2 border rounded-md">
                    <T k="common.cancel">Cancel</T>
                  </button>
                  <button type="submit" className="farm-button-primary px-4 py-2">
                    <T k="profile.save">Save</T>
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
