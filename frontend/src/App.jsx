import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authAPI } from './services/api';

// Layout Components
import MainLayout from './components/Layout/MainLayout';
import Login from './components/Auth/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Page Components
import Dashboard from './components/Dashboard/Dashboard';
import SparePartsManagement from './components/SpareParts/SparePartsManagement';
import StockInManagement from './components/StockIn/StockInManagement';
import StockOutManagement from './components/StockOut/StockOutManagement';
import ReportsManagement from './components/Reports/ReportsManagement';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await authAPI.checkSession();
      if (response.data.authenticated) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Login Route */}
          <Route
            path="/login"
            element={
              user ? <Navigate to="/" replace /> : <Login setUser={setUser} />
            }
          />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute user={user} loading={loading}>
                <MainLayout user={user} setUser={setUser}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/spare-parts" element={<SparePartsManagement />} />
                    <Route path="/stock-in" element={<StockInManagement />} />
                    <Route path="/stock-out" element={<StockOutManagement />} />
                    <Route path="/reports" element={<ReportsManagement />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
