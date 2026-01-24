import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase/config';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/AdminLogin.css'; // Reusing styles

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isValidCode, setIsValidCode] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [email, setEmail] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen(open => !open);
    const closeSidebar = () => setSidebarOpen(false);

    const oobCode = searchParams.get('oobCode');

    useEffect(() => {
        const verifyCode = async () => {
            if (!oobCode) {
                setErrorMsg('Invalid or missing password reset code.');
                setIsVerifying(false);
                return;
            }
            try {
                const emailFromCode = await verifyPasswordResetCode(auth, oobCode);
                setEmail(emailFromCode);
                setIsValidCode(true);
            } catch (err) {
                setErrorMsg('This password reset link is invalid or has expired.');
            } finally {
                setIsVerifying(false);
            }
        };
        verifyCode();
    }, [oobCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (newPassword.length < 6) {
            setErrorMsg('Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setSuccessMsg('Your password has been reset successfully!');
            setIsValidCode(false); // Hide form after success
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
                        <p>Set New Password</p>
                    </div>

                    {isVerifying ? (
                        <p style={{ textAlign: 'center', color: '#666' }}>Verifying link...</p>
                    ) : isValidCode ? (
                        <form onSubmit={handleSubmit} className="login-form">
                            <p style={{ textAlign: 'center', color: '#aaa', marginBottom: '1rem' }}>
                                Resetting password for: <strong>{email}</strong>
                            </p>
                            <div className="form-group">
                                <label htmlFor="newPassword">New Password</label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            {errorMsg && <div className="error-message">{errorMsg}</div>}

                            <button type="submit" disabled={isLoading} className="login-btn">
                                {isLoading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            {errorMsg && <div className="error-message" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}
                            {successMsg && <div className="success-message" style={{ color: 'green', marginBottom: '1rem' }}>{successMsg}</div>}
                            <Link to="/login" style={{ color: '#4f46e5', textDecoration: 'none' }}>Go to Login</Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
