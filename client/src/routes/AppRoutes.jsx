import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../layouts/ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import Spinner from '../components/Spinner';

const Login = React.lazy(() => import('../pages/Login'));
const Register = React.lazy(() => import('../pages/Register'));
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Naukri = React.lazy(() => import('../pages/Naukri'));
const Indeed = React.lazy(() => import('../pages/Indeed'));
const Analytics = React.lazy(() => import('../pages/Analytics'));
const Clients = React.lazy(() => import('../pages/Clients'));
const Users = React.lazy(() => import('../pages/Users'));
const ReceivedInfo = React.lazy(() => import('../pages/ReceivedInfo'));
const ReceivedInfoAuditTrail = React.lazy(() => import('../pages/ReceivedInfoAuditTrail'));
const Payments = React.lazy(() => import('../pages/Payments'));
const Employees = React.lazy(() => import('../pages/Employees'));
const Chat = React.lazy(() => import('../pages/Chat'));
const SourcingAuditTrails = React.lazy(() => import('../pages/SourcingAuditTrails'));
const ClientsAuditTrail = React.lazy(() => import('../pages/ClientsAuditTrail'));

const AppRoutes = () => (
  <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><Spinner /></div>}>
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
        <Route path="analytics/:id/audit-trails" element={<SourcingAuditTrails />} />
        <Route path="sourcing-audit-trails/:id" element={<SourcingAuditTrails />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id/audit-trail" element={<ClientsAuditTrail />} />
        <Route path="users" element={<Users />} />
        <Route path="received-info" element={<ReceivedInfo />} />
        <Route path="received-info/:id/audit-trail" element={<ReceivedInfoAuditTrail />} />
        <Route path="payments" element={<Payments />} />
        <Route path="employees" element={<Employees />} />
        <Route path="chat" element={<Chat />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
