import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('grove_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState({ cities: [], job_categories: [] });

  // Set authorization header if token exists
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    }
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      setConfig(response.data);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
      if (response.data.role === 'worker') {
        setCurrentScreen('worker-dashboard');
      } else {
        setCurrentScreen('requester-dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('grove_token');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentScreen('welcome');
  };

  const handleLogin = async (credentials) => {
  try {
    const response = await axios.post(`${API}/auth/login`, credentials);
    console.log(response); 
    if (response.data && response.data.detail) {
      // Show specific error from API response
      setError(response.data.detail);
    } else if (response.data && response.data.token) {
      setToken(response.data.token);
      localStorage.setItem('grove_token', response.data.token);
      setUser(response.data.user);
      setCurrentScreen('home');
    } else {
      setError('Unexpected response from server.');
    }
  } catch (error) {
    if (error.response) {
      // Check for status codes and display tailored errors
      if (error.response.status === 401) {
        setError('Incorrect password. Please try again.');
      } else if (error.response.status === 404) {
        setError('Email not found. Please sign up.');
      } else {
        setError(error.response.data.detail || 'Login failed. Please try again.');
      }
    } else {
      setError('Network error. Please check your connection.');
    }
  }
};

  const handleRegister = async (userData) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token, user: newUser } = response.data;
      
      setToken(access_token);
      setUser(newUser);
      localStorage.setItem('grove_token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      if (newUser.role === 'worker') {
        setCurrentScreen('worker-dashboard');
      } else {
        setCurrentScreen('requester-dashboard');
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Registration failed');
    }
    setLoading(false);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen onNavigate={setCurrentScreen} />;
      case 'login':
        return <LoginScreen onLogin={handleLogin} onNavigate={setCurrentScreen} loading={loading} error={error} />;
      case 'register':
        return <RegisterScreen onRegister={handleRegister} onNavigate={setCurrentScreen} loading={loading} error={error} config={config} />;
      case 'forgotPassword':
        return <ForgotPasswordScreen onNavigate={setCurrentScreen} />;
      case 'worker-dashboard':
        return <WorkerDashboard user={user} onNavigate={setCurrentScreen} onLogout={logout} />;
      case 'requester-dashboard':
        return <RequesterDashboard user={user} onNavigate={setCurrentScreen} onLogout={logout} />;
      case 'browse-jobs':
        return <BrowseJobs user={user} onNavigate={setCurrentScreen} config={config} />;
      case 'post-job':
        return <PostJob user={user} onNavigate={setCurrentScreen} config={config} />;
      case 'my-jobs':
        return <MyJobs user={user} onNavigate={setCurrentScreen} />;
      case 'my-applications':
        return <MyApplications user={user} onNavigate={setCurrentScreen} />;
      case 'profile':
        return <Profile user={user} onNavigate={setCurrentScreen} config={config} />;
      default:
        return <WelcomeScreen onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderScreen()}
    </div>
  );
};

// Welcome Screen
const WelcomeScreen = ({ onNavigate }) => (
  <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex flex-col justify-center items-center px-4">
    <div className="text-center text-white mb-8">
      <h1 className="text-6xl font-bold mb-4">🌱 Grove</h1>
      <p className="text-xl mb-2">Connect. Work. Grow.</p>
      <p className="text-green-100 max-w-md mx-auto">
        The marketplace that connects skilled workers with meaningful opportunities
      </p>
    </div>
    
    <div className="space-y-4 w-full max-w-sm">
      <button
        onClick={() => onNavigate('login')}
        className="w-full bg-white text-green-600 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-50 transition-colors"
      >
        Sign In
      </button>
      <button
        onClick={() => onNavigate('register')}
        className="w-full bg-green-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-400 transition-colors border-2 border-white"
      >
        Get Started
      </button>
    </div>
    
    <div className="mt-12 text-center text-green-100">
      <p className="text-sm mb-2">Join thousands of workers and businesses</p>
      <div className="flex justify-center space-x-6 text-xs">
        <span>✓ Verified profiles</span>
        <span>✓ Secure payments</span>
        <span>✓ Local jobs</span>
      </div>
    </div>
  </div>
);

// Login Screen
const LoginScreen = ({ onLogin, onNavigate, loading, error }) => {
  const ForgotPasswordScreen = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      setMessage('A password reset link has been sent to your email.');
    } catch (error) {
      setMessage('Error sending password reset email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold mb-4">Forgot Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          name="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          required
        />
        <button
          type="submit"
          className="w-full bg-green-600 text-white px-3 py-2 rounded-md"
        >
          Reset Password
        </button>
      </form>
      {message && <p className="mt-4 text-center">{message}</p>}
      <button
        className="mt-4 text-blue-600 hover:underline"
        onClick={() => onNavigate('login')}
      >
        Back to Sign In
      </button>
    </div>
  );
};


  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ email, password });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">🌱 Grove</h2>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div></div>
            <p className="mt-2 text-sm text-blue-600 cursor-pointer hover:underline"
            onClick={() => onNavigate('forgotPassword')}>
              Forgot Password?
              /
            </p>


            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <button
                onClick={() => onNavigate('register')}
                className="text-green-600 hover:text-green-500 text-sm"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Register Screen
const RegisterScreen = ({ onRegister, onNavigate, loading, error, config }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'worker',
    city: '',
    bio: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegister(formData);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">🌱 Grove</h2>
          <p className="mt-2 text-gray-600">Create your account</p>
        </div>

        <div className="bg-white rounded-lg shadow px-6 py-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">I want to:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'worker' })}
                className={`p-4 border-2 rounded-lg text-center ${
                  formData.role === 'worker'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">👷</div>
                <div className="font-semibold">Find Work</div>
                <div className="text-xs text-gray-500">As a Worker</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'requester' })}
                className={`p-4 border-2 rounded-lg text-center ${
                  formData.role === 'requester'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🏠</div>
                <div className="font-semibold">Post Jobs</div>
                <div className="text-xs text-gray-500">As a Requester</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input
              name="city"
              required
              type="text"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter your city"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Bio (Optional)</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="Tell us about yourself..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => onNavigate('login')}
              className="text-green-600 hover:text-green-500 text-sm"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Worker Dashboard
const WorkerDashboard = ({ user, onNavigate, onLogout }) => (
  <div className="min-h-screen bg-gray-50">
    <Header user={user} onLogout={onLogout} />
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.full_name.split(' ')[0]}!</h1>
        <p className="text-gray-600 mt-1">Ready to find your next gig?</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-green-600">{user.total_jobs}</div>
          <div className="text-sm text-gray-600">Jobs Completed</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-yellow-500">⭐ {user.rating.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Rating</div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => onNavigate('browse-jobs')}
          className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-between hover:bg-green-700 transition-colors"
        >
          <span>🔍 Browse Jobs</span>
          <span>→</span>
        </button>
        
        <button
          onClick={() => onNavigate('my-applications')}
          className="w-full bg-white text-gray-700 py-4 px-6 rounded-lg font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors border"
        >
          <span>📋 My Applications</span>
          <span>→</span>
        </button>
        
        <button
          onClick={() => onNavigate('profile')}
          className="w-full bg-white text-gray-700 py-4 px-6 rounded-lg font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors border"
        >
          <span>👤 Profile & Skills</span>
          <span>→</span>
        </button>
      </div>
    </div>
  </div>
);

// Requester Dashboard
const RequesterDashboard = ({ user, onNavigate, onLogout }) => (
  <div className="min-h-screen bg-gray-50">
    <Header user={user} onLogout={onLogout} />
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hello, {user.full_name.split(' ')[0]}!</h1>
        <p className="text-gray-600 mt-1">What do you need help with today?</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-blue-600">{user.total_jobs}</div>
          <div className="text-sm text-gray-600">Jobs Posted</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-yellow-500">⭐ {user.rating.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Rating</div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => onNavigate('post-job')}
          className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-between hover:bg-green-700 transition-colors"
        >
          <span>➕ Post a Job</span>
          <span>→</span>
        </button>
        
        <button
          onClick={() => onNavigate('my-jobs')}
          className="w-full bg-white text-gray-700 py-4 px-6 rounded-lg font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors border"
        >
          <span>📝 My Jobs</span>
          <span>→</span>
        </button>
        
        <button
          onClick={() => onNavigate('profile')}
          className="w-full bg-white text-gray-700 py-4 px-6 rounded-lg font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors border"
        >
          <span>👤 Profile</span>
          <span>→</span>
        </button>
      </div>
    </div>
  </div>
);

// Browse Jobs Screen
const BrowseJobs = ({ user, onNavigate, config }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchJobs();
  }, [selectedCategory]);

  const fetchJobs = async () => {
    try {
      const params = selectedCategory ? `?category=${selectedCategory}` : '';
      const response = await axios.get(`${API}/jobs${params}`);
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
    setLoading(false);
  };

  const applyToJob = async (jobId) => {
    try {
      await axios.post(`${API}/jobs/${jobId}/apply`, {
        message: "I'm interested in this job and available to start immediately."
      });
      alert('Application submitted successfully!');
      fetchJobs(); // Refresh to update application count
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to apply');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onBack={() => onNavigate('worker-dashboard')} />
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Browse Jobs</h1>
        
        {/* Category Filter */}
        <div className="mb-6">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All Categories</option>
            {config.job_categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading jobs...</div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">No jobs found</div>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} onApply={applyToJob} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Job Card Component
const JobCard = ({ job, onApply }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-semibold text-gray-900">{job.title}</h3>
      <div className="text-right">
        <div className="text-lg font-bold text-green-600">${job.budget}</div>
        <div className="text-xs text-gray-500">{job.urgency}</div>
      </div>
    </div>
    
    <p className="text-gray-600 text-sm mb-3">{job.description}</p>
    
    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
      <span>📍 {job.location}</span>
      <span>📂 {job.category}</span>
    </div>
    
    <div className="flex items-center justify-between">
      <div className="text-xs text-gray-500">
        Posted by {job.requester_name} • {job.applications_count} applications
      </div>
      <button
        onClick={() => onApply(job.id)}
        className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700"
      >
        Apply
      </button>
    </div>
  </div>
);

// Post Job Screen
const PostJob = ({ user, onNavigate, config }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    location: '',
    urgency: 'normal',
    requirements: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/jobs`, {
        ...formData,
        budget: parseFloat(formData.budget)
      });
      alert('Job posted successfully!');
      onNavigate('my-jobs');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to post job');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onBack={() => onNavigate('requester-dashboard')} />
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Post a Job</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Job Title</label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="e.g., House cleaning needed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select category</option>
              {config.job_categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="Describe what you need help with..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Budget ($)</label>
            <input
              type="number"
              name="budget"
              required
              min="0"
              step="0.01"
              value={formData.budget}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              name="location"
              required
              value={formData.location}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="e.g., Downtown, specific address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Urgency</label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              <option value="flexible">Flexible</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </form>
      </div>
    </div>
  );
};

// My Jobs and My Applications screens (simplified for now)
const MyJobs = ({ user, onNavigate }) => (
  <div className="min-h-screen bg-gray-50">
    <Header user={user} onBack={() => onNavigate('requester-dashboard')} />
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Jobs</h1>
      <div className="text-center py-12 text-gray-500">
        Feature coming soon...
      </div>
    </div>
  </div>
);

const MyApplications = ({ user, onNavigate }) => (
  <div className="min-h-screen bg-gray-50">
    <Header user={user} onBack={() => onNavigate('worker-dashboard')} />
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Applications</h1>
      <div className="text-center py-12 text-gray-500">
        Feature coming soon...
      </div>
    </div>
  </div>
);

const Profile = ({ user, onNavigate, config }) => (
  <div className="min-h-screen bg-gray-50">
    <Header user={user} onBack={() => onNavigate(user.role === 'worker' ? 'worker-dashboard' : 'requester-dashboard')} />
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
      <div className="text-center py-12 text-gray-500">
        Feature coming soon...
      </div>
    </div>
  </div>
);

// Header Component
const Header = ({ user, onLogout, onBack }) => (
  <div className="bg-white shadow-sm border-b">
    <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
      {onBack ? (
        <button onClick={onBack} className="text-green-600 font-medium">
          ← Back
        </button>
      ) : (
        <div className="text-xl font-bold text-green-600">🌱 Grove</div>
      )}
      
      {onLogout && (
        <button
          onClick={onLogout}
          className="text-gray-600 text-sm hover:text-gray-800"
        >
          Sign Out
        </button>
      )}
    </div>
  </div>
);

export default App;