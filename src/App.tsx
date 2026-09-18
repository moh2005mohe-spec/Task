import { useState, useEffect } from 'react';
import { User } from './types';
import { Navbar } from './components/Navbar';
import { Auth } from './components/Auth';
import { SqlSetupModal } from './components/SqlSetupModal';
import { CreateTask } from './components/CreateTask';
import { AdvertiserDashboard } from './components/AdvertiserDashboard';
import { WorkerDashboard } from './components/WorkerDashboard';
import { AdminPanel } from './components/AdminPanel';
import { testDbConnection, isUsingFallback as initFallback, getUsers, saveUser } from './lib/supabase';
import { HelpCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<'advertiser' | 'worker' | 'admin'>('advertiser');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  
  // Supabase database status
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(initFallback);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Check database status on load
  useEffect(() => {
    const checkDb = async () => {
      const res = await testDbConnection();
      setIsDbConnected(res.connected);
      setIsUsingFallback(!res.hasTables || !res.connected);
    };
    checkDb();
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    
    // Automatically select the appropriate role dashboard
    if (authenticatedUser.role === 'admin') {
      setActiveRole('admin');
    } else {
      setActiveRole('advertiser');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsCreatingTask(false);
    setActiveRole('advertiser');
  };

  const handleBalanceUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    // Persist to database/local state
    saveUser(updatedUser);
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
              setIsCreatingTask(false);
            }}
            onOpenCreateTask={() => {
              setIsCreatingTask(true);
            }}
            isDbConnected={isDbConnected}
            isUsingFallback={isUsingFallback}
            onShowSqlModal={() => setShowSqlModal(true)}
          />

          <main className="flex-grow">
            {isCreatingTask ? (
              <CreateTask
                user={user}
                onSuccess={(updatedUser) => {
                  handleBalanceUpdate(updatedUser);
                  setIsCreatingTask(false);
                }}
                onCancel={() => setIsCreatingTask(false)}
              />
            ) : activeRole === 'admin' ? (
              <AdminPanel
                onShowSqlModal={() => setShowSqlModal(true)}
                isUsingFallback={isUsingFallback}
              />
            ) : activeRole === 'advertiser' ? (
              <AdvertiserDashboard
                user={user}
                onOpenCreateTask={() => setIsCreatingTask(true)}
                onBalanceUpdate={handleBalanceUpdate}
              />
            ) : (
              <WorkerDashboard
                user={user}
                onBalanceUpdate={handleBalanceUpdate}
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
