import { useState, useEffect } from 'react';
import { User, Task } from './types';
import { Navbar } from './components/Navbar';
import { Auth } from './components/Auth';
import { SqlSetupModal } from './components/SqlSetupModal';
import { CreateTask } from './components/CreateTask';
import { AdvertiserDashboard } from './components/AdvertiserDashboard';
import { WorkerDashboard } from './components/WorkerDashboard';
import { AdminPanel } from './components/AdminPanel';
import { UserProfilePage } from './components/UserProfilePage';
import { TaskExecutionPage } from './components/TaskExecutionPage';
import { testDbConnection, isUsingFallback as initFallback, saveUser } from './lib/supabase';

const SESSION_KEY = 'taskzone_session_v1';
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<'advertiser' | 'worker' | 'admin'>('worker');
  const [viewMode, setViewMode] = useState<'dashboard' | 'create_task' | 'task_execution' | 'user_profile'>('dashboard');
  const [executingTask, setExecutingTask] = useState<Task | null>(null);
  
  // Supabase database status
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(initFallback);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Check session & database status on load
  useEffect(() => {
    const init = async () => {
      // 1. Restore persistent session if valid (< 3 hours old)
      try {
        const savedSessionStr = localStorage.getItem(SESSION_KEY);
        if (savedSessionStr) {
          const session = JSON.parse(savedSessionStr);
          if (session && session.user && session.expiresAt && Date.now() < session.expiresAt) {
            setUser(session.user);
            setActiveRole(session.user.role === 'admin' ? 'admin' : 'advertiser');
          } else {
            // Expired session (> 3 hours)
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (e) {
        console.error("Failed to restore session from storage", e);
      }

      // 2. Check DB connection
      const res = await testDbConnection();
      setIsDbConnected(res.connected);
      setIsUsingFallback(!res.hasTables || !res.connected);
    };
    init();
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setViewMode('dashboard');
    
    // Save session in localStorage with 3-hour expiration timestamp
    const expiresAt = Date.now() + THREE_HOURS_MS;
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: authenticatedUser,
      expiresAt: expiresAt
    }));

    // Automatically select the appropriate role dashboard
    if (authenticatedUser.role === 'admin') {
      setActiveRole('admin');
    } else {
      setActiveRole('worker');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setViewMode('dashboard');
    setExecutingTask(null);
    setActiveRole('worker');
    localStorage.removeItem(SESSION_KEY);
  };

  const handleBalanceUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    saveUser(updatedUser);

    // Update active session in storage
    try {
      const savedSessionStr = localStorage.getItem(SESSION_KEY);
      if (savedSessionStr) {
        const session = JSON.parse(savedSessionStr);
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          ...session,
          user: updatedUser
        }));
      } else {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          user: updatedUser,
          expiresAt: Date.now() + THREE_HOURS_MS
        }));
      }
    } catch (e) {
      console.error("Failed to sync session user", e);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900" id="app-root">
      {user ? (
        <>
          {/* Main App Layout */}
          <Navbar
            user={user}
            onLogout={handleLogout}
            activeRole={activeRole}
            onChangeRole={(role) => {
              setActiveRole(role);
              setViewMode('dashboard');
            }}
            onOpenCreateTask={() => {
              setViewMode('create_task');
            }}
            onOpenProfile={() => setViewMode('user_profile')}
            isDbConnected={isDbConnected}
            isUsingFallback={isUsingFallback}
            onShowSqlModal={() => setShowSqlModal(true)}
          />

          <main className="flex-grow">
            {viewMode === 'user_profile' ? (
              <UserProfilePage
                user={user}
                onBack={() => setViewMode('dashboard')}
                onBalanceUpdate={handleBalanceUpdate}
              />
            ) : viewMode === 'task_execution' && executingTask ? (
              <TaskExecutionPage
                task={executingTask}
                user={user}
                onBack={() => {
                  setViewMode('dashboard');
                  setExecutingTask(null);
                }}
                onSuccess={() => {
                  setViewMode('dashboard');
                  setExecutingTask(null);
                }}
              />
            ) : viewMode === 'create_task' ? (
              <CreateTask
                user={user}
                onSuccess={(updatedUser) => {
                  handleBalanceUpdate(updatedUser);
                  setViewMode('dashboard');
                }}
                onCancel={() => setViewMode('dashboard')}
              />
            ) : activeRole === 'admin' ? (
              <AdminPanel
                onShowSqlModal={() => setShowSqlModal(true)}
                isUsingFallback={isUsingFallback}
              />
            ) : activeRole === 'advertiser' ? (
              <AdvertiserDashboard
                user={user}
                onOpenCreateTask={() => setViewMode('create_task')}
                onBalanceUpdate={handleBalanceUpdate}
              />
            ) : (
              <WorkerDashboard
                user={user}
                onBalanceUpdate={handleBalanceUpdate}
                onSelectTask={(task) => {
                  setExecutingTask(task);
                  setViewMode('task_execution');
                }}
              />
            )}
          </main>
        </>
      ) : (
        /* Sign-In View */
        <Auth
          onAuthSuccess={handleAuthSuccess}
          isDbConnected={isDbConnected}
          isUsingFallback={isUsingFallback}
          onShowSqlModal={() => setShowSqlModal(true)}
        />
      )}

      {/* SQL Setup Drawer */}
      <SqlSetupModal
        isOpen={showSqlModal}
        onClose={() => setShowSqlModal(false)}
      />

      {/* Footer copyright */}
      <footer className="bg-white border-t border-neutral-100 py-6 mt-12 text-center text-xs text-neutral-400 font-medium">
        <p>&copy; {new Date().getFullYear()} TaskZone Inc. All micro-payments and campaigns are simulated/tracked. All rights reserved.</p>
      </footer>
    </div>
  );
}
