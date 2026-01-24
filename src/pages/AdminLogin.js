import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminLogin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { login, signInWithGoogle } = useAuth();

  const toggleSidebar = () => setSidebarOpen(open => !open);
  const closeSidebar = () => setSidebarOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      const role = result?.role;
      if (role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      const role = result?.role;
      if (role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      setErrorMsg(err.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} />
      <div
        className={`mobile-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />
      <div className="admin-login-container">
        <div className="login-box">
          <div className="login-header">
            <h1>InnerVoice</h1>
            <p>Sign In</p>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <Link to="/register" style={{ color: '#4f46e5', fontSize: '0.9rem', textDecoration: 'none' }}>Create Account</Link>
              <Link to="/forgot-password" style={{ color: '#4f46e5', fontSize: '0.9rem', textDecoration: 'none' }}>Forgot Password?</Link>
            </div>

            {errorMsg && <div className="error-message">{errorMsg}</div>}

            <button type="submit" disabled={isLoading} className="login-btn">
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={isLoading}
              className="login-btn google-btn"
            >
              <FcGoogle size={20} style={{ marginRight: 8 }} />
              {isLoading ? 'Please wait...' : 'Sign in with Google'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
