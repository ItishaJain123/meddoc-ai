import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import DocumentsPage from './pages/DocumentsPage';
import SmartChatPage from './pages/SmartChatPage';
import HealthTrendsPage from './pages/HealthTrendsPage';
import SummaryPage from './pages/SummaryPage';
import MedicationsPage from './pages/MedicationsPage';
import HealthGoalsPage from './pages/HealthGoalsPage';
import AboutPage from './pages/AboutPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="trends" element={<HealthTrendsPage />} />
        <Route path="summary" element={<SummaryPage />} />
        <Route path="chat" element={<SmartChatPage />} />
        <Route path="medications" element={<MedicationsPage />} />
        <Route path="goals" element={<HealthGoalsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
