import React, { useState, useEffect } from 'react';
import { User, AppNotification } from '../types';
import { getNotifications, markNotificationsAsRead } from '../lib/supabase';
import { Coins, LogOut, Shield, User as UserIcon, Briefcase, PlusCircle, CheckSquare, Bell, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, Check } from 'lucide-react';

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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifPopover, setShowNotifPopover] = useState(false);

  const fetchUserNotifs = async () => {
    if (!user || !user.email) return;
    try {
      const list = await getNotifications(user.email);
      setNotifications(list);
    } catch (err) {
      console.error('Failed fetching user notifications', err);
    }
  };

  useEffect(() => {
    fetchUserNotifs();
    const interval = setInterval(fetchUserNotifs, 10000);
    return () => clearInterval(interval);
  }, [user.email]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    await markNotificationsAsRead(user.email);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getNotifIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'submission_approved':
      case 'task_approved':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
      case 'submission_rejected':
      case 'task_rejected':
        return <XCircle className="h-4 w-4 text-rose-600 shrink-0" />;
      case 'submission_revision':
        return <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />;
      default:
        return <Bell className="h-4 w-4 text-indigo-600 shrink-0" />;
    }
  };

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
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Balance Badge */}
            {activeRole !== 'admin' && (
              <div className="flex items-center bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-indigo-900 font-medium text-sm shadow-2xs">
                <Coins className="h-4 w-4 text-indigo-600 mr-1.5" />
                <span className="font-mono text-indigo-700">${user.balance.toFixed(2)}</span>
              </div>
            )}

            {/* Notification Bell Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifPopover(!showNotifPopover);
                  fetchUserNotifs();
                }}
                className="p-2 text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer relative"
                title="Notifications"
                id="btn-notifications-bell"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover Dropdown */}
              {showNotifPopover && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-neutral-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-xs font-extrabold text-neutral-900 uppercase tracking-wider">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] font-bold text-indigo-600 hover:underline px-2 py-1 cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifPopover(false)}
                        className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-neutral-400">
                        <Bell className="h-6 w-6 mx-auto mb-2 text-neutral-300" />
                        <p className="text-xs font-semibold">No notifications yet</p>
                        <p className="text-[10px] text-neutral-400 mt-1">Updates on task reviews and campaign approvals will appear here.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 transition-colors flex items-start space-x-3 ${
                            !n.read ? 'bg-indigo-50/40 font-medium' : 'hover:bg-neutral-50/60'
                          }`}
                        >
                          <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-neutral-100 shadow-2xs">
                            {getNotifIcon(n.type)}
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-neutral-900">{n.title}</h4>
                              <span className="text-[9px] text-neutral-400 font-mono">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-600 leading-snug">{n.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                    Member Profile
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
