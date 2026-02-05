import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    // Placeholder: Add API call for password reset here
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8 flex flex-col items-center">
        <div className="mb-6">
          {/* Envelope with lock SVG */}
          <svg width="96" height="96" fill="none" viewBox="0 0 24 24" className="mx-auto mb-4">
            <rect width="24" height="24" rx="12" fill="#FDE68A"/>
            <path d="M7 10V8a5 5 0 0 1 10 0v2" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="5" y="10" width="14" height="9" rx="2" fill="#fff" stroke="#111827" strokeWidth="1.5"/>
            <path d="M12 14v2" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="13.5" r=".75" fill="#2563EB"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Forgot Password</h1>
        <p className="text-gray-600 mb-6 text-center">Please enter your email address to reset your password.</p>
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="Email address"
            className="w-full mb-4 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors mb-2"
          >
            Reset Password
          </button>
          {submitted && (
            <div className="text-green-600 text-center mt-2 font-semibold">If this email exists, a reset link will be sent.</div>
          )}
        </form>
        <button
          onClick={() => navigate('/login')}
          className="mt-4 text-gray-600 hover:text-green-600 text-base underline"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen; 