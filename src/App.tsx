import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from './store/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CalendarView from './pages/CalendarView';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminRequests from './pages/AdminRequests';

const ProtectedRoute = ({ children, requireRole }: { children: React.ReactNode, requireRole?: 'ADMIN' | 'EMPLOYEE' }) => {
  const { currentUser } = useAppContext();
  
  if (!currentUser) return <Navigate to="/login" replace />;
  if (requireRole && currentUser.role !== requireRole) {
    // If not matching role, redirect to their home
    return <Navigate to={currentUser.role === 'ADMIN' ? '/admin/dashboard' : '/my/dashboard'} replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute requireRole="ADMIN">
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="requests" element={<AdminRequests />} />
        </Route>

        {/* Employee Routes */}
        <Route path="/my" element={
          <ProtectedRoute requireRole="EMPLOYEE">
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/my/dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="calendar" element={<CalendarView />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
