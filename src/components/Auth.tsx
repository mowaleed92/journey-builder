import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from '../contexts';

interface AuthProps {
  onAuthSuccess: (userId: string) => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          onAuthSuccess(data.user.id);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
          onAuthSuccess(data.user.id);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://res.cloudinary.com/dujh5xuoi/image/upload/v1754423073/%D8%AA%D8%B9%D9%84%D9%91%D9%85_AIFinal_edvr4e.png"
            alt="Platform logo"
            className="max-h-16 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white mb-2">{t('auth.platformTitle')}</h1>
          <p className="text-slate-400">{t('auth.platformSubtitle')}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-xl">
          <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-white text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('auth.signIn')}
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-white text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('auth.signUp')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  minLength={6}
                  className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium rounded-xl hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? t('auth.signIn') : t('auth.createAccount')}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          {t('auth.termsText')}
        </p>
      </div>
    </div>
  );
}
