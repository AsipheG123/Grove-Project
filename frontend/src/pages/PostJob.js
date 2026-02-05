import React, { useState } from 'react';
import { Header } from '../components/Navigation';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import BottomNavigation from '../components/BottomNavigation';

const jobCategories = [
    "Cleaning", "Yardwork", "Childcare", "House Help", "General Repairs",
    "Admin Help", "Delivery Help", "Elderly Care", "Photography", "Graphic Design",
    "Social Media", "Tutoring", "Pet Care", "Moving Help", "Event Help"
];

const PostJob = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    budget: '',
    category: '',
    urgency: 'normal',
    requirements: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({
      ...prevForm,
      [name]: value
    }));
  };

  const handleJobPost = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setLoading(true);
    setMessage('');
    setError('');

    try {
        console.log('Submitting form with category:', form.category);
        const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/jobs`, {
            title: form.title,
            description: form.description,
            location: form.location,
            budget: parseFloat(form.budget.replace(',', '.')),
            category: form.category,
            urgency: form.urgency,
            requirements: form.requirements,
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            },
        });
        console.log('Job posting successful:', res.data);
        setMessage('Job posted successfully!');
        setForm({
            title: '',
            description: '',
            location: '',
            budget: '',
            category: '',
            urgency: 'normal',
            requirements: '',
        });
        setTimeout(() => navigate('/my-jobs'), 1500);

    } catch (err) {
        console.error('Job posting failed:', err.response?.data || err.message);
        let errorMessage = 'Failed to post job.';
        if (err.response?.data?.detail) {
            if (Array.isArray(err.response.data.detail)) {
                errorMessage = err.response.data.detail.map(e => e.msg).join(', ');
            } else if (typeof err.response.data.detail === 'string') {
                errorMessage = err.response.data.detail;
            } else if (typeof err.response.data.detail === 'object') {
                errorMessage = Object.values(err.response.data.detail).flat().map(e => e.msg || e).join(', ');
            }
        } else if (err.message) {
            errorMessage = err.message;
        }
        setError(errorMessage);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Post a Job</h1>
        {message && <div className="mb-4 text-green-600 text-center font-semibold">{message}</div>}
        {error && <div className="mb-4 text-red-600 text-center font-semibold">{error}</div>}
        <form onSubmit={handleJobPost} className="space-y-4 bg-white p-6 rounded-lg shadow">
          <div>
            <label htmlFor="title" className="block text-gray-700 font-semibold mb-1">Job title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., Garden Maintenance"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-gray-700 font-semibold mb-1">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Describe the job in detail..."
              required
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-gray-700 font-semibold mb-1">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., Cape Town"
              required
            />
          </div>
          <div>
            <label htmlFor="budget" className="block text-gray-700 font-semibold mb-1">Budget (R)</label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={form.budget}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., 250.00"
              step="0.01"
              required
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-gray-700 font-semibold mb-1">Category</label>
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select a category</option>
              {jobCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            {/* Custom Category Option */}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowCustomCategory(!showCustomCategory)}
                className="text-green-600 text-sm underline hover:text-green-700"
              >
                {showCustomCategory ? 'Use predefined categories' : 'Add custom category'}
              </button>
              
              {showCustomCategory && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g., Personal Shopper, Tutoring"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customCategory.trim()) {
                        setForm(prev => ({ ...prev, category: customCategory.trim() }));
                        setCustomCategory('');
                        setShowCustomCategory(false);
                        console.log('Custom category set:', customCategory.trim());
                      }
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="urgency" className="block text-gray-700 font-semibold mb-1">Urgency</label>
            <select
              id="urgency"
              name="urgency"
              value={form.urgency}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label htmlFor="requirements" className="block text-gray-700 font-semibold mb-1">Requirements</label>
            <textarea
              id="requirements"
              name="requirements"
              value={form.requirements}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter job requirements..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </form>
      </div>
      <div className="mb-24"></div>
      <BottomNavigation activeTab="Home" />
    </div>
  );
};

export default PostJob; 