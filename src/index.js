import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import UpdateDetail from './pages/UpdateDetail';
import ProtectedRoute from './components/ProtectedRoute';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<App />} />
          <Route path="/update/:id" element={<UpdateDetail />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example, reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
