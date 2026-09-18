import React, { useState, useEffect } from 'react';
import { Task, User, Submission } from '../types';
import { getTasks, getSubmissions, updateTaskStatus, updateSubmissionStatus, getUsers, updateUserBalance } from '../lib/supabase';
import { Shield, ShieldAlert, Key, Check, X, AlertCircle, RefreshCw, Layers, UserCheck, Database, HelpCircle } from 'lucide-react';

interface AdminPanelProps {
  onShowSqlModal: () => void;
  isUsingFallback: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onShowSqlModal, isUsingFallback }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Queue state
  const [pendingCampaigns, setPendingCampaigns] = useState<Task[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'submissions'>('campaigns');

  const [usersMap, setUsersMap] = useState<Record<string, User>>({});

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect admin access password.');
    }
  };

  const loadAdminData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const allTasks = await getTasks();
      const pendingTasks = allTasks.filter(t => t.status === 'pending_review');
      setPendingCampaigns(pendingTasks);

      const allSubmissions = await getSubmissions();
      const pendingSubs = allSubmissions.filter(s => s.status === 'pending');
      setPendingSubmissions(pendingSubs);

      // Fetch all users to map emails/IDs
      const allUsers = await getUsers();
      const map: Record<string, User> = {};
      allUsers.forEach(u => {
        map[u.id] = u;
        map[u.email.toLowerCase()] = u;
      });
      setUsersMap(map);
    } catch (err) {
      console.error('Failed to load admin review queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isAuthenticated]);

  // Campaign acceptance/rejection flow
  const handleReviewCampaign = async (task: Task, action: 'approved' | 'rejected') => {
    try {
      if (action === 'rejected') {
        // Refund Advertiser's balance!
        const advertiser = usersMap[task.created_by];
        if (advertiser) {
          const refundedBalance = advertiser.balance + task.total_cost;
          await updateUserBalance(advertiser.id, refundedBalance);
        }
      }

      await updateTaskStatus(task.id, action);
      await loadAdminData();
    } catch (err) {
      console.error('Failed to process campaign review', err);
    }
  };

  // Submission review flow
  const handleReviewSubmission = async (sub: Submission, action: 'approved' | 'rejected') => {
    try {
      await updateSubmissionStatus(sub.id, action);

      if (action === 'approved') {
        // Load tasks list to find payout details
        const allTasks = await getTasks();
        const matchedTask = allTasks.find(t => t.id === sub.task_id);
        
        if (matchedTask) {
          // Find worker account
          const worker = usersMap[sub.worker_email.toLowerCase()];
          if (worker) {
            const updatedBalance = worker.balance + matchedTask.worker_pay;
            await updateUserBalance(worker.id, updatedBalance);
          }
        }
      }

      await loadAdminData();
    } catch (err) {
      console.error('Failed to process worker submission', err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-neutral-100 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Unlock Administrator Control</h2>
            <p className="text-xs text-neutral-500">Input the admin password to review campaigns and worker submissions.</p>
          </div>

          {authError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl p-3 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                Admin Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                  <Key className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (Hint: admin123)"
                  className="block w-full pl-9 pr-3 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-neutral-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-neutral-900 hover:bg-neutral-800 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md"
            >
              <span>Unlock Admin Panel</span>
            </button>
          </form>

          <p className="text-[10px] text-neutral-400 text-center italic">
            * Default secure password is <strong>admin123</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8" id="admin-panel">
      {/* Top Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center">
            <Shield className="h-6 w-6 text-indigo-600 mr-2.5" />
            Administrator Workspace
          </h1>
          <p className="text-xs text-neutral-500 mt-1">Review pending advertiser campaign proposals and evaluate completed worker jobs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAdminData}
            className="p-2 bg-neutral-100 text-neutral-600 rounded-xl hover:bg-neutral-200 transition-all cursor-pointer"
            title="Refresh Admin Queue"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isUsingFallback && (
            <button
              onClick={onShowSqlModal}
              className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl hover:bg-amber-100 cursor-pointer"
            >
              Set up Supabase tables (SQL)
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 flex space-x-6">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-4 text-sm font-bold flex items-center space-x-2 relative cursor-pointer ${
            activeTab === 'campaigns' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Pending Campaigns ({pendingCampaigns.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-4 text-sm font-bold flex items-center space-x-2 relative cursor-pointer ${
            activeTab === 'submissions' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Pending Proofs ({pendingSubmissions.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-neutral-100 shadow-2xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2"></div>
          <p className="text-xs text-neutral-500 font-medium">Fetching pending logs...</p>
        </div>
      ) : activeTab === 'campaigns' ? (
        /* Campaigns Review queue */
        pendingCampaigns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center shadow-2xs space-y-2 max-w-md mx-auto">
            <ShieldAlert className="h-8 w-8 text-neutral-400 mx-auto" />
            <h4 className="text-sm font-bold text-neutral-800">No campaigns pending review</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              When advertisers launch campaigns, they will show up in this queue immediately for you to review and approve.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingCampaigns.map((task) => {
              const advertiser = usersMap[task.created_by];
              return (
                <div key={task.id} className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-2xs flex flex-col lg:flex-row justify-between gap-6">
                  <div className="space-y-4 max-w-3xl flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Category: {task.category}
                      </span>
                      <span className="bg-neutral-100 text-neutral-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                        Zone: {task.zone}
                      </span>
                      {advertiser && (
                        <span className="bg-purple-50 text-purple-800 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                          Advertiser: {advertiser.email} (Balance: ${advertiser.balance.toFixed(2)})
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-neutral-900">{task.title}</h3>
                      <div className="mt-2.5 p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs text-neutral-600 whitespace-pre-line leading-relaxed">
                        <p className="font-bold text-neutral-700 mb-1">Required Instructions:</p>
                        {task.instructions}
                      </div>
                    </div>

                    <div className="text-xs text-neutral-400 font-semibold flex flex-wrap gap-x-4 gap-y-1">
                      <span>Target Countries: <strong className="text-neutral-600 font-bold">{task.countries.join(', ')}</strong></span>
                      <span>•</span>
                      <span>Requires Screenshot Proof: <strong className={task.require_proof ? 'text-amber-600' : 'text-neutral-500'}>{task.require_proof ? 'YES' : 'NO'}</strong></span>
                    </div>
                  </div>

                  {/* Pricing metrics and reviewer controls */}
                  <div className="shrink-0 lg:w-64 border-t lg:border-t-0 lg:border-l border-neutral-100 pt-4 lg:pt-0 lg:pl-6 flex flex-col justify-between">
                    <div className="space-y-2 text-xs text-neutral-600">
                      <div className="flex justify-between">
                        <span>Workers Needed:</span>
                        <strong className="text-neutral-900">{task.workers_needed}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Payout / Worker:</span>
                        <strong className="text-neutral-900 font-mono">${task.worker_pay.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between font-bold text-neutral-800 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                        <span>Total Campaign Cost:</span>
                        <span className="text-indigo-600 font-mono">${task.total_cost.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 lg:mt-0">
                      <button
                        onClick={() => handleReviewCampaign(task, 'approved')}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReviewCampaign(task, 'rejected')}
                        className="flex-1 py-2 px-3 border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject & Refund</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Submissions Review queue */
        pendingSubmissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center shadow-2xs space-y-2 max-w-md mx-auto">
            <UserCheck className="h-8 w-8 text-neutral-400 mx-auto" />
            <h4 className="text-sm font-bold text-neutral-800">No worker proofs pending review</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              When workers complete micro-jobs, their proof of work will land in this queue immediately for validation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingSubmissions.map((sub) => {
              return (
                <div key={sub.id} className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-2xs flex flex-col lg:flex-row justify-between gap-6">
                  <div className="space-y-3 max-w-3xl flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Worker Profile: {sub.worker_email}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Submitted: {new Date(sub.submitted_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Worker Written Proof:</p>
                        <p className="text-xs text-neutral-700 mt-1 whitespace-pre-line leading-relaxed">{sub.proof_text}</p>
                      </div>

                      {sub.proof_image && (
                        <div className="pt-2 border-t border-neutral-200/50">
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Submitted Image Screenshot Proof:</p>
                          <div className="max-w-md border border-neutral-200 rounded-lg overflow-hidden bg-white">
                            <img
                              src={sub.proof_image}
                              alt="Worker screenshot confirmation proof"
                              className="max-h-[200px] object-contain hover:scale-[1.01] transition-all cursor-zoom-in"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions column for submissions */}
                  <div className="shrink-0 lg:w-56 border-t lg:border-t-0 lg:border-l border-neutral-100 pt-4 lg:pt-0 lg:pl-6 flex flex-col justify-end">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewSubmission(sub, 'approved')}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve Proof</span>
                      </button>
                      <button
                        onClick={() => handleReviewSubmission(sub, 'rejected')}
                        className="flex-1 py-2.5 px-3 border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1 transition-all cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
