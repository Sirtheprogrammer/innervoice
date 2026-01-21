import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }
  // If route requires admin and user is not admin, redirect to home
  if (window.location.pathname.startsWith('/admin') && userRole !== 'admin') {
    window.location.href = '/';
    return null;
  }

  return children;
}
