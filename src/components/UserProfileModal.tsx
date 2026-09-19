import React, { useState, useEffect } from 'react';
import { User, Task, Submission } from '../types';
import { getTasks, getSubmissions } from '../lib/supabase';
import { User as UserIcon, Mail, Shield, Coins, Calendar, CheckCircle2, ListTodo, FileText, X, AlertCircle, Award } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onOpenDeposit?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onOpenDeposit
}) => {
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    tasksPending: 0,
    totalEarned: 0,
    campaignsCreated: 0,
    totalSpent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const [allTasks, allSubmissions] = await Promise.all([
          getTasks(),
          getSubmissions()
        ]);

        if (user.role === 'advertiser' || user.role === 'admin') {
          const myCampaigns = allTasks.filter(t => t.created_by === user.id);
          const totalSpent = myCampaigns.reduce((sum, c) => sum + (c.total_cost || 0), 0);
          setStats(prev => ({
            ...prev,
            campaignsCreated: myCampaigns.length,
            totalSpent
          }));
        }

        const mySubmissions = allSubmissions.filter(
          s => s.worker_email.toLowerCase() === user.email.toLowerCase()
        );
        const approvedSubmissions = mySubmissions.filter(s => s.status === 'approved');
        const pendingSubmissions = mySubmissions.filter(s => s.status === 'pending');

        // Calculate earnings for worker
        let totalEarned = 0;
        approvedSubmissions.forEach(s => {
          const matchedTask = allTasks.find(t => t.id === s.task_id);
          if (matchedTask) {
            totalEarned += matchedTask.worker_pay;
          }
        });

        setStats(prev => ({
          ...prev,
          tasksCompleted: approvedSubmissions.length,
          tasksPending: pendingSubmissions.length,
          totalEarned
        }));
      } catch (err) {
        console.error('Failed loading profile statistics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Recent Member';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="user-profile-overlay">
      <div className="bg-white max-w-md w-full rounded-2xl border border-neutral-100 shadow-xl overflow-hidden animate-slide-up" id="user-profile-modal">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-2xl font-black shadow-inner">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">{user.email.split('@')[0]}</h2>
              <p className="text-xs text-indigo-200 mt-0.5 flex items-center">
                <Mail className="h-3 w-3 mr-1 shrink-0" />
                {user.email}
              </p>
              <div className="mt-2 flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider backdrop-blur-xs border border-white/20">
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details & Metrics Body */}
        <div className="p-6 space-y-6">
          {/* Account Balance Card */}
          <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Account Balance</p>
                <p className="text-2xl font-black font-mono text-neutral-900">${user.balance.toFixed(2)} USD</p>
              </div>
            </div>

            {onOpenDeposit && user.role === 'advertiser' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDeposit();
                }}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                Deposit Funds
              </button>
            )}
          </div>

          {/* Account Details List */}
          <div className="space-y-3 border-t border-neutral-100 pt-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Account Information</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-50/50 p-3 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Member Since</p>
                <p className="text-xs font-bold text-neutral-800 mt-1 flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                  {joinedDate}
                </p>
              </div>

              <div className="bg-neutral-50/50 p-3 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">User Role</p>
                <p className="text-xs font-bold text-neutral-800 mt-1 capitalize flex items-center">
                  <Award className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                  {user.role}
                </p>
              </div>
            </div>
          </div>

          {/* Worker / Advertiser Statistics */}
          <div className="space-y-3 border-t border-neutral-100 pt-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Activity Overview</h3>

            {loading ? (
              <div className="py-6 text-center">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Completed Jobs</p>
                  <p className="text-xl font-extrabold text-emerald-700 mt-1 flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-600" />
                    {stats.tasksCompleted}
                  </p>
                  <p className="text-[10px] text-emerald-600/80 mt-0.5">Approved & paid tasks</p>
                </div>

                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-800 uppercase">Total Earned</p>
                  <p className="text-xl font-black font-mono text-indigo-700 mt-1">
                    ${stats.totalEarned.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-indigo-600/80 mt-0.5">From completed tasks</p>
                </div>

                {user.role === 'advertiser' && (
                  <>
                    <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-100 col-span-2 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase">Campaigns Launched</p>
                        <p className="text-base font-bold text-neutral-800 mt-0.5">{stats.campaignsCreated} Active/Past Campaigns</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase">Total Budget Spent</p>
                        <p className="text-base font-black font-mono text-neutral-900">${stats.totalSpent.toFixed(2)}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
