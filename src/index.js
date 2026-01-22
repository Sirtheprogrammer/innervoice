import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import AdminPanel from './pages/AdminPanel';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminUpdates from './pages/AdminUpdates';
import AdminConfessions from './pages/AdminConfessions';
import ConfessionDetail from './pages/ConfessionDetail';
import Contacts from './pages/Contacts';
import About from './pages/About';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<App />} />
            <Route path="/confession/:confessionId" element={<ConfessionDetail />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/register" element={<Register />} />

            {/* Protected admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/announcements"
              element={
                <ProtectedRoute>
                  <AdminAnnouncements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/updates"
              element={
                <ProtectedRoute>
                  <AdminUpdates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/confessions"
              element={
                <ProtectedRoute>
                  <AdminConfessions />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example, reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
