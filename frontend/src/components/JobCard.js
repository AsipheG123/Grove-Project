import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:8000';

const JobCard = ({ 
  // Old format props (for backward compatibility)
  title, 
  location, 
  dateTime, 
  budget, 
  status, 
  workerName, 
  onCall, 
  onMessage, 
  type,
  // New format props
  job,
  showLocation = true,
  showDateTime = true,
  compact = false,
  showRequestButton = false,
  onApplicationSuccess
}) => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');

  // Use job object if provided, otherwise fall back to individual props
  const jobTitle = job?.title || title;
  const jobLocation = job?.location || location;
  const jobDateTime = job?.created_at ? new Date(job.created_at).toLocaleString() : dateTime;
  const jobBudget = job?.budget ? `R${job.budget}` : budget;
  const jobStatus = job?.status || status;

  const handleCardClick = () => {
    if (type === 'recommended' || type === 'open-job' || job) {
      // Navigate to job details page for recommended or open jobs
      console.log(`Navigating to details for job: ${jobTitle}`);
      if (type === 'my-job') {
        navigate(`/requester-job-details/${job?.id}`);
      } else {
        navigate(`/job-details/${job?.id}`);
      }
    }
  };

  const handleRequestJob = async (e) => {
    e.stopPropagation(); // Prevent card click
    
    if (!token || !job?.id) {
      console.error('No token or job ID available');
      return;
    }

    // Show application modal instead of applying directly
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!token || !job?.id) {
      console.error('No token or job ID available');
      console.error('Token:', token);
      console.error('Job ID:', job?.id);
      return;
    }

    console.log('Submitting application with token:', token.substring(0, 20) + '...');
    console.log('Job ID:', job.id);
    console.log('Message:', applicationMessage);

    setIsRequesting(true);
    
    try {
      const payload = {
        message: applicationMessage || `I'm interested in this ${job.category} job!`,
        proposed_rate: typeof job.budget === 'number' ? job.budget : parseFloat(job.budget) || 0
      };
      
      console.log('Request payload:', payload);
      console.log('Request URL:', `${BASE_URL}/api/jobs/${job.id}/apply`);
      
      const response = await axios.post(
        `${BASE_URL}/api/jobs/${job.id}/apply`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Job application successful:', response.data);
      setRequestSuccess(true);
      
      // Show success message for 2 seconds, then close modal
      setTimeout(() => {
        setRequestSuccess(false);
        setShowApplicationModal(false);
        setApplicationMessage('');
      }, 2000);

      // Call callback if provided
      if (onApplicationSuccess) {
        onApplicationSuccess(job.id);
      }

    } catch (error) {
      console.error('Error applying to job:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to apply to job. Please try again.';
      
      alert(`Application failed: ${errorMessage}`);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow p-4 mb-3 cursor-pointer ${
        compact ? 'py-3' : 'py-4'
      }`} 
      onClick={handleCardClick}
    >
      <h3 className={`font-bold text-gray-900 dark:text-white mb-1 ${
        compact ? 'text-base' : 'text-lg'
      }`}>
        {jobTitle}
      </h3>
      
      {workerName && <p className="text-sm text-gray-700 dark:text-gray-300">Worker: {workerName}</p>}
      
      {showLocation && jobLocation && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          📍 {jobLocation.split(',').slice(-2).join(',').trim()}
        </p>
      )}
      
      {showDateTime && jobDateTime && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ⏰ {jobDateTime}
        </p>
      )}
      
      {jobBudget && (
        <p className={`font-bold text-green-600 mt-1 ${
          compact ? 'text-sm' : 'text-base'
        }`}>
          {jobBudget}
        </p>
      )}
      
      {jobStatus && (
        <span className={`mt-2 inline-block px-3 py-1 text-xs font-semibold rounded-full ${
          jobStatus.toLowerCase() === 'hired' ? 'bg-green-200 text-green-800' :
          jobStatus.toLowerCase() === 'open' ? 'bg-blue-200 text-blue-800' :
          jobStatus.toLowerCase() === 'accepted' ? 'bg-yellow-200 text-yellow-800' :
          jobStatus.toLowerCase() === 'pending' ? 'bg-orange-200 text-orange-800' :
          'bg-gray-200 text-gray-800'
        }`}>
          {jobStatus}
        </span>
      )}
      
      {/* Request Job Button */}
      {showRequestButton && job && user?.role === 'worker' && job.status === 'open' && (
        <div className="mt-3">
          {requestSuccess ? (
            <div className="text-center py-2 px-4 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
              ✅ Job Requested!
            </div>
          ) : (
            <button
              onClick={handleRequestJob}
              disabled={isRequesting}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                isRequesting 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isRequesting ? 'Requesting...' : 'Request Job'}
            </button>
          )}
        </div>
      )}
      
      {(onCall || onMessage) && (
        <div className="flex justify-end space-x-3 mt-3">
          {onMessage && (
            <button className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </button>
          )}
          {onCall && (
            <button className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.135a11.042 11.042 0 005.516 5.516l1.135-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" /></svg>
            </button>
          )}
        </div>
      )}

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
            <p className="text-gray-600 mb-4">{jobTitle}</p>
            
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
    </div>
  );
};

export default JobCard; 