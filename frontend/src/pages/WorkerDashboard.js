import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Navigation';
import BottomNavigation from '../components/BottomNavigation';
import JobCard from '../components/JobCard';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:8000';

// Skill to Category Mapping (matching backend logic)
const SKILL_CATEGORY_MAPPING = {
  // Tutoring & Education
  "tutoring": ["Tutoring"],
  "teaching": ["Tutoring"],
  "education": ["Tutoring"],
  "math": ["Tutoring"],
  "english": ["Tutoring"],
  "science": ["Tutoring"],
  "languages": ["Tutoring"],
  
  // Photography & Media
  "photography": ["Photography"],
  "photo": ["Photography"],
  "camera": ["Photography"],
  "videography": ["Photography"],
  "video": ["Photography"],
  "media": ["Photography", "Freelancing"],
  
  // Coaching & Personal Development
  "coaching": ["Coaching"],
  "mentoring": ["Coaching"],
  "life coach": ["Coaching"],
  "career coach": ["Coaching"],
  "personal development": ["Coaching"],
  
  // Freelancing & Digital Services
  "freelancing": ["Freelancing"],
  "website design": ["Freelancing"],
  "web design": ["Freelancing"],
  "graphic design": ["Freelancing"],
  "social media": ["Freelancing"],
  "digital marketing": ["Freelancing"],
  "content creation": ["Freelancing"],
  "seo": ["Freelancing"],
  "programming": ["Freelancing"],
  "coding": ["Freelancing"],
  "app development": ["Freelancing"],
  "software": ["Freelancing"],
  
  // Physical Services
  "house cleaning": ["House Cleaning"],
  "cleaning": ["Cleaning", "House Cleaning"],
  "domestic": ["House Cleaning"],
  "childcare": ["Childcare"],
  "babysitting": ["Childcare"],
  "child care": ["Childcare"],
  "painting": ["Painting"],
  "decorating": ["Painting"],
  "moving": ["Moving Assistance"],
  "furniture": ["Moving Assistance"],
  "yard work": ["Yard Work"],
  "gardening": ["Yard Work"],
  "landscaping": ["Yard Work"],
  "maintenance": ["House Cleaning", "Yard Work", "Painting"]
};

const mapSkillToCategories = (skill) => {
  const skillLower = skill.toLowerCase();
  for (const [skillKey, categories] of Object.entries(SKILL_CATEGORY_MAPPING)) {
    if (skillLower.includes(skillKey) || skillKey.includes(skillLower)) {
      return categories;
    }
  }
  return [];
};

const WorkerDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // State for recommended jobs
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApplicationSuccess = async (jobId) => {
    // Refresh applications list first, then recommended jobs
    await fetchMyApplications();
    // Refresh recommended jobs to remove the applied job
    fetchRecommendedJobs();
  };

  const fetchRecommendedJobs = async () => {
    if (!token) return;

    try {
      setLoading(true);
      console.log('Current user skills:', user?.skills);
      console.log('User object:', user);
      
      // Only fetch recommended jobs if user has skills
      if (!user?.skills || user.skills.length === 0) {
        console.log('No skills found, setting empty jobs list');
        setRecommendedJobs([]);
        setError('Please add your skills in Edit Profile to see recommended jobs');
        setLoading(false);
        return;
      }

      let url = `${BASE_URL}/api/jobs`;
      const params = new URLSearchParams();
      
      // Send user's skills as categories for filtering
      params.append('categories', user.skills.join(','));
      console.log('Fetching recommended jobs for skills:', user.skills);
      console.log('API URL with params:', url + '?' + params.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Recommended jobs response:', response.data);
      console.log('Current applications:', myApplications);
      
             // Filter jobs to ensure they actually match user skills and haven't been applied to
       const skillMatchedJobs = response.data.filter(job => {
         if (!job.category) return false;
         
         // Check if job category matches any of user's skills
         const jobCategoryLower = job.category.toLowerCase();
         const skillMatch = user.skills.some(skill => {
           const skillLower = skill.toLowerCase();
           // Direct category match
           if (skillLower === jobCategoryLower) return true;
           
           // Check skill-to-category mapping
           const mappedCategories = mapSkillToCategories(skillLower);
           return mappedCategories.includes(job.category);
         });
         
         // Also check if user hasn't already applied to this job
         const hasApplied = myApplications.some(app => app.job_id === job.id);
         
         if (hasApplied) {
           console.log(`Job ${job.id} (${job.title}) filtered out - already applied`);
         }
         
         return skillMatch && !hasApplied;
       });
      
      console.log('Skill-matched jobs:', skillMatchedJobs);
      setRecommendedJobs(skillMatchedJobs);
      setError('');
    } catch (err) {
      console.error('Error fetching recommended jobs:', err);
      setError('Failed to load recommended jobs');
      setRecommendedJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${BASE_URL}/api/applications/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMyApplications(response.data);
      return response.data; // Return the data for chaining
    } catch (err) {
      console.error('Error fetching applications:', err);
      // Don't set error for applications as it might be empty
      return []; // Return empty array on error
    }
  };

  useEffect(() => {
    if (user && token) {
      // First fetch applications, then recommended jobs
      fetchMyApplications().then(() => {
        fetchRecommendedJobs();
      });
    }
  }, [user, token]);

  // Refresh recommended jobs when skills or applications change
  useEffect(() => {
    if (user?.skills && token && myApplications.length >= 0) {
      fetchRecommendedJobs();
    }
  }, [user?.skills, token, myApplications]);

  // No default job in progress - will be null until user has an active job
  const jobInProgressWorker = null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">
      <Header />
      <div className="flex-grow max-w-md mx-auto px-4 py-6 w-full">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back, {user?.full_name || 'Worker'}!</h1>
          
          {/* AI Job Matching Feature - Minimal */}
          <div className="mt-3 flex items-center justify-end">
            <button 
              onClick={() => console.log('AI Job Matching clicked')}
              className="flex flex-col items-center p-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-full hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-sm"
              title="Optimize Job Matching with AI"
            >
              <span className="text-lg">🤖</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">Optimize Job Matching with AI</p>
          
          {/* Skills Display */}
          {user?.skills && user.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {user.skills.map((skill, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          
          {/* No Skills Warning */}
          {(!user?.skills || user.skills.length === 0) && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-yellow-800 text-sm">
                  ⚠️ No skills set. Add your skills to see personalized job recommendations.
                </span>
                <button 
                  onClick={() => navigate('/edit-profile')}
                  className="ml-2 text-yellow-700 hover:text-yellow-900 font-medium underline text-sm"
                >
                  Add Skills
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Header Section: Browse Jobs Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/browse-jobs')}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center hover:bg-green-700 transition-colors"
          >
            Browse Jobs
          </button>
        </div>

        {/* Job in Progress Section (Worker) */}
        {jobInProgressWorker ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-0 mb-4 overflow-hidden">
            <h2 className="text-lg font-bold px-4 pt-3 pb-2">Job in Progress</h2>
            <div className="relative">
              <img src={jobInProgressWorker.mapPlaceholder} alt="Job Location Map" className="w-full h-32 object-cover" style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }} />
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
              <div className="font-semibold text-base">{jobInProgressWorker.title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-300">{jobInProgressWorker.location}</div>
              <div className="text-sm text-gray-500 dark:text-gray-300">{jobInProgressWorker.dateTime}</div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mb-4">
            <h2 className="text-lg font-bold mb-3">Job in Progress</h2>
            <div className="text-center text-gray-500 py-6">
              <p className="text-base mb-2">No Jobs in Progress</p>
              <p className="text-sm mb-3">Find work now!</p>
              <button
                onClick={() => navigate('/browse-jobs')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Browse Jobs
              </button>
            </div>
          </div>
        )}

        {/* Recommended Jobs Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recommended Jobs</h2>
            {recommendedJobs.length > 0 && (
              <button 
                onClick={() => navigate('/browse-jobs?filter=recommended')}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                See All
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading recommended jobs...</div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">{error}</div>
              {error.includes('Please add your skills') && (
                <button 
                  onClick={() => navigate('/edit-profile')}
                  className="text-green-600 hover:text-green-700 font-medium underline"
                >
                  Go to Edit Profile
                </button>
              )}
            </div>
          ) : recommendedJobs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {user?.skills && user.skills.length > 0 
                ? "No jobs found matching your skills. Try expanding your skill set!"
                : "Please add your skills in Edit Profile to see recommended jobs"
              }
              {(!user?.skills || user.skills.length === 0) && (
                <div className="mt-2">
                  <button 
                    onClick={() => navigate('/edit-profile')}
                    className="text-green-600 hover:text-green-700 font-medium underline"
                  >
                    Add Skills Now
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Show only first 3 jobs */}
              {recommendedJobs.slice(0, 3).map((job) => (
                <JobCard 
                  key={job.id}
                  job={job}
                  showLocation={true}
                  showDateTime={true}
                  compact={true}
                  showRequestButton={true}
                  onApplicationSuccess={handleApplicationSuccess}
                />
              ))}
              
              {/* Show "See All" if there are more than 3 jobs */}
              {recommendedJobs.length > 3 && (
                <div className="text-center pt-2">
                  <button 
                    onClick={() => navigate('/browse-jobs?filter=recommended')}
                    className="text-green-600 hover:text-green-700 font-medium text-sm"
                  >
                    +{recommendedJobs.length - 3} more jobs available
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* My Applications Section */}
        <div className="mb-24">
          <h2 className="text-xl font-bold mb-3">My Applications</h2>
          <div className="space-y-3">
            {myApplications.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                <p>You have not applied to any jobs yet.</p>
                <p className="text-sm mt-2">Start browsing jobs to apply!</p>
              </div>
            ) : (
              myApplications.map(app => (
                <JobCard
                  key={app.id}
                  title={app.job_title || 'Job Title Not Available'}
                  location={app.location || 'Location not specified'}
                  dateTime={app.created_at ? new Date(app.created_at).toLocaleString() : ''}
                  status={app.status}
                  type="application"
                />
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNavigation activeTab="Home" />
    </div>
  );
};

export default WorkerDashboard; 