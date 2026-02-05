import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const jobCategories = [
  "Cleaning", "Yardwork", "Childcare", "House Help", "General Repairs",
  "Admin Help", "Delivery Help", "Elderly Care", "Photography", "Graphic Design",
  "Social Media", "Tutoring", "Pet Care", "Moving Help", "Event Help"
];

const SKILL_OPTIONS = jobCategories;
const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const steps = [
  'Personal Info',
  'Skills',
  'Bank Details',
];

const WorkerOnboarding = () => {
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
    skills: [],
    customSkill: '',
    idDocument: null,
    profilePicture: null,
    bankName: '',
    accountNumber: '',
    accountHolder: '',
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
      if (form.skills.length === 0 && !form.customSkill) {
        setError('Please select at least one skill or add a custom skill.');
        return false;
      }
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

  const handleSkillToggle = (skill) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleAddCustomSkill = () => {
    if (form.customSkill.trim() && !form.skills.includes(form.customSkill.trim())) {
      setForm((prev) => ({
        ...prev,
        skills: [...prev.skills, prev.customSkill.trim()],
        customSkill: '',
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
      formData.append('skills', form.skills.join(','));
      formData.append('bank_name', form.bankName);
      formData.append('account_number', form.accountNumber);
      formData.append('account_holder', form.accountHolder);
      formData.append('bio', form.bio || '');
      if (form.profilePicture) formData.append('profile_picture', form.profilePicture);
      if (form.idDocument) formData.append('id_document', form.idDocument);
      
      // Debug: print all FormData entries
      console.log('Submitting onboarding data:');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ':', pair[1]);
      }
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/profile/onboarding`, {
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
      console.log('Onboarding response:', result);
      
      // Refresh user profile to get updated data
      await fetchUserProfile();
      
      // Navigate to dashboard
      navigate('/worker-dashboard');
    } catch (err) {
      console.error('Onboarding error:', err);
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
          min="1960-01-01"
          max="2006-12-31"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Age range: 18-64 years old</p>
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
        <label className="block font-semibold mb-1">Phone Number <span className="text-red-500">*</span></label>
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
        <label className="block font-semibold mb-1">Email (optional)</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Home Address / Suburb</label>
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
        <label className="block font-semibold mb-1">Upload ID/Passport</label>
        <input
          type="file"
          name="idDocument"
          accept="image/*,application/pdf"
          onChange={handleChange}
          className="w-full px-2 py-1 border border-gray-300 rounded-lg bg-white"
          required
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Profile Picture</label>
        <input
          type="file"
          name="profilePicture"
          accept="image/*"
          onChange={handleChange}
          className="w-full px-2 py-1 border border-gray-300 rounded-lg bg-white"
          required
        />
      </div>
    </div>
  );

  // Step 2: Skills
  const renderSkills = () => (
    <div className="space-y-5">
      <div>
        <label className="block font-semibold mb-2">Skills</label>
        <div className="flex flex-wrap gap-2">
          {SKILL_OPTIONS.map((skill) => (
            <button
              type="button"
              key={skill}
              onClick={() => handleSkillToggle(skill)}
              className={`px-4 py-2 rounded-full font-semibold border-2 flex items-center gap-2 transition-colors
                ${form.skills.includes(skill)
                  ? 'bg-green-500 text-white border-green-600 shadow-lg'
                  : 'bg-white text-green-700 border-green-300 hover:bg-green-100'}`}
            >
              <span role="img" aria-label="check">{form.skills.includes(skill) ? '✅' : '⬜'}</span>
              {skill}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block font-semibold mb-1">Add Custom Skill</label>
        <div className="flex gap-2">
          <input
            type="text"
            name="customSkill"
            value={form.customSkill}
            onChange={handleChange}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="button"
            onClick={handleAddCustomSkill}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );

  // Step 3: Bank Details
  const renderBankDetails = () => (
    <div className="space-y-5">
      <div>
        <label className="block font-semibold mb-1">Bank Name</label>
        <input
          type="text"
          name="bankName"
          value={form.bankName}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          required
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
          required
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
          required
        />
      </div>
    </div>
  );

  // Progress bar
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-200 via-blue-100 to-purple-200 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
        {done ? (
          <div className="flex flex-col items-center justify-center w-full">
            <h1 className="text-2xl font-bold text-green-700 mb-4">Thanks for Signing Up with Grove!</h1>
            <p className="mb-6 text-lg text-gray-700 text-center">Your profile is ready. You can now start browsing and applying for jobs.</p>
            <button
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Go to Dashboard'}
            </button>
          </div>
        ) : (
          <>
            <div className="w-full mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-700 font-bold">{steps[step]}</span>
                <span className="text-gray-500 text-sm">Step {step + 1} of {steps.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full" style={{ width: `${((step + 1) / steps.length) * 100}%` }}></div>
              </div>
            </div>
            {error && <div className="mb-4 text-red-600 font-semibold w-full text-center">{error}</div>}
            <form onSubmit={handleSubmit} className="w-full space-y-5">
              {step === 0 && renderPersonalInfo()}
              {step === 1 && renderSkills()}
              {step === 2 && renderBankDetails()}
              <div className="flex justify-between mt-8">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors ml-auto"
                >
                  {step === steps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkerOnboarding; 