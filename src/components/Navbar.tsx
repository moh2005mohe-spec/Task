import React from 'react';
import { User } from '../types';
import { Coins, LogOut, Shield, User as UserIcon, Briefcase, PlusCircle, CheckSquare } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  activeRole: 'advertiser' | 'worker' | 'admin';
  onChangeRole: (role: 'advertiser' | 'worker' | 'admin') => void;
  onOpenCreateTask?: () => void;
  onOpenProfile?: () => void;
  isDbConnected: boolean;
  isUsingFallback: boolean;
  onShowSqlModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  activeRole,
  onChangeRole,
  onOpenCreateTask,
  onOpenProfile,
  isDbConnected,
  isUsingFallback,
  onShowSqlModal
}) => {
  return (
    <header className="bg-white border-b border-neutral-100 sticky top-0 z-40 shadow-xs" id="app-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onChangeRole(user.role === 'admin' ? 'admin' : 'worker')}>
            <div className="bg-indigo-600 text-white p-2 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-neutral-900">
                Task<span className="text-indigo-600">Zone</span>
              </span>
              <p className="text-[10px] text-neutral-400 font-medium tracking-wide">MICRO-TASK MARKET</p>
            </div>
          </div>

          {/* Database Connection Badge */}
          {isUsingFallback && (
            <div className="hidden md:flex items-center space-x-2">
              <button
                onClick={onShowSqlModal}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <span className="w-1.5 h-1.5 mr-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                Using Local Storage Fallback (Setup SQL)
              </button>
            </div>
          )}

          {/* User Session Info & Navigation Controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Balance Badge (only shown for advertisers or admins who also act as users) */}
            {activeRole !== 'admin' && (
              <div className="flex items-center bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-indigo-900 font-medium text-sm shadow-2xs">
                <Coins className="h-4 w-4 text-indigo-600 mr-1.5" />
                <span className="font-mono text-indigo-700">${user.balance.toFixed(2)}</span>
              </div>
            )}

            {/* Role Toggles */}
            <div className="bg-neutral-100 p-0.5 rounded-xl flex">
              {user.role === 'admin' ? (
                <button
                  onClick={() => onChangeRole('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    activeRole === 'admin'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Admin Panel</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onChangeRole('worker')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      activeRole === 'worker'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Briefcase className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Tasks</span>
                  </button>
                  <button
                    onClick={() => onChangeRole('advertiser')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      activeRole === 'advertiser'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Advertiser</span>
                  </button>
                </>
              )}
            </div>

            {/* User Profile Button & Logout */}
            <div className="flex items-center space-x-2 border-l border-neutral-100 pl-3 sm:pl-4">
              <button
                onClick={onOpenProfile}
                title="View Profile & Stats"
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-neutral-100 transition-all cursor-pointer group text-left"
              >
                <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs group-hover:scale-105 transition-transform">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-neutral-800 truncate max-w-[110px] group-hover:text-indigo-600 transition-colors">
                    {user.email.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium capitalize">
                    {user.role} Profile
                  </span>
                </div>
              </button>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="text-neutral-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-all cursor-pointer"
                id="btn-logout"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
