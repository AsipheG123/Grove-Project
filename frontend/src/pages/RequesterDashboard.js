import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Navigation';
import BottomNavigation from '../components/BottomNavigation';
import JobCard from '../components/JobCard';
import Notification from '../components/Notification';
import axios from 'axios';

const RequesterDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [lastApplicationCount, setLastApplicationCount] = useState(0);

  // Function to check for new applications
  const checkForNewApplications = async () => {
    if (!token || recentJobs.length === 0) return;
    
    try {
      let totalApplications = 0;
      
      // Check each job for new applications
      for (const job of recentJobs) {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/jobs/${job.id}/applications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        totalApplications += response.data.length;
      }
      
      // If we have more applications than before, show notification
      if (totalApplications > lastApplicationCount && lastApplicationCount > 0) {
        const newApplications = totalApplications - lastApplicationCount;
        setNotification({
          message: `🎉 ${newApplications} new application${newApplications > 1 ? 's' : ''} received!`,
          type: 'success'
        });
      }
      
      setLastApplicationCount(totalApplications);
    } catch (error) {
      console.error('Error checking for new applications:', error);
    }
  };

  useEffect(() => {
    const fetchRecentJobs = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/jobs/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Sort by creation date and take the top 3
        const sortedJobs = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRecentJobs(sortedJobs.slice(0, 3));
        
        // Set initial application count
        let totalApplications = 0;
        for (const job of sortedJobs.slice(0, 3)) {
          try {
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/jobs/${job.id}/applications`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            totalApplications += response.data.length;
          } catch (error) {
            console.error('Error fetching applications for job:', job.id, error);
          }
        }
        setLastApplicationCount(totalApplications);
      } catch (error) {
        console.error("Failed to fetch recent jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentJobs();
  }, [token]);

  // Poll for new applications every 30 seconds
  useEffect(() => {
    if (!token || recentJobs.length === 0) return;
    
    const interval = setInterval(checkForNewApplications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [token, recentJobs, lastApplicationCount]);

  // No default job in progress - will be null until user has an active job
  const jobInProgressRequester = null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">
      <Header />
      <div className="flex-grow max-w-md mx-auto px-4 py-6 w-full">
        {/* Header Section: Post a Job Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/post-job')}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center hover:bg-green-700 transition-colors"
          >
            Post a Job
          </button>
        </div>

        {/* Grove Plus Feature for Requesters */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="text-purple-700 text-sm font-medium">💎 Grove Plus</span>
            </div>
            <button 
              onClick={() => console.log('Grove Plus clicked')}
              className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs rounded-full hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-sm"
            >
              Upgrade
            </button>
          </div>
          <p className="text-purple-700 text-xs">
            Boost your job posts, get faster responses, and mark as trusted for better visibility
          </p>
        </div>

        {/* Job in Progress Section (Requester) */}
        {jobInProgressRequester ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-0 mb-4 overflow-hidden">
            <h2 className="text-lg font-bold px-4 pt-3 pb-2">Job in Progress</h2>
            <div className="relative">
              <img src={jobInProgressRequester.mapPlaceholder} alt="Job Location Map" className="w-full h-32 object-cover" />
              <div className="absolute top-2 right-4 flex space-x-2">
                <button onClick={() => console.log('Message Worker')} className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </button>
                <button onClick={() => console.log('Call Worker')} className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.135a11.042 11.042 0 005.516 5.516l1.135-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" /></svg>
                </button>
              </div>
            </div>
            <div className="px-4 py-2">
              <div className="font-semibold text-base">{jobInProgressRequester.title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Worker: {jobInProgressRequester.workerName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{jobInProgressRequester.location}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{jobInProgressRequester.dateTime}</div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mb-4">
            <h2 className="text-lg font-bold mb-3">Job in Progress</h2>
            <div className="text-center text-gray-500 py-6">
              <p className="text-base mb-2">No Jobs in Progress</p>
              <p className="text-sm mb-3">Post a job to get started!</p>
              <button
                onClick={() => navigate('/post-job')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Post a Job
              </button>
            </div>
          </div>
        )}

        {/* My Jobs Section */}
        <div className="mb-24">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold">My Jobs</h2>
            <button onClick={() => navigate('/my-jobs')} className="text-green-600 dark:text-green-400 hover:underline text-sm font-semibold">
              See All
            </button>
          </div>
          {loading ? (
            <p className="text-gray-400">Loading jobs...</p>
          ) : (
            <div className="space-y-3">
              {recentJobs.length > 0 ? (
                recentJobs.map(job => (
                  <JobCard
                    key={job.id}
                    title={job.title}
                    location={job.location}
                    budget={`R${job.budget}`}
                    status={job.status}
                    type="open-job"
                  />
                ))
              ) : (
                <p className="text-gray-400 text-center">You haven't posted any jobs yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation activeTab="Home" />
      
      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default RequesterDashboard; 