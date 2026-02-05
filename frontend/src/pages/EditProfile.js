import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Navigation';
import axios from 'axios';
import BottomNavigation from '../components/BottomNavigation';

const EditProfile = () => {
  const { user, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  // Local state for all fields
  const [avatar, setAvatar] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [skills, setSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bio, setBio] = useState('');
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [rating, setRating] = useState(4.5);

  const ALL_SKILLS = [
    'Cleaning', 'Yardwork', 'Childcare', 'House Help', 'General Repairs', 'Admin Help',
    'Delivery Help', 'Elderly Care', 'Photography', 'Graphic Design', 'Social Media',
    'Tutoring', 'Pet Care', 'Moving Help', 'Event Help'
  ];

  useEffect(() => {
    if (user) {
      console.log('EditProfile: Received user data:', user);
      setAvatar(user?.profile_picture ? `${process.env.REACT_APP_BACKEND_URL}/uploads/profiles/${user.profile_picture}` : null);
      setFullName(user?.full_name || '');
      setGender(user?.gender || '');
      setBirthday(user?.birthday || '');
      setIdNumber(user?.id_number || '');
      setPhone(user?.phone || '');
      setEmail(user?.email || '');
      setAddress(user?.address || '');
      // Load skills or job_categories based on user role
      if (user?.role === 'requester') {
        setSkills(user?.job_categories || []);
      } else {
        setSkills(user?.skills || []);
      }
      setBankName(user?.bank_name || '');
      setAccountNumber(user?.account_number || '');
      setAccountHolder(user?.account_holder || '');
      setBio(user?.bio || '');
      setRating(user?.rating || 4.5);
      
      console.log('EditProfile: Set form values:');
      console.log('  - fullName:', user?.full_name || '');
      console.log('  - gender:', user?.gender || '');
      console.log('  - birthday:', user?.birthday || '');
      console.log('  - idNumber:', user?.id_number || '');
      console.log('  - phone:', user?.phone || '');
      console.log('  - address:', user?.address || '');
      console.log('  - skills:', user?.skills || []);
      console.log('  - bankName:', user?.bank_name || '');
      console.log('  - accountNumber:', user?.account_number || '');
      console.log('  - accountHolder:', user?.account_holder || '');
      console.log('  - bio:', user?.bio || '');
    }
  }, [user]);

  if (!user) {
    return <div>Loading profile...</div>;
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatar(URL.createObjectURL(file));
    }
  };

  const handleSkillToggle = (skill) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim() && !skills.includes(customSkill.trim())) {
      setSkills([...skills, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      let profilePictureUrl = user.profile_picture;
      
      // Upload profile picture if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        const uploadRes = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/upload/profile`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('grove_token')}`
          },
        });
        profilePictureUrl = uploadRes.data.filename;
        setAvatar(`${process.env.REACT_APP_BACKEND_URL}/uploads/profiles/${uploadRes.data.filename}`);
      }
      
      // Prepare update data
      const updateData = {
        full_name: fullName,
        gender,
        birthday,
        id_number: idNumber,
        phone,
        address,
        city: user?.city || '',
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        bio,
        profile_picture: profilePictureUrl,
        card_number: user?.card_number || '',
        card_expiry: user?.card_expiry || '',
        card_cvc: user?.card_cvc || '',
        availability: user?.availability || '',
        location_radius: user?.location_radius || 10,
        hourly_rate: user?.hourly_rate || null,
      };
      
      // Add skills or job_categories based on user role
      if (user?.role === 'requester') {
        updateData.job_categories = skills;
      } else {
        updateData.skills = skills;
      }
      
      // Remove undefined, null, or empty string values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
          delete updateData[key];
        }
      });
      
      console.log('Sending update data:', updateData);
      
      const response = await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/profile`, updateData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('grove_token')}`
        },
      });
      
      console.log('Profile update response:', response.data);
      
      // Refresh user profile
      await fetchUserProfile();
      setSuccess(true);
      
      setTimeout(() => {
        const dashboardPath = user.role === 'worker' ? '/worker-dashboard' : '/requester-dashboard';
        navigate(dashboardPath);
      }, 1500);
      
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    const dashboardPath = user && user.role === 'worker' ? '/worker-dashboard' : '/requester-dashboard';
    navigate(dashboardPath);
  };

  // Star rating display
  const renderStars = () => {
    const stars = [];
    const rounded = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      if (i < rounded) {
        stars.push(<span key={i} className="text-yellow-400 text-2xl">★</span>);
      } else {
        stars.push(<span key={i} className="text-gray-300 text-2xl">★</span>);
      }
    }
    // Half star
    if (rating - rounded >= 0.5) {
      stars[rounded] = <span key={rounded} className="text-yellow-400 text-2xl">☆</span>;
    }
    return <div className="flex items-center justify-center mb-2">{stars}<span className="ml-2 text-gray-600 text-lg">{rating.toFixed(1)}</span></div>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>
        {error && <div className="mb-4 text-red-600 text-center">{error}</div>}
        {success && <div className="mb-4 text-green-600 text-center">Profile updated!</div>}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          {/* Profile Picture & Rating */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden mb-2">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
            {renderStars()}
            <input type="file" accept="image/*" onChange={handleAvatarChange} />
          </div>
          {/* Personal Info */}
          <div className="mb-6">
            <label className="block font-semibold mb-1">Full Name</label>
            <input type="text" name="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2" />
            <label className="block font-semibold mb-1">Gender</label>
            <select name="gender" value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2">
              <option value="">Select gender</option>
              {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <label className="block font-semibold mb-1">Birthday</label>
            <input type="date" name="birthday" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2" />
            <label className="block font-semibold mb-1">ID Number</label>
            <input type="text" name="idNumber" value={idNumber} onChange={e => setIdNumber(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2" />
            <label className="block font-semibold mb-1">Phone Number</label>
            <input type="tel" name="phone" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2" />
            <label className="block font-semibold mb-1">Email</label>
            <input type="email" name="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2" />
            <label className="block font-semibold mb-1">Home Address / Suburb</label>
            <input type="text" name="address" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          {/* Skills/Job Categories */}
          <div className="mb-6">
            <label className="block font-semibold mb-2">
              {user?.role === 'requester' ? 'Job Categories' : 'Skills'}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(showAllSkills ? ALL_SKILLS : skills).map((skill) => (
                <button
                  type="button"
                  key={skill}
                  onClick={() => handleSkillToggle(skill)}
                  className={`px-4 py-2 rounded-full font-semibold border-2 flex items-center gap-2 transition-colors
                    ${skills.includes(skill)
                      ? 'bg-green-500 text-white border-green-600 shadow-lg'
                      : 'bg-white text-green-700 border-green-300 hover:bg-green-100'}`}
                >
                  <span role="img" aria-label="check">{skills.includes(skill) ? '✅' : '⬜'}</span>
                  {skill}
                </button>
              ))}
            </div>
            <button type="button" className="text-green-600 underline mb-2" onClick={() => setShowAllSkills((v) => !v)}>
              {showAllSkills ? 'Show Selected' : 'See All'}
            </button>
            <div className="flex gap-2 mt-2">
              <input 
                type="text" 
                name="customSkill" 
                value={customSkill} 
                onChange={e => setCustomSkill(e.target.value)} 
                placeholder={user?.role === 'requester' ? 'e.g., Personal Shopper, Tutoring' : 'Add custom skill'}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" 
              />
              <button type="button" onClick={handleAddCustomSkill} className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600">Add</button>
            </div>
          </div>
          {/* Bank Details */}
          <div className="mb-6">
            <label className="block font-semibold mb-1">Bank Name</label>
            <input type="text" name="bankName" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2" />
            <label className="block font-semibold mb-1">Account Number</label>
            <input type="text" name="accountNumber" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2" />
            <label className="block font-semibold mb-1">Account Holder Name</label>
            <input type="text" name="accountHolder" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          {/* Bio */}
          <div className="mb-6">
            <label className="block font-semibold mb-1">About Me</label>
            <textarea name="bio" value={bio} onChange={e => setBio(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={3} />
          </div>
          <div className="flex space-x-3 mt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold text-lg hover:bg-gray-300 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <BottomNavigation activeTab="Settings" />
    </div>
  );
};

export default EditProfile; 