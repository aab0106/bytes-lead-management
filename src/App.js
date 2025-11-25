import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import Login from './components/auth/Login';
import AgentDashboard from './components/agents/AgentDashboard';
import LeadForm from './components/leads/LeadForm';
import LeadDetail from './components/leads/LeadDetail';
import AgentProfile from './components/agents/AgentProfile';

// Admin Components
import AdminAnalytics from './components/admin/AdminAnalytics';
import LeadManagement from './components/admin/LeadManagement';
import AdminSettings from './components/admin/AdminSettings';
import AdminLeadDetail from './components/admin/AdminLeadDetail';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <div className='body-content'>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Agent Routes with New Dashboard Layout */}
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <AgentDashboard />
                </PrivateRoute>
              } />
              
              <Route path="/add-lead" element={
                <PrivateRoute>
                  <LeadForm />
                </PrivateRoute>
              } />
              <Route path="/lead/:leadId" element={
                <PrivateRoute>
                  <LeadDetail />
                </PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute>
                  <AgentProfile />
                </PrivateRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin/*" element={
                <AdminRoute>
                  <Routes>
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="leads" element={<LeadManagement />} />
                    <Route path="leads/:leadId" element={<AdminLeadDetail />} />
                    <Route path="settings" element={<AdminSettings />} />
                    {/* Redirect admin root to analytics */}
                    <Route path="" element={<Navigate to="analytics" />} />
                  </Routes>
                </AdminRoute>
              } />

              {/* Default Route */}
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;