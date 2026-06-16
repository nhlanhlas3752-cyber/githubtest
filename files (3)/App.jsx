import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LessonPlans from './pages/LessonPlans';
import LessonPlanForm from './pages/LessonPlanForm';
import LessonPlanView from './pages/LessonPlanView';
import Teachers from './pages/Teachers';
import Settings from './pages/Settings';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin"/>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="dashboard"          element={<Dashboard />} />
        <Route path="lesson-plans"       element={<LessonPlans />} />
        <Route path="lesson-plans/new"   element={<LessonPlanForm />} />
        <Route path="lesson-plans/:id"   element={<LessonPlanView />} />
        <Route path="lesson-plans/:id/edit" element={<LessonPlanForm />} />
        <Route path="teachers"           element={<AdminRoute><Teachers /></AdminRoute>} />
        <Route path="settings"           element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="bottom-right" toastOptions={{
          style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '10px' },
          success: { iconTheme: { primary: '#2D5A27', secondary: '#fff' } },
        }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
