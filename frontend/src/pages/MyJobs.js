import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Navigation';
import BottomNavigation from '../components/BottomNavigation';
import JobCard from '../components/JobCard';

const BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:8000';

const MyJobs = () => {
  const { token } = useAuth();
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyJobs = async () => {
      if (!token) {
        setLoading(false);
        setError("You must be logged in to see your jobs.");
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${BASE_URL}/api/jobs/my`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
        });
        setMyJobs(res.data);
      } catch (err) {
        console.error('Failed to fetch my jobs:', err);
        setError(err.response?.data?.detail || 'Failed to load your jobs.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyJobs();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Jobs</h1>
        {loading ? (
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-3"></div>
            <p>Loading your jobs...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <div className="space-y-4">
            {myJobs.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p>You have not posted any jobs yet.</p>
                <p className="text-sm mt-2">Start by posting your first job!</p>
              </div>
            ) : (
              myJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  showLocation={true}
                  showDateTime={true}
                  type="my-job"
                />
              ))
            )}
          </div>
        )}
      </div>
      <BottomNavigation activeTab="Home" />
    </div>
  );
};

export default MyJobs;