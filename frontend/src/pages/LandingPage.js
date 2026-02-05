import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center justify-center text-center px-4">
      <div className="max-w-2xl">
        <h1 className="text-5xl font-bold">
          <span role="img" aria-label="sapling">🌱</span> Grove
        </h1>
        <p className="mt-4 text-2xl font-semibold text-gray-700 dark:text-gray-300">
          Connect. Work. Grow.
        </p>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Connecting capable workers with meaningful opportunities.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row sm:justify-center gap-4">
          <Link
            to="/login"
            className="w-full sm:w-auto bg-green-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white py-3 px-8 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 