import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../layouts/ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Naukri from '../pages/Naukri';
import Indeed from '../pages/Indeed';
import Analytics from '../pages/Analytics';
import Users from '../pages/Users';

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Dashboard />} />
      <Route path="naukri" element={<Naukri />} />
      <Route path="indeed" element={<Indeed />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="users" element={<Users />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route>

    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default AppRoutes;
