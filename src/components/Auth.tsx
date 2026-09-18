import React, { useState } from 'react';
import { User } from '../types';
import { saveUser, getUsers } from '../lib/supabase';
import { Mail, Lock, UserPlus, LogIn, Sparkles, CheckSquare, Shield, AlertCircle } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
  isDbConnected: boolean;
  isUsingFallback: boolean;
  onShowSqlModal: () => void;
}

export const Auth: React.FC<AuthProps> = ({
  onAuthSuccess,
  isDbConnected,
  isUsingFallback,
  onShowSqlModal
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Simple authentication implementation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const users = await getUsers();

      if (isLogin) {
        // Handle Login
        const found = users.find(
          u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        if (found) {
          onAuthSuccess(found);
        } else {
          // Check for a fallback condition or generic demo
          if (email.toLowerCase() === 'admin@taskzone.com' && password === 'admin123') {
            const adminUser: User = {
              id: 'admin-id',
              email: 'admin@taskzone.com',
              balance: 9999.00,
              role: 'admin',
              password: 'admin123',
              created_at: new Date().toISOString()
            };
            await saveUser(adminUser);
            onAuthSuccess(adminUser);
          } else if (email.toLowerCase() === 'demo@taskzone.com' && password === 'password123') {
            const advertiserUser: User = {
              id: 'demo-advertiser',
              email: 'demo@taskzone.com',
              balance: 100.00,
              role: 'advertiser',
              password: 'password123',
              created_at: new Date().toISOString()
            };
            await saveUser(advertiserUser);
            onAuthSuccess(advertiserUser);
          } else {
            setError('Invalid email or password.');
          }
        }
      } else {
        // Handle Registration
        const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          setError('An account with this email already exists.');
          setLoading(false);
          return;
        }

        // Determine if admin or advertiser based on email domain or selection (default advertiser)
        const isEmailAdmin = email.toLowerCase() === 'admin@taskzone.com' || email.toLowerCase().startsWith('admin+');
        const role = isEmailAdmin ? 'admin' : 'advertiser';

        const newUser: User = {
          id: 'user-' + Math.random().toString(36).substr(2, 9),
          email: email.trim(),
          password: password, // For simplicity and the requested English/DB setup
          balance: role === 'admin' ? 9999.00 : 100.00, // Pre-seeded starting balance
          role: role,
          created_at: new Date().toISOString()
        };

        const saved = await saveUser(newUser);
        onAuthSuccess(saved);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const loginDemoAccount = async (role: 'advertiser' | 'admin') => {
    setLoading(true);
    setError('');
    try {
      if (role === 'admin') {
        setEmail('admin@taskzone.com');
        setPassword('admin123');
        const adminUser: User = {
          id: 'admin-id',
          email: 'admin@taskzone.com',
          balance: 9999.00,
          role: 'admin',
          password: 'admin123',
          created_at: new Date().toISOString()
        };
        await saveUser(adminUser);
        onAuthSuccess(adminUser);
      } else {
        setEmail('demo@taskzone.com');
        setPassword('password123');
        const advertiserUser: User = {
          id: 'demo-advertiser',
          email: 'demo@taskzone.com',
          balance: 100.00,
          role: 'advertiser',
          password: 'password123',
          created_at: new Date().toISOString()
        };
        await saveUser(advertiserUser);
        onAuthSuccess(advertiserUser);
      }
    } catch (err: any) {
      setError('Failed to log in with demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-neutral-50" id="auth-view">
      <div className="max-w-md w-full space-y-8" id="auth-card-container">
        {/* Title Section */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 mb-4">
            <CheckSquare className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
            Welcome to Task<span className="text-indigo-600">Zone</span>
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            {isLogin ? 'Sign in to access your dashboard' : 'Create an advertiser account to launch campaigns'}
          </p>
        </div>

        {/* Database notice in auth */}
        {isUsingFallback && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-start space-x-2.5 shadow-2xs">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Local Storage Mode Active</p>
              <p className="mt-0.5 text-amber-700">
                Database tables aren't set up yet. We are automatically using secure local state so you can test all features now!
              </p>
              <button
                onClick={onShowSqlModal}
                className="mt-1.5 font-bold text-indigo-600 hover:text-indigo-800 underline block text-left"
              >
                View SQL Setup Instructions
              </button>
            </div>
          </div>
        )}

        {/* Auth form card */}
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-neutral-100 shadow-md">
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl p-3.5 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-neutral-50/50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-neutral-50/50"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 cursor-pointer"
                id="btn-auth-submit"
              >
                {loading ? (
                  <span className="border-2 border-white border-t-transparent rounded-full h-4 w-4 animate-spin"></span>
                ) : isLogin ? (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Switch link */}
          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </div>

          {/* Quick Demo Accout logins */}
          <div className="mt-6 pt-6 border-t border-neutral-100">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider text-center mb-3">
              Fast-Track Testing Accounts
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => loginDemoAccount('advertiser')}
                disabled={loading}
                className="py-2.5 px-3 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>Advertiser Demo</span>
              </button>
              <button
                type="button"
                onClick={() => loginDemoAccount('admin')}
                disabled={loading}
                className="py-2.5 px-3 border border-purple-100 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50/50 hover:bg-purple-50 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5 text-purple-500" />
                <span>Admin Demo</span>
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 text-center mt-2.5 italic">
              * Advertiser starts with $100.00 mock balance to launch test campaigns immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
