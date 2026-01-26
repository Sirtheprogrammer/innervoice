import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminLogin.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { register, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) {
      console.log("Captured referral code from URL:", ref);
      setReferralCode(ref);
    }
  }, [location]);

  const toggleSidebar = () => setSidebarOpen(open => !open);
  const closeSidebar = () => setSidebarOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(email, password, referralCode);
      const role = result?.role;

      console.log("Registration successful. Waiting 5 seconds before redirecting to preserve logs...");

      setTimeout(() => {
        if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }, 5000);

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
      const result = await signInWithGoogle(referralCode);
      const role = result?.role;

      console.log("Google Sign-in successful. Waiting 5 seconds before redirecting to preserve logs...");

      setTimeout(() => {
        if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }, 5000);

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
              <label htmlFor="referralCode">Referral Code (Optional)</label>
              <input
                id="referralCode"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Enter referral code"
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
