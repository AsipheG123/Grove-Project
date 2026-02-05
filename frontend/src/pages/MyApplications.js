import React, { useState, useEffect } from 'react';
import { Header } from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import JobCard from '../components/JobCard';
import BottomNavigation from '../components/BottomNavigation';
import axios from 'axios';

const statusColors = {
  'pending': 'bg-yellow-100 text-yellow-700',
  'accepted': 'bg-green-100 text-green-700',
  'rejected': 'bg-red-100 text-red-700',
  'hired': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Job Closed': 'bg-red-100 text-red-700',
};

const MyApplications = () => {
  const { token, user } = useAuth();
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      if (!token) {
        console.log('No token available, skipping fetch');
        return;
      }
      
      console.log('Fetching applications with token:', token.substring(0, 20) + '...');
      console.log('Current user:', user);
      
      try {
        setLoading(true);
        setError('');
        
        const response = await axios.get('/api/applications/my', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('API Response status:', response.status);
        console.log('API Response data:', response.data);
        console.log('Applications count:', response.data.length);
        
        setMyApplications(response.data);
      } catch (err) {
        console.error('Error fetching applications:', err);
        console.error('Error response:', err.response?.data);
        setError('Failed to load applications. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [token, user]);

  // Add a refresh function that can be called manually
  const refreshApplications = async () => {
    if (!token) return;
    
    console.log('Manual refresh triggered');
    
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('/api/applications/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Refresh Response status:', response.status);
      console.log('Refresh Response data:', response.data);
      console.log('Refresh Applications count:', response.data.length);
      
      setMyApplications(response.data);
    } catch (err) {
      console.error('Error refreshing applications:', err);
      setError('Failed to refresh applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearAllApplications = async () => {
    if (!token) return;
    
    console.log('Clearing all applications');
    
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.delete('/api/test/clear-applications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Clear Response:', response.data);
      
      // Refresh the applications list
      await refreshApplications();
    } catch (err) {
      console.error('Error clearing applications:', err);
      setError('Failed to clear applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      'pending': 'Pending',
      'accepted': 'Accepted',
      'rejected': 'Rejected',
      'hired': 'Hired'
    };
    return statusMap[status] || status;
  };

  const getPriceDisplay = (job) => {
    if (job.proposed_rate) {
      return `R${job.proposed_rate}`;
    }
    return `R${job.budget || 0}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <div className="flex gap-2">
            <button
              onClick={refreshApplications}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={clearAllApplications}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
        
        {/* Debug Information */}
        <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm">
          <div className="font-semibold mb-2">Debug Info:</div>
          <div>Loading: {loading.toString()}</div>
          <div>Error: {error || 'None'}</div>
          <div>Applications Count: {myApplications.length}</div>
          <div>User Role: {user?.role || 'Unknown'}</div>
          <div>User ID: {user?.id || 'Unknown'}</div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading applications...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">
            <p>{error}</p>
          </div>
        ) : myApplications.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>You have not applied to any jobs yet.</p>
            <p className="text-sm mt-2">Start browsing jobs to apply!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myApplications.map(app => (
              <div
                key={app.id}
                className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-semibold text-lg text-gray-900">{app.job_title}</div>
                  <div className="text-gray-500 text-sm flex items-center">
                    <span className="mr-1">📍</span>{app.location || 'Location not specified'}
                  </div>
                  {app.message && (
                    <div className="text-gray-600 text-sm mt-1">
                      "{app.message}"
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end ml-4">
                  <div className="text-green-700 font-bold text-lg">
                    {getPriceDisplay(app)}
                  </div>
                  <span className={`mt-1 px-2 py-1 rounded text-xs font-semibold ${statusColors[app.status] || 'bg-gray-100 text-gray-700'}`}>
                    {getStatusDisplay(app.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNavigation activeTab="Home" />
    </div>
  );
};

export default MyApplications; 