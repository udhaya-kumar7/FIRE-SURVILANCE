import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import notificationService from './services/notificationService';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Datasets from './pages/Datasets';
import Training from './pages/Training';
import Detection from './pages/Detection';
import MultiCamera from './pages/MultiCamera';
import Recordings from './pages/Recordings';
import Playback from './pages/Playback';
import Zones from './pages/Zones';
import MapView from './pages/MapView';
import Logs from './pages/Logs';
import Settings from './pages/Settings';

// Initialize notification service
const initNotifications = async () => {
  await notificationService.init();
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        height: '100vh', bgcolor: '#0a0a1a', background: 'radial-gradient(circle at center, #16162a 0%, #05050f 100%)',
      }}>
        <Box sx={{ position: 'relative', width: 80, height: 80, mb: 3 }}>
          <CircularProgress size={80} thickness={2} sx={{ color: '#ff4500', position: 'absolute', opacity: 0.2 }} variant="determinate" value={100} />
          <CircularProgress size={80} thickness={4} sx={{
            color: '#ff4500', position: 'absolute', animationDuration: '1.5s',
            filter: 'drop-shadow(0 0 12px rgba(255,69,0,0.5))',
          }} />
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '24px', animation: 'pulse 1.5s ease-in-out infinite' }}>🔥</span>
          </Box>
        </Box>
        <Typography sx={{ color: '#a0a0c8', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.85rem' }}>
          Initializing FireWatch AI
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  // Initialize notification service on app load
  useEffect(() => {
    initNotifications();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="datasets" element={<Datasets />} />
        <Route path="training" element={<Training />} />
        <Route path="detection" element={<Detection />} />
        <Route path="multicamera" element={<MultiCamera />} />
        <Route path="recordings" element={<Recordings />} />
        <Route path="recordings/:id" element={<Playback />} />
        <Route path="zones" element={<Zones />} />
        <Route path="map" element={<MapView />} />
        <Route path="logs" element={<Logs />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
