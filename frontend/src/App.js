import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPasswordScreen from './pages/ForgotPasswordScreen';
import WorkerDashboard from './pages/WorkerDashboard';
import RequesterDashboard from './pages/RequesterDashboard';
import BrowseJobs from './pages/BrowseJobs';
import PostJob from './pages/PostJob';
import MyJobs from './pages/MyJobs';
import MyApplications from './pages/MyApplications';
import EditProfile from './pages/EditProfile';
import PastJobs from './pages/PastJobs';
import Settings from './pages/Settings';
import LandingPage from './pages/LandingPage';
import WorkerOnboarding from './pages/WorkerOnboarding';
import RequesterOnboarding from './pages/RequesterOnboarding';
import JobDetails from './pages/JobDetails';
import RequesterJobDetails from './pages/RequesterJobDetails';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    // If user has a role but it doesn't match requiredRole, redirect to their default dashboard
    if (user.role === 'worker') {
      return <Navigate to="/worker-dashboard" />;
    } else if (user.role === 'requester') {
      return <Navigate to="/requester-dashboard" />;
    }
    return <Navigate to="/login" />; // Fallback to login if role is unexpected
  }
  
  return children;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        {/* Access user and loading directly within AuthProvider's children */}
        <AuthConsumer />
      </AuthProvider>
    </Router>
  );
};

// New component to handle routing logic, consuming AuthContext
const AuthConsumer = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading application...</div>; // Show a loading indicator while auth context loads
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      
      {/* Authenticated Routes */}
      <Route path="/worker-dashboard" element={
        <ProtectedRoute requiredRole="worker">
          <WorkerDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/requester-dashboard" element={
        <ProtectedRoute requiredRole="requester">
          <RequesterDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/browse-jobs" element={
        <ProtectedRoute>
          <BrowseJobs />
        </ProtectedRoute>
      } />
      
      <Route path="/job-details/:jobId" element={
        <ProtectedRoute>
          <JobDetails />
        </ProtectedRoute>
      } />
      
      <Route path="/requester-job-details/:jobId" element={
        <ProtectedRoute requiredRole="requester">
          <RequesterJobDetails />
        </ProtectedRoute>
      } />
      
      <Route path="/post-job" element={
        <ProtectedRoute requiredRole="requester">
          <PostJob />
        </ProtectedRoute>
      } />
      
      <Route path="/my-jobs" element={
        <ProtectedRoute>
          <MyJobs />
        </ProtectedRoute>
      } />
      
      <Route path="/my-applications" element={
        <ProtectedRoute requiredRole="worker">
          <MyApplications />
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      
      <Route path="/edit-profile" element={<EditProfile />} />
      <Route path="/past-jobs" element={
        <ProtectedRoute>
          <PastJobs />
        </ProtectedRoute>
      } />
      <Route path="/worker-onboarding" element={<WorkerOnboarding />} />
      <Route path="/requester-onboarding" element={<RequesterOnboarding />} />
    </Routes>
  );
};

export default App;