import React, { useState } from 'react';
import { User } from '../types';
import { saveUser, getUsers, checkLoginRateLimit, recordFailedLoginAttempt, resetLoginAttempts, sanitizeInput } from '../lib/supabase';
import { Mail, Lock, UserPlus, LogIn, Sparkles, CheckSquare, Shield, AlertCircle } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
  isDbConnected: boolean;
  isUsingFallback: boolean;
  onShowSqlModal: () => void;
  onBack?: () => void;
}

export const Auth: React.FC<AuthProps> = ({
  onAuthSuccess,
  isDbConnected,
  isUsingFallback,
  onShowSqlModal,
  onBack
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Authentication implementation with Rate Limiting & Input Sanitization
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(email.trim());
    if (!cleanEmail || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Check Rate Limit (max 3 failed attempts, 15 minutes lockout)
        const rateCheck = await checkLoginRateLimit(cleanEmail);
        if (rateCheck.blocked) {
          setError(`Too many failed login attempts. Account temporarily locked. Please try again after ${rateCheck.remainingMinutes || 15} minutes.`);
          setLoading(false);
          return;
        }

        const users = await getUsers();
        const found = users.find(
          u => u.email.toLowerCase() === cleanEmail.toLowerCase() && u.password === password
        );

        if (found) {
          if (found.banned) {
            setError('Your account has been permanently banned by the administrator.');
            setLoading(false);
            return;
          }
          await resetLoginAttempts(cleanEmail);
          onAuthSuccess(found);
        } else {
          // Check for fallback demo accounts
          if (cleanEmail.toLowerCase() === 'admin@taskzone.com' && password === 'admin123') {
            const adminUser: User = {
              id: 'admin-id',
              email: 'admin@taskzone.com',
              balance: 9999.00,
              role: 'admin',
              password: 'admin123',
              created_at: new Date().toISOString()
            };
            await saveUser(adminUser);
            await resetLoginAttempts(cleanEmail);
            onAuthSuccess(adminUser);
          } else if (cleanEmail.toLowerCase() === 'demo@taskzone.com' && password === 'password123') {
            const advertiserUser: User = {
              id: 'demo-advertiser',
              email: 'demo@taskzone.com',
              balance: 100.00,
              role: 'advertiser',
              password: 'password123',
              created_at: new Date().toISOString()
            };
            await saveUser(advertiserUser);
            await resetLoginAttempts(cleanEmail);
            onAuthSuccess(advertiserUser);
          } else {
            await recordFailedLoginAttempt(cleanEmail);
            setError('Invalid email or password. Note: Exceeding 3 failed attempts will lock login for 15 minutes.');
          }
        }
      } else {
        // Handle Registration
        const users = await getUsers();
        const exists = users.some(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
        if (exists) {
          setError('An account with this email already exists.');
          setLoading(false);
          return;
        }

        const isEmailAdmin = cleanEmail.toLowerCase() === 'admin@taskzone.com' || cleanEmail.toLowerCase().startsWith('admin+');
        const role = isEmailAdmin ? 'admin' : 'advertiser';

        const newUser: User = {
          id: 'user-' + Math.random().toString(36).substr(2, 9),
          email: cleanEmail,
          password: password,
          balance: role === 'admin' ? 9999.00 : 100.00,
          role: role,
          created_at: new Date().toISOString()
        };

        const saved = await saveUser(newUser);
        await resetLoginAttempts(cleanEmail);
        onAuthSuccess(saved);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const loginDemoAccount = async (role: 'admin') => {
    setLoading(true);
    setError('');
    try {
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
      localStorage.setItem('admin_session_unlocked_v1', 'true');
      onAuthSuccess(adminUser);
    } catch (err: any) {
      setError('Failed to log in with admin demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f0fdf4]" id="auth-view">
      <div className="max-w-md w-full space-y-8" id="auth-card-container">
        {onBack && (
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center text-xs font-bold text-neutral-600 hover:text-emerald-600 transition-colors cursor-pointer mb-2"
            >
              ← Back to Home
            </button>
          </div>
        )}

        {/* Title Section */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 mb-4">
            <CheckSquare className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
            Welcome to Task<span className="text-emerald-600">Zone</span>
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
                className="mt-1.5 font-bold text-emerald-600 hover:text-emerald-800 underline block text-left cursor-pointer"
              >
                View SQL Setup Instructions
              </button>
            </div>
          </div>
        )}

        {/* Auth form card */}
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-emerald-100 shadow-md">
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
                  className="block w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-neutral-50/50"
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
                  className="block w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-neutral-50/50"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 cursor-pointer"
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
              className="text-xs text-emerald-600 font-bold hover:underline cursor-pointer"
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </div>

          {/* Quick Demo Account logins */}
          <div className="mt-6 pt-6 border-t border-neutral-100">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider text-center mb-3">
              Fast-Track Administrator Access
            </p>
            <div>
              <button
                type="button"
                onClick={() => loginDemoAccount('admin')}
                disabled={loading}
                className="w-full py-3 px-4 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
              >
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Admin Demo Access</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
