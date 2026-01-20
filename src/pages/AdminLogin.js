import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminLogin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Redirect to admin panel on success
      window.location.href = '/admin';
    } catch (err) {
      setErrorMsg(err.message || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>CHIEF G MEDIA</h1>
          <p>Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={isLoading}
            />
          </div>

          {errorMsg && <div className="error-message">{errorMsg}</div>}

          <button type="submit" disabled={isLoading} className="login-btn">
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
