import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Navigation';
import BottomNavigation from '../components/BottomNavigation';
import WorkerProfile from '../components/WorkerProfile';
import Notification from '../components/Notification';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:8000';

const RequesterJobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showWorkerProfile, setShowWorkerProfile] = useState(false);
  const [notification, setNotification] = useState(null);
  const [lastApplicationCount, setLastApplicationCount] = useState(0);

  // Function to check for new applications
  const checkForNewApplications = async () => {
    if (!token || !jobId) return;
    
    try {
      const response = await axios.get(`${BASE_URL}/api/jobs/${jobId}/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const currentCount = response.data.length;
      
      // If we have more applications than before, show notification
      if (currentCount > lastApplicationCount && lastApplicationCount > 0) {
        const newApplications = currentCount - lastApplicationCount;
        setNotification({
          message: `🎉 ${newApplications} new application${newApplications > 1 ? 's' : ''} received!`,
          type: 'success'
        });
        // Refresh applications list
        setApplications(response.data);
      }
      
      setLastApplicationCount(currentCount);
    } catch (error) {
      console.error('Error checking for new applications:', error);
    }
  };

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!token || !jobId) return;

      try {
        setLoading(true);
        setError('');
        
        // Fetch job details
        const jobResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setJob(jobResponse.data);
        
        // Fetch applications for this job
        const applicationsResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}/applications`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setApplications(applicationsResponse.data);
        setLastApplicationCount(applicationsResponse.data.length);
      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId, token]);

  // Poll for new applications every 30 seconds
  useEffect(() => {
    if (!token || !jobId) return;
    
    const interval = setInterval(checkForNewApplications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [token, jobId, lastApplicationCount]);

  const handleHireWorker = async (applicationId) => {
    if (!token) return;

    try {
      await axios.put(
        `${BASE_URL}/api/applications/${applicationId}/status`,
        { status: 'hired' },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setNotification({
        message: 'Worker hired successfully! Job status updated.',
        type: 'success'
      });

      // Refresh the data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error hiring worker:', error);
      setNotification({
        message: 'Failed to hire worker. Please try again.',
        type: 'error'
      });
    }
  };

  const handleRejectWorker = async (applicationId) => {
    if (!token) return;

    try {
      await axios.put(
        `${BASE_URL}/api/applications/${applicationId}/status`,
        { status: 'rejected' },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setNotification({
        message: 'Worker application rejected.',
        type: 'info'
      });

      // Refresh the data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error rejecting worker:', error);
      setNotification({
        message: 'Failed to reject worker. Please try again.',
        type: 'error'
      });
    }
  };

  const handleViewWorkerProfile = async (workerId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/users/${workerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSelectedWorker(response.data);
      setShowWorkerProfile(true);
    } catch (error) {
      console.error('Error fetching worker profile:', error);
      setNotification({
        message: 'Failed to load worker profile. Please try again.',
        type: 'error'
      });
    }
  };

  const handleHireFromProfile = () => {
    if (selectedApplication) {
      handleHireWorker(selectedApplication.id);
    }
    setShowWorkerProfile(false);
  };

  const handleRejectFromProfile = () => {
    if (selectedApplication) {
      handleRejectWorker(selectedApplication.id);
    }
    setShowWorkerProfile(false);
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'flexible':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyText = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return '🚨 Urgent';
      case 'normal':
        return '⏰ Normal';
      case 'flexible':
        return '📅 Flexible';
      default:
        return urgency;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading job details...</p>
          </div>
        </div>
        <BottomNavigation activeTab="Home" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="text-center text-red-500 py-8">
            <p>{error || 'Job not found'}</p>
            <button 
              onClick={() => navigate('/my-jobs')}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Back to My Jobs
            </button>
          </div>
        </div>
        <BottomNavigation activeTab="Home" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Job Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getUrgencyColor(job.urgency)}`}>
              {getUrgencyText(job.urgency)}
            </span>
          </div>
          
          <div className="text-3xl font-bold text-green-600 mb-4">
            R{job.budget}
          </div>
          
          <div className="space-y-3 text-gray-600">
            <div className="flex items-center">
              <span className="mr-2">📍</span>
              <span>{job.location}</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">🏷️</span>
              <span>{job.category}</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">📅</span>
              <span>{new Date(job.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
          <p className="text-gray-700 leading-relaxed">{job.description}</p>
        </div>

        {/* Job Status */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Job Status</h2>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              job.status === 'open' ? 'bg-green-100 text-green-800' :
              job.status === 'filled' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {job.status === 'open' ? '🟢 Open' : 
               job.status === 'filled' ? '🔵 Filled' : job.status}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-gray-600">Applications:</span>
            <span className="text-gray-900 font-semibold">{applications.length}</span>
          </div>
        </div>

        {/* Hired Worker Section */}
        {applications.some(app => app.status === 'hired') && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🎉 Hired Worker</h2>
            {applications
              .filter(app => app.status === 'hired')
              .map(app => (
                <div key={app.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {app.worker_profile_picture ? (
                        <img 
                          src={app.worker_profile_picture} 
                          alt={app.worker_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl text-gray-500">
                          {app.worker_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{app.worker_name}</h3>
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <span>⭐ {app.worker_rating ? app.worker_rating.toFixed(1) : 'No rating'}</span>
                        <span className="mx-2">•</span>
                        <span>Hired on {new Date(app.updated_at || app.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        {app.worker_phone && (
                          <p>📞 {app.worker_phone}</p>
                        )}
                        {app.worker_email && (
                          <p>✉️ {app.worker_email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Contact Your Worker</h4>
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => console.log('Message worker:', app.worker_id)}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        📱 Message
                      </button>
                      <button 
                        onClick={() => console.log('Call worker:', app.worker_phone)}
                        className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        📞 Call
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Applications */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Applications ({applications.length})</h2>
          
          {applications.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No applications yet.</p>
              <p className="text-sm mt-2">Workers will appear here when they apply.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map(app => (
                <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{app.worker_name}</h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <span>⭐ {app.worker_rating ? app.worker_rating.toFixed(1) : 'No rating'}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedApplication(app);
                      handleViewWorkerProfile(app.worker_id);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-3"
                  >
                    👤 View Full Profile
                  </button>
                  
                  {app.message && (
                    <p className="text-gray-700 text-sm mb-3 italic">"{app.message}"</p>
                  )}
                  
                  {app.proposed_rate && (
                    <p className="text-green-600 font-semibold mb-3">
                      Proposed Rate: R{app.proposed_rate}
                    </p>
                  )}
                  
                  {app.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleHireWorker(app.id)}
                        className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        Hire Worker
                      </button>
                      <button
                        onClick={() => handleRejectWorker(app.id)}
                        className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="text-center mb-20">
          <button 
            onClick={() => navigate('/requester-dashboard')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
      
      {/* Worker Profile Modal */}
      {showWorkerProfile && selectedWorker && (
        <WorkerProfile
          worker={selectedWorker}
          onClose={() => setShowWorkerProfile(false)}
          onHire={handleHireFromProfile}
          onReject={handleRejectFromProfile}
        />
      )}
      
      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      
      <BottomNavigation activeTab="Home" />
    </div>
  );
};

export default RequesterJobDetails;
