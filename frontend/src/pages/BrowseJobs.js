import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Navigation';
import BottomNavigation from '../components/BottomNavigation';
import JobCard from '../components/JobCard';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:8000';

const BrowseJobs = () => {
  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [myApplications, setMyApplications] = useState([]);
  
  // Parse URL parameters for initial filter
  const query = new URLSearchParams(location.search);
  const initialFilter = query.get('filter') || 'All';
  // Convert 'recommended' to 'Recommended' for consistency
  const normalizedFilter = initialFilter === 'recommended' ? 'Recommended' : initialFilter;
  const [filter, setFilter] = useState(normalizedFilter);
  
  const [error, setError] = useState('');

  const fetchMyApplications = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${BASE_URL}/api/applications/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMyApplications(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching applications:', err);
      return [];
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `${BASE_URL}/api/jobs`;
      const params = new URLSearchParams();
      
      if (filter === 'Recommended' && user && user.skills && user.skills.length > 0) {
        params.append('categories', user.skills.join(','));
        console.log('Filtering by recommended skills:', user.skills);
      } else if (filter !== 'All' && filter !== 'Recommended') {
        params.append('category', filter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('Fetching jobs from:', url);
      const res = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      console.log('Jobs response:', res.data);
      
      // Sort jobs by latest first
      const sortedJobs = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Filter out jobs that the user has already applied to
      const filteredJobs = sortedJobs.filter(job => {
        const hasApplied = myApplications.some(app => app.job_id === job.id);
        if (hasApplied) {
          console.log(`Job ${job.id} (${job.title}) filtered out - already applied`);
        }
        return !hasApplied;
      });
      
      setJobs(filteredJobs);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationSuccess = async (jobId) => {
    // Refresh applications first, then jobs
    await fetchMyApplications();
    fetchJobs();
  };

  useEffect(() => {
    // Redirect requesters to their dashboard
    if (user && user.role === 'requester') {
      navigate('/requester-dashboard');
      return;
    }
    
    if (token) {
      // First fetch applications, then jobs
      fetchMyApplications().then(() => {
        fetchJobs();
      });
    } else {
      fetchJobs();
    }
  }, [token, filter, user, navigate]);

  // Filter jobs by search
  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(search.toLowerCase()) ||
    job.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Available Jobs</h1>
        
        {/* Job count and filter info */}
        <div className="mb-4 text-sm text-gray-600">
          {loading ? (
            <span>Loading jobs...</span>
          ) : (
            <span>
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} available
              {filter === 'Recommended' && user?.skills && (
                <span className="ml-2">• Filtered by your skills</span>
              )}
            </span>
          )}
        </div>
        
        <input
          type="text"
          placeholder="Search jobs"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        
        {/* Filter Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-4">
            <button
              className={`px-4 py-2 rounded-full font-semibold ${filter === 'All' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setFilter('All')}
            >
              All
            </button>
            <button
              className={`px-4 py-2 rounded-full font-semibold ${filter === 'Recommended' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setFilter('Recommended')}
            >
              Recommended
            </button>
          </div>
          
          {/* Advanced Filter Button */}
          <button
            onClick={() => console.log('Advanced filters clicked')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
        </div>
        
        
        {loading ? (
          <div className="text-center text-gray-500 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div>
            <p>Finding the perfect jobs for you...</p>
            {filter === 'Recommended' && (
              <p className="text-sm text-gray-400 mt-1">AI is analyzing your skills and preferences</p>
            )}
          </div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.length === 0 ? (
              <div className="text-center text-gray-500">No jobs found.</div>
            ) : (
              filteredJobs.map(job => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  showRequestButton={true}
                  onApplicationSuccess={handleApplicationSuccess}
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

export default BrowseJobs; 