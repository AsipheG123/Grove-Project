import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);

  useEffect(() => {
    if (user?.profile_picture) {
      const fullUrl = `${process.env.REACT_APP_BACKEND_URL}/uploads/profiles/${user.profile_picture}`;
      setProfilePictureUrl(fullUrl);
      console.log('Generated Profile Picture URL:', fullUrl);
    } else {
      setProfilePictureUrl(null);
    }
  }, [user]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <Link to={user ? (user.role === 'worker' ? '/worker-dashboard' : '/requester-dashboard') : '/login'} className="text-xl font-bold text-green-600 dark:text-green-400">🌱 Grove</Link>
        
        {user && (
          <button
            onClick={() => navigate('/edit-profile')}
            className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {profilePictureUrl ? (
              <img src={profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export const BackButton = ({ to }) => {
  const navigate = useNavigate();
  
  return (
    <button 
      onClick={() => navigate(to)} 
      className="text-green-600 font-medium"
    >
      ← Back
    </button>
  );
}; 