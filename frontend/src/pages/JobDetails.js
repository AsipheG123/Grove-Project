import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Navigation';
import BottomNavigation from '../components/BottomNavigation';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:8000';

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!token || !jobId) return;

      try {
        setLoading(true);
        setError('');
        
        const response = await axios.get(`${BASE_URL}/api/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setJob(response.data);
      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId, token]);

  const handleRequestJob = () => {
    if (!token || !job) return;
    
    // Show application modal instead of applying directly
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!token || !job) return;

    setIsRequesting(true);
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/jobs/${job.id}/apply`,
        {
          message: applicationMessage || `I'm interested in this ${job.category} job!`,
          proposed_rate: job.budget
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Job application successful:', response.data);
      setRequestSuccess(true);
      
      // Show success message for 2 seconds, then close modal and navigate
      setTimeout(() => {
        setRequestSuccess(false);
        setShowApplicationModal(false);
        setApplicationMessage('');
        navigate('/worker-dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error applying to job:', error);
      alert(error.response?.data?.detail || 'Failed to apply to job. Please try again.');
    } finally {
      setIsRequesting(false);
    }
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
              onClick={() => navigate('/browse-jobs')}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Back to Jobs
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
              <span className="mr-2">👤</span>
              <span>Posted by {job.requester_name}</span>
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
          {job.applications_count > 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-600">Applications:</span>
              <span className="text-gray-900 font-semibold">{job.applications_count}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {user?.role === 'worker' && job.status === 'open' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            {requestSuccess ? (
              <div className="text-center py-4">
                <div className="text-green-600 text-lg font-semibold mb-2">✅ Job Requested!</div>
                <p className="text-gray-600">Redirecting to your applications...</p>
              </div>
            ) : (
              <button
                onClick={handleRequestJob}
                disabled={isRequesting}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-colors ${
                  isRequesting 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                }`}
              >
                {isRequesting ? 'Requesting...' : 'Request This Job'}
              </button>
            )}
          </div>
        )}

        {/* Back Button */}
        <div className="text-center mb-20">
          <button 
            onClick={() => navigate('/worker-dashboard')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
      
      {/* Application Modal */}
      {showApplicationModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowApplicationModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Apply for Job</h3>
            <p className="text-gray-600 mb-4">{job?.title}</p>
            
            {requestSuccess ? (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <p className="text-green-800 font-medium">Application submitted successfully!</p>
                </div>
              </div>
            ) : (
              <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message to Requester
                </label>
                <textarea
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Tell the requester why you're perfect for this job..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="3"
                />
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowApplicationModal(false)}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {requestSuccess ? 'Close' : 'Cancel'}
              </button>
              {!requestSuccess && (
                <button
                  onClick={handleSubmitApplication}
                  disabled={isRequesting}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    isRequesting 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isRequesting ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <BottomNavigation activeTab="Home" />
    </div>
  );
};

export default JobDetails;
