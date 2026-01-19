import { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Loader2 } from 'lucide-react';
import { ToastProvider, ToastContainer } from './hooks';
import type { GraphDefinition } from './types/database';

// Lazy load heavy components for better initial load time
const AdminPage = lazy(() => import('./components/admin').then(m => ({ default: m.AdminPage })));
const JourneyRunner = lazy(() => import('./engine/JourneyRunner').then(m => ({ default: m.JourneyRunner })));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
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
  const navigate = useNavigate();
  const [journeyData, setJourneyData] = useState<{
    versionId: string;
    graph: GraphDefinition;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadJourneyFromUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const versionId = params.get('v');
      
      if (!versionId) {
        setError('No journey version specified');
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
          setError('Journey not found');
          setIsLoading(false);
          return;
        }

        setJourneyData({
          versionId: data.id,
          graph: data.graph_json as GraphDefinition,
        });
      } catch (err) {
        setError('Failed to load journey');
      } finally {
        setIsLoading(false);
      }
    };

    loadJourneyFromUrl();
  }, []);

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
          <p className="text-red-400 mb-4">{error || 'Unable to load journey'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
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
        onComplete={() => navigate('/')}
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
          {/* Public routes */}
          <Route
            path="/login"
            element={
              userId ? (
                <Navigate to="/" replace />
              ) : (
                <Auth onAuthSuccess={handleAuthSuccess} />
              )
            }
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/journey"
            element={
              <ProtectedRoute>
                <JourneyPage />
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
