import React from 'react';

const WorkerProfile = ({ worker, onClose, onHire, onReject }) => {
  if (!worker) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Worker Profile</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6 space-y-6">
          {/* Profile Picture and Basic Info */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {worker.profile_picture ? (
                <img 
                  src={worker.profile_picture} 
                  alt={worker.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl text-gray-500">
                  {worker.full_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{worker.full_name}</h3>
              <div className="flex items-center space-x-2">
                <span className="text-yellow-500">⭐</span>
                <span className="text-sm text-gray-600">
                  {worker.rating ? `${worker.rating.toFixed(1)}` : 'No rating yet'}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Member since {worker.created_at ? new Date(worker.created_at).toLocaleDateString() : 'Recently'}
              </p>
            </div>
          </div>

          {/* About Me */}
          {worker.bio && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">About</h4>
              <p className="text-gray-700 text-sm leading-relaxed">{worker.bio}</p>
            </div>
          )}

          {/* Skills */}
          {worker.skills && worker.skills.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {worker.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          {worker.address && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Location</h4>
              <p className="text-gray-700 text-sm">📍 {worker.address}</p>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Contact</h4>
            <div className="space-y-1 text-sm">
              {worker.phone && (
                <p className="text-gray-700">📞 {worker.phone}</p>
              )}
              {worker.email && (
                <p className="text-gray-700">✉️ {worker.email}</p>
              )}
            </div>
          </div>

          {/* Verification Status */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Verification</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700">Profile verified</span>
              </div>
              {worker.id_verified && (
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-700">ID verified</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={onReject}
              className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Reject
            </button>
            <button
              onClick={onHire}
              className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Hire Worker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerProfile;
