import React from 'react';

const ForgotPasswordScreen = ({ onNavigate }) => {
  return (
    <div>
      <h1>Forgot Password</h1>
      <p>This is the placeholder page for password reset.</p>
      <button onClick={() => onNavigate('login')}>Back to Login</button>
    </div>
  );
};

export default ForgotPasswordScreen;
