import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Navigation';
import BottomNavigation from '../components/BottomNavigation';

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">
      <Header />
      <div className="flex-grow max-w-md mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Settings</h1>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/edit-profile')}
            className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <span>👤 Edit Profile</span>
            <span>→</span>
          </button>
          <button
            onClick={() => alert('Contact Support functionality coming soon!')}
            className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <span>📞 Contact Support</span>
            <span>→</span>
          </button>
          {/* Grove Plus - Only for Requesters */}
          {user?.role === 'requester' && (
            <button
              onClick={() => alert('Grove Plus functionality coming soon!')}
              className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <span>✨ Grove Plus</span>
              <span>→</span>
            </button>
          )}
          <button
            onClick={() => alert('Help section coming soon!')}
            className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <span>❓ Help</span>
            <span>→</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-center hover:bg-red-700 transition-colors shadow-sm"
          >
            Sign Out
          </button>
        </div>
      </div>

      <BottomNavigation activeTab="Settings" />
    </div>
  );
};

export default Settings; 