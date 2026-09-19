import React, { useState, useEffect } from 'react';
import { User, Task, Submission } from '../types';
import { getTasks, getSubmissions } from '../lib/supabase';
import { User as UserIcon, Mail, Shield, Coins, Calendar, CheckCircle2, Award, ArrowLeft, Briefcase, PlusCircle, CreditCard, DollarSign } from 'lucide-react';

interface UserProfilePageProps {
  user: User;
  onBack: () => void;
  onBalanceUpdate: (user: User) => void;
  onOpenDeposit?: () => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  user,
  onBack,
  onBalanceUpdate,
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
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [allTasks, allSubmissions] = await Promise.all([
          getTasks(),
          getSubmissions()
        ]);

        const myCampaigns = allTasks.filter(t => t.created_by === user.id || t.created_by.toLowerCase() === user.email.toLowerCase());
        const totalSpent = myCampaigns.reduce((sum, c) => sum + (c.total_cost || 0), 0);

        const mySubmissions = allSubmissions.filter(
          s => s.worker_email.toLowerCase() === user.email.toLowerCase()
        );
        const approvedSubmissions = mySubmissions.filter(s => s.status === 'approved');
        const pendingSubmissions = mySubmissions.filter(s => s.status === 'pending');

        let totalEarned = 0;
        approvedSubmissions.forEach(s => {
          const matchedTask = allTasks.find(t => t.id === s.task_id);
          if (matchedTask) {
            totalEarned += matchedTask.worker_pay;
          }
        });

        setStats({
          campaignsCreated: myCampaigns.length,
          totalSpent,
          tasksCompleted: approvedSubmissions.length,
          tasksPending: pendingSubmissions.length,
          totalEarned
        });
      } catch (err) {
        console.error('Failed loading profile statistics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Recent Member';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6" id="user-profile-page">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 px-3.5 py-2 rounded-xl transition-all hover:bg-neutral-50 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Dashboard
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          User Account Profile
        </span>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-5">
            <div className="h-20 w-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-3xl font-black shadow-inner shrink-0">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-tight">
                {user.email.split('@')[0]}
              </h1>
              <p className="text-sm text-indigo-200 mt-1 flex items-center">
                <Mail className="h-4 w-4 mr-1.5 shrink-0" />
                {user.email}
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-100 border border-indigo-400/20">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Joined {joinedDate}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 w-full sm:w-auto min-w-[200px]">
            <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Wallet Balance</p>
            <p className="text-3xl font-black font-mono text-white mt-1">${user.balance.toFixed(2)} USD</p>
            {onOpenDeposit && user.role !== 'admin' && (
              <button
                onClick={onOpenDeposit}
                className="mt-3 w-full py-2 px-3 bg-white hover:bg-neutral-100 text-indigo-900 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-1"
              >
                <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                <span>Deposit Funds</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details & Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Info Column */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center">
            <UserIcon className="h-4 w-4 text-indigo-600 mr-2" />
            Account Details
          </h2>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100">
              <p className="text-[10px] font-bold text-neutral-400 uppercase">Registered Email</p>
              <p className="text-xs font-bold text-neutral-800 mt-0.5 truncate">{user.email}</p>
            </div>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100">
              <p className="text-[10px] font-bold text-neutral-400 uppercase">Account Identifier</p>
              <p className="text-xs font-mono font-semibold text-neutral-600 mt-0.5 truncate">{user.id}</p>
            </div>
          </div>
        </div>

        {/* Activity & Performance Metrics (2 Columns wide) */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs space-y-6">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mr-2" />
            Activity & Performance Statistics
          </h2>

          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
              <p className="text-xs text-neutral-400 mt-2 font-medium">Loading user activity data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-1">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-xs font-bold uppercase tracking-wider">Completed Tasks</span>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-3xl font-black text-emerald-900">{stats.tasksCompleted}</p>
                <p className="text-xs text-emerald-700/80 font-medium">Successfully approved and paid submissions</p>
              </div>

              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-1">
                <div className="flex items-center justify-between text-indigo-700">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Earned</span>
                  <DollarSign className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="text-3xl font-black font-mono text-indigo-900">${stats.totalEarned.toFixed(2)}</p>
                <p className="text-xs text-indigo-700/80 font-medium">Earnings credited to your balance</p>
              </div>

              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 space-y-1">
                <div className="flex items-center justify-between text-amber-800">
                  <span className="text-xs font-bold uppercase tracking-wider">Pending Tasks</span>
                  <Briefcase className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-3xl font-black text-amber-900">{stats.tasksPending}</p>
                <p className="text-xs text-amber-700/80 font-medium">Awaiting advertiser review</p>
              </div>

              {user.role !== 'admin' && (
                <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 space-y-1">
                  <div className="flex items-center justify-between text-purple-800">
                    <span className="text-xs font-bold uppercase tracking-wider">Created Campaigns</span>
                    <PlusCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-3xl font-black text-purple-900">{stats.campaignsCreated}</p>
                  <p className="text-xs text-purple-700/80 font-medium">Total budget spent: ${stats.totalSpent.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
