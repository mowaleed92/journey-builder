import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { AdminPage } from './components/admin';
import { Loader2 } from 'lucide-react';

function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setShowAdmin(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!userId) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (showAdmin) {
    return <AdminPage onExit={() => setShowAdmin(false)} />;
  }

  return (
    <Dashboard
      userId={userId}
      onLogout={handleLogout}
      onOpenAdmin={() => setShowAdmin(true)}
    />
  );
}

export default App;
