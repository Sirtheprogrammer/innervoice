import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminLogin.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, signInWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(email, password);
      const role = result?.role;
      if (role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register. Please try again.');
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
      <Header toggleSidebar={() => {}} />
      <div className="admin-login-container">
        <div className="login-box">
        <div className="login-header">
          <h1>InnerVoice</h1>
          <p>Create an account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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

          <div className="form-group">
            <label htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              disabled={isLoading}
            />
          </div>

          {errorMsg && <div className="error-message">{errorMsg}</div>}

          <button type="submit" disabled={isLoading} className="login-btn">
            {isLoading ? 'Creating account...' : 'Register'}
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
