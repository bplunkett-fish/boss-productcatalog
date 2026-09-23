import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from 'next-themes';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Navigate } from 'react-router-dom';
// Home is lazy-loaded below.
import TabBar, { DesktopNav } from '@/components/TabBar';

// Lazy-loaded routes (code-splitting for performance).
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const ProductDatabase = lazy(() => import('@/pages/ProductDatabase'));
const ClaimedSerials = lazy(() => import('@/pages/ClaimedSerials'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Inbox = lazy(() => import('@/pages/Inbox'));
const Settings = lazy(() => import('@/components/Settings'));
const Claim = lazy(() => import('@/pages/Claim'));

function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
    </div>
  );
}

const pageVariants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

function Page({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Layout for authenticated routes: page + mobile bottom tab bar.
function AppLayout() {
  return (
    <>
      <DesktopNav />
      <Outlet />
      <TabBar />
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Suspense fallback={<Spinner />}><Login /></Suspense>} />
        <Route path="/register" element={<Suspense fallback={<Spinner />}><Register /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<Spinner />}><ForgotPassword /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<Spinner />}><ResetPassword /></Suspense>} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Suspense fallback={<Spinner />}><Page><Home /></Page></Suspense>} />
            <Route path="/claim" element={<Suspense fallback={<Spinner />}><Page><Claim /></Page></Suspense>} />
            <Route path="/product/:id" element={<Suspense fallback={<Spinner />}><Page><ProductDetail /></Page></Suspense>} />
            <Route path="/product-database" element={<Suspense fallback={<Spinner />}><Page><ProductDatabase /></Page></Suspense>} />
            <Route path="/claimed-serials" element={<Suspense fallback={<Spinner />}><Page><ClaimedSerials /></Page></Suspense>} />
            <Route path="/notifications" element={<Suspense fallback={<Spinner />}><Page><Notifications /></Page></Suspense>} />
            <Route path="/inbox" element={<Suspense fallback={<Spinner />}><Page><Inbox /></Page></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<Spinner />}><Page><Settings /></Page></Suspense>} />
          </Route>
        </Route>
        <Route path="*" element={<Page><PageNotFound /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return <AnimatedRoutes />;
};


function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App