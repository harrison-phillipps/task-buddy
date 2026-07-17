import './App.css'
import { Suspense } from 'react'
import { Toaster } from "react-hot-toast"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
// VisualEditAgent removed - caused duplicate React chunk conflict
// NavigationTracker removed - caused duplicate React chunk conflict
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { lazy } from 'react';
const Home = lazy(() => import('./pages/Home'));
const GuestSession = lazy(() => import('./pages/GuestSession'));
const GuestWelcome = lazy(() => import('./pages/GuestWelcome'));
const ClinicianDashboard = lazy(() => import('./pages/ClinicianDashboard'));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Routes that don't require authentication
const PUBLIC_PATHS = ['/', '/Home', '/GuestSession', '/GuestWelcome'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const location = useLocation();

  const isPublicPath = PUBLIC_PATHS.includes(location.pathname);
  // Root guest entry points — must wait for auth to resolve so authenticated
  // users never see the guest task input screen, even briefly.
  const isGuestRoot = location.pathname === '/' || location.pathname === '/Home';

  // Show loading spinner while checking app public settings or auth.
  // Gate protected paths (as before) AND the guest root (to prevent the flash).
  // Other guest-flow pages (/GuestSession, /GuestWelcome) are only reached once
  // the user is already known to be unauthenticated, so no gating needed there.
  if ((isLoadingPublicSettings || isLoadingAuth) && (!isPublicPath || isGuestRoot)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-teal-50">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ff06728f59128717455ed3/947e987fc_Screenshot2025-12-08at84335AM.png"
          alt="TaskBuddy"
          className="w-12 h-12 rounded-2xl shadow-md object-cover mb-4"
        />
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError && !isPublicPath) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Authenticated user hitting the guest root — send straight to the app.
  // Prevents the guest task input screen from ever rendering for logged-in users.
  if (isAuthenticated && isGuestRoot) {
    return <Navigate to="/Dashboard" replace />;
  }

  // Render the main app
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -30, opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    }>
    <Routes location={location}>
      {/* Public landing page — no auth, no layout */}
      <Route path="/" element={<Home />} />
      <Route path="/Home" element={<Home />} />
      <Route path="/GuestSession" element={<GuestSession />} />
      <Route path="/GuestWelcome" element={<GuestWelcome />} />
      <Route path="/ClinicianDashboard" element={<LayoutWrapper currentPageName="ClinicianDashboard"><ClinicianDashboard /></LayoutWrapper>} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
      </motion.div>
    </AnimatePresence>
  );
};


function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster position="bottom-right" toastOptions={{ duration: 4000, style: { background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '0.875rem' } }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App