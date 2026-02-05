import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Navigation';
import BottomNavigation from '../components/BottomNavigation';
import { useAuth } from '../contexts/AuthContext';

const PastJobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Dummy data for completed jobs
  const completedJobs = [
    {
      id: 1,
      title: 'House Cleaning',
      location: '15 Kloof St',
      dateTime: '13 Jun • 1:00 PM',
    },
    {
      id: 2,
      title: 'Garden Maintenance',
      location: '3 Mdin Rd',
      dateTime: '10 Jun • 9:00 AM',
    },
    {
      id: 3,
      title: 'Plumbing Repair',
      location: '20 Loop Ave',
      dateTime: '05 Jun • 2:30 PM',
    },
  ];

  const handleNeedHelp = (jobTitle) => {
    alert(`Need help with ${jobTitle}? Contact support.`);
    // In a real application, this would open a modal or navigate to a contact form.
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">
      <Header />
      <div className="flex-grow max-w-md mx-auto px-4 py-6 w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Past Jobs</h1>

        {completedJobs.length > 0 ? (
          <div className="space-y-4">
            {completedJobs.map(job => (
              <div key={job.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold">{job.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{job.location}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{job.dateTime}</p>
                <button
                  onClick={() => handleNeedHelp(job.title)}
                  className="mt-3 w-full bg-blue-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Contact
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 dark:text-gray-400">No completed jobs yet.</p>
        )}
      </div>
      <BottomNavigation activeTab="Past Jobs" />
    </div>
  );
};

export default PastJobs; 