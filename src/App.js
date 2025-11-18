import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container, Alert } from 'react-bootstrap'; // Add missing imports
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import Navigation from './components/common/Navigation';
import Footer from './components/common/footer';
import Login from './components/auth/Login';
import LeadList from './components/leads/LeadList';
import LeadForm from './components/leads/LeadForm';
import LeadDetail from './components/leads/LeadDetail';
import AgentProfile from './components/agents/AgentProfile';
import AdminDashboard from './components/admin/AdminDashboard';
import LeadManagement from './components/admin/LeadManagement';
import AgentManagement from './components/admin/AgentManagement';
import AdminLeadDetail from './components/admin/AdminLeadDetail';
import CreateAgent from './components/admin/CreateAgent';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';
// ... existing imports ...
import DashboardLayout from './components/layout/DashboardLayout';
import AgentDashboard from './components/agents/AgentDashboard';


function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          {/* Remove old Navigation since we have sidebar now */}
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
              <Route path="/leads" element={
                <PrivateRoute>
                  <AgentDashboard />
                </PrivateRoute>
              } />
              
              {/* ... rest of the routes remain the same ... */}
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

              {/* Admin Routes (keep old navigation) */}
              <Route path="/admin/*" element={
                <AdminRoute>
                  <div>
                    <Navigation />
                    <Routes>
                      <Route path="" element={<AdminDashboard />} />
                      <Route path="leads" element={<LeadManagement />} />
                      <Route path="agents" element={<AgentManagement />} />
                      <Route path="create-agent" element={<CreateAgent />} />
                    </Routes>
                  </div>
                </AdminRoute>
              } />

              {/* Default Route */}
              <Route path="/" element={<Navigate to="/dashboard" />} />

              <Route path="/admin/leads/:leadId" element={<LeadDetail />} />
              <Route path="/admin/leads/:leadId" element={<AdminLeadDetail />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;