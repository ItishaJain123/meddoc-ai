import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import Layout from './components/Layout/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import DocumentsPage from './pages/DocumentsPage';
import SmartChatPage from './pages/SmartChatPage';
import HealthTrendsPage from './pages/HealthTrendsPage';
import SummaryPage from './pages/SummaryPage';
import MedicationsPage from './pages/MedicationsPage';
import HealthGoalsPage from './pages/HealthGoalsPage';
import ReportComparisonPage from './pages/ReportComparisonPage';
import TimelinePage from './pages/TimelinePage';
import SharedSummaryPage from './pages/SharedSummaryPage';
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

// Landing for visitors, straight to the app for signed-in users
function Home() {
  return (
    <>
      <SignedOut><LandingPage /></SignedOut>
      <SignedIn><Navigate to="/dashboard" replace /></SignedIn>
    </>
  );
}

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route path="/share/:token" element={<SharedSummaryPage />} />

      {/* App (auth required) */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="trends" element={<HealthTrendsPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="summary" element={<SummaryPage />} />
        <Route path="chat" element={<SmartChatPage />} />
        <Route path="medications" element={<MedicationsPage />} />
        <Route path="goals" element={<HealthGoalsPage />} />
        <Route path="compare" element={<ReportComparisonPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
