import { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Loader2 } from 'lucide-react';
import { ToastProvider, ToastContainer } from './hooks';
import { RTLProvider, useTranslation } from './contexts';
import type { GraphDefinition } from './types/database';

// Lazy load heavy components for better initial load time
const AdminPage = lazy(() => import('./components/admin').then(m => ({ default: m.AdminPage })));
const JourneyRunner = lazy(() => import('./engine/JourneyRunner').then(m => ({ default: m.JourneyRunner })));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

// Auth context for sharing user state across the app
interface AuthContextType {
  userId: string | null;
  settingsKey: number;
  refreshSettings: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  
  if (!userId) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Journey page that loads journey data from URL params
function JourneyPage() {
  const { userId } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [journeyData, setJourneyData] = useState<{
    versionId: string;
    graph: GraphDefinition;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadJourneyFromUrl = async () => {
      const params = new URLSearchParams(location.search);
      const versionId = params.get('v');
      
      if (!versionId) {
        setError(t('journey.error.noVersion'));
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('journey_versions')
          .select('id, graph_json')
          .eq('id', versionId)
          .single();

        if (fetchError || !data) {
          setError(t('journey.error.notFound'));
          setIsLoading(false);
          return;
        }

        setJourneyData({
          versionId: data.id,
          graph: data.graph_json as GraphDefinition,
        });
      } catch (err) {
        setError(t('journey.error.failed'));
      } finally {
        setIsLoading(false);
      }
    };

    // Reset states when URL changes to trigger fresh load
    setIsLoading(true);
    setJourneyData(null);
    setError(null);
    loadJourneyFromUrl();
  }, [location.search, t]);

  const handleModuleComplete = (nextModuleInfo?: { versionId: string; moduleTitle: string }) => {
    if (nextModuleInfo) {
      // Navigate to next module - JourneyRunner will fetch track/module context from DB
      navigate(`/journey?v=${nextModuleInfo.versionId}`, { replace: true });
    } else {
      // No next module, return to dashboard
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !journeyData || !userId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-error mb-4">{error || t('journey.error.failed')}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {t('journey.error.backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <JourneyRunner
        journeyVersionId={journeyData.versionId}
        userId={userId}
        graph={journeyData.graph}
        onComplete={handleModuleComplete}
        onExit={() => navigate('/')}
      />
    </Suspense>
  );
}

function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsKey, setSettingsKey] = useState(0);

  const refreshSettings = () => {
    setSettingsKey(prev => prev + 1);
  };

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
    }
    setIsLoading(false);
  };

  const handleAuthSuccess = (id: string) => {
    setUserId(id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUserId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <AuthContext.Provider value={{ userId, settingsKey, refreshSettings, logout }}>
        <Routes>
          {/* Public routes - Arabic */}
          <Route
            path="/login"
            element={
              userId ? (
                <Navigate to="/" replace />
              ) : (
                <RTLProvider locale="ar">
                  <Auth onAuthSuccess={handleAuthSuccess} />
                </RTLProvider>
              )
            }
          />

          {/* Protected routes - Arabic for user */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RTLProvider locale="ar">
                  <DashboardWrapper />
                </RTLProvider>
              </ProtectedRoute>
            }
          />

          <Route
            path="/journey"
            element={
              <ProtectedRoute>
                <RTLProvider locale="ar">
                  <JourneyPage />
                </RTLProvider>
              </ProtectedRoute>
            }
          />

          {/* Admin routes - English */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <RTLProvider locale="en">
                  <AdminWrapper />
                </RTLProvider>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </AuthContext.Provider>
    </ToastProvider>
  );
}

// Wrapper components to use hooks
function DashboardWrapper() {
  const { userId, settingsKey, logout } = useAuth();
  const navigate = useNavigate();

  if (!userId) return null;

  return (
    <Dashboard
      userId={userId}
      onLogout={logout}
      onOpenAdmin={() => navigate('/admin')}
      settingsKey={settingsKey}
    />
  );
}

function AdminWrapper() {
  const { refreshSettings } = useAuth();
  const navigate = useNavigate();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminPage
        onExit={() => navigate('/')}
        onSettingsChanged={refreshSettings}
      />
    </Suspense>
  );
}

export default App;
