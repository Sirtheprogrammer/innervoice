import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminLogin.css'; // Reusing styles

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { resetPassword } = useAuth();

    const toggleSidebar = () => setSidebarOpen(open => !open);
    const closeSidebar = () => setSidebarOpen(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        setIsLoading(true);

        try {
            await resetPassword(email);
            setSuccessMsg('Check your inbox for further instructions.');
        } catch (err) {
            setErrorMsg(err.message || 'Failed to reset password.');
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
                        <p>Password Reset</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {errorMsg && <div className="error-message">{errorMsg}</div>}
                        {successMsg && <div className="success-message" style={{ color: 'green', marginBottom: '1rem', textAlign: 'center' }}>{successMsg}</div>}

                        <button type="submit" disabled={isLoading} className="login-btn">
                            {isLoading ? 'Sending...' : 'Reset Password'}
                        </button>

                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <Link to="/login" style={{ color: '#4f46e5', textDecoration: 'none' }}>Back to Login</Link>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
