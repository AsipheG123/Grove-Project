import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const jobCategories = [
  "Cleaning", "Yardwork", "Childcare", "House Help", "General Repairs",
  "Admin Help", "Delivery Help", "Elderly Care", "Photography", "Graphic Design",
  "Social Media", "Tutoring", "Pet Care", "Moving Help", "Event Help"
];

const CATEGORY_OPTIONS = jobCategories;
const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const steps = [
  'Personal Info',
  'Job Categories',
  'Verification',
];

const RequesterOnboarding = () => {
  const { user, token, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: user?.full_name || '',
    gender: '',
    birthday: '',
    idNumber: '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: '',
    jobCategories: [],
    customCategory: '',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    idDocument: null,
    profilePicture: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Validation for each step
  const validateStep = () => {
    if (step === 0) {
      if (!form.name || !form.gender || !form.birthday || !form.idNumber || !form.phone || !form.address) {
        setError('Please fill in all required fields.');
        return false;
      }
    }
    if (step === 1) {
      if (form.jobCategories.length === 0 && !form.customCategory) {
        setError('Please select at least one job category or add a custom category.');
        return false;
      }
    }
    if (step === 2) {
      // Step 3 is optional - just verification documents
      // No validation required
    }
    setError('');
    return true;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCategoryToggle = (category) => {
    setForm((prev) => ({
      ...prev,
      jobCategories: prev.jobCategories.includes(category)
        ? prev.jobCategories.filter((c) => c !== category)
        : [...prev.jobCategories, category],
    }));
  };

  const handleAddCustomCategory = () => {
    if (form.customCategory.trim() && !form.jobCategories.includes(form.customCategory.trim())) {
      setForm((prev) => ({
        ...prev,
        jobCategories: [...prev.jobCategories, prev.customCategory.trim()],
        customCategory: '',
      }));
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step === steps.length - 1) {
        setDone(true);
      } else {
        setStep((s) => s + 1);
      }
    }
  };
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('full_name', form.name);
      formData.append('phone', form.phone);
      formData.append('address', form.address);
      formData.append('gender', form.gender);
      formData.append('birthday', form.birthday);
      formData.append('id_number', form.idNumber);
      formData.append('job_categories', form.jobCategories.join(','));
      formData.append('bio', form.bio || '');
      formData.append('bank_name', form.bankName);
      formData.append('account_number', form.accountNumber);
      formData.append('account_holder', form.accountHolder);
      if (form.profilePicture) formData.append('profile_picture', form.profilePicture);
      if (form.idDocument) formData.append('id_document', form.idDocument);
      
      // Debug: print all FormData entries
      console.log('Submitting requester onboarding data:');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ':', pair[1]);
      }
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/profile/requester-onboarding`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save onboarding data');
      }
      
      const result = await response.json();
      console.log('Requester onboarding response:', result);
      
      // Refresh user profile to get updated data
      await fetchUserProfile();
      
      // Navigate to dashboard
      navigate('/requester-dashboard');
    } catch (err) {
      console.error('Requester onboarding error:', err);
      setError(err.message || 'Failed to save onboarding info.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Personal Info
  const renderPersonalInfo = () => (
    <div className="space-y-5">
      <div>
        <label className="block font-semibold mb-1">Full Name</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          required
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Gender</label>
        <select
          name="gender"
          value={form.gender}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          required
        >
          <option value="">Select gender</option>
          {GENDER_OPTIONS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block font-semibold mb-1">Birthday</label>
        <input
          type="date"
          name="birthday"
          value={form.birthday}
          onChange={handleChange}
          max="2008-12-31"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          required
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">ID Number</label>
        <input
          type="text"
          name="idNumber"
          value={form.idNumber}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          required
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Phone Number</label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          required
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Street Address</label>
        <input
          type="text"
          name="address"
          value={form.address}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          required
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Profile Picture</label>
        <input
          type="file"
          name="profilePicture"
          onChange={handleChange}
          accept="image/*"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>
    </div>
  );

  // Step 2: Job Categories
  const renderJobCategories = () => (
    <div className="space-y-5">
      <div>
        <label className="block font-semibold mb-3">Select Job Categories</label>
        <p className="text-sm text-gray-600 mb-4">
          Choose the types of jobs you plan to post. You can select multiple categories.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => handleCategoryToggle(category)}
              className={`p-3 text-sm rounded-lg border transition-colors ${
                form.jobCategories.includes(category)
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block font-semibold mb-2">Add Custom Category</label>
        <div className="flex gap-2">
          <input
            type="text"
            name="customCategory"
            value={form.customCategory}
            onChange={handleChange}
            placeholder="e.g., Personal Shopper, Tutoring"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="button"
            onClick={handleAddCustomCategory}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
      
      {form.jobCategories.length > 0 && (
        <div>
          <label className="block font-semibold mb-2">Selected Categories:</label>
          <div className="flex flex-wrap gap-2">
            {form.jobCategories.map((category) => (
              <span
                key={category}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Bank Details Section */}
      <div className="border-t pt-5">
        <h3 className="font-semibold mb-3">Bank Details</h3>
        <div className="space-y-3">
          <div>
            <label className="block font-semibold mb-1">Bank Name</label>
            <input
              type="text"
              name="bankName"
              value={form.bankName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Account Number</label>
            <input
              type="text"
              name="accountNumber"
              value={form.accountNumber}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Account Holder Name</label>
            <input
              type="text"
              name="accountHolder"
              value={form.accountHolder}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Step 3: Verification
  const renderVerification = () => (
    <div className="space-y-5">
      <div>
        <label className="block font-semibold mb-1">ID Document</label>
        <input
          type="file"
          name="idDocument"
          onChange={handleChange}
          accept="image/*,.pdf"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <p className="text-sm text-gray-600 mt-1">
          Upload a clear photo or scan of your ID document for verification.
        </p>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Verification Process</h3>
        <p className="text-sm text-blue-700">
          Your ID document will be used to verify your identity. This helps ensure the safety and trust of our community.
        </p>
      </div>
    </div>
  );

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your requester profile has been set up successfully. You can now start posting jobs and connecting with workers.
          </p>
          <button
            onClick={() => navigate('/requester-dashboard')}
            className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Let's set up your requester account</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((stepName, index) => (
              <span
                key={index}
                className={`text-sm font-medium ${
                  index <= step ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {stepName}
              </span>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          {step === 0 && renderPersonalInfo()}
          {step === 1 && renderJobCategories()}
          {step === 2 && renderVerification()}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className={`px-6 py-2 rounded-lg border transition-colors ${
                step === 0
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Back
            </button>
            
            <div className="flex gap-3">
              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequesterOnboarding; 