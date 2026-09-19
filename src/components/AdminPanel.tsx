import React, { useState, useEffect } from 'react';
import { Task, User, Submission, KYCVerification, ZoneConfig, CategoryConfig, ZONES as DEFAULT_ZONES, CATEGORIES as DEFAULT_CATEGORIES } from '../types';
import {
  getTasks,
  getSubmissions,
  updateTaskStatus,
  updateSubmissionStatus,
  getUsers,
  updateUserBalance,
  getKYCVerifications,
  updateKYCStatus,
  getPricingSettings,
  savePricingSettings,
  SETUP_SQL
} from '../lib/supabase';
import {
  Shield,
  Key,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Layers,
  UserCheck,
  Search,
  DollarSign,
  Globe,
  Tag,
  CheckCircle2,
  XCircle,
  Eye,
  Copy,
  Database,
  Users,
  Sliders,
  FileText
} from 'lucide-react';

const ADMIN_SESSION_KEY = 'admin_session_unlocked_v1';

interface AdminPanelProps {
  user?: User;
  onShowSqlModal: () => void;
  isUsingFallback: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ user, onShowSqlModal, isUsingFallback }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (user?.role === 'admin') return true;
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  });
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin' || localStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
      setIsAuthenticated(true);
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
    }
  }, [user]);

  // Admin tabs: 'campaigns' | 'kyc' | 'users' | 'pricing' | 'sql'
  const [activeTab, setActiveTab] = useState<'campaigns' | 'kyc' | 'users' | 'pricing' | 'sql'>('campaigns');

  // Queue state
  const [pendingCampaigns, setPendingCampaigns] = useState<Task[]>([]);
  const [pendingKYCs, setPendingKYCs] = useState<KYCVerification[]>([]);
  const [allUsersList, setAllUsersList] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Pricing State
  const [zones, setZones] = useState<ZoneConfig[]>(DEFAULT_ZONES);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [pricingSuccessMsg, setPricingSuccessMsg] = useState('');

  // Rejection modal for KYC
  const [selectedKycForReject, setSelectedKycForReject] = useState<KYCVerification | null>(null);
  const [kycRejectionReason, setKycRejectionReason] = useState('');

  // Image inspection modal
  const [inspectedImage, setInspectedImage] = useState<{ url: string; title: string } | null>(null);

  // Balance edit state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState<number>(0);

  // SQL Copy feedback
  const [copiedSql, setCopiedSql] = useState(false);

  const [usersMap, setUsersMap] = useState<Record<string, User>>({});

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setAuthError('');
    } else {
      setAuthError('Incorrect admin access password.');
    }
  };

  const loadAdminData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [allTasks, allUsers, kycList, pricing] = await Promise.all([
        getTasks(),
        getUsers(),
        getKYCVerifications(),
        getPricingSettings()
      ]);

      const pendingTasks = allTasks.filter(t => t.status === 'pending_review');
      setPendingCampaigns(pendingTasks);

      setAllUsersList(allUsers);

      const pendingKycList = kycList.filter(k => k.status === 'pending');
      setPendingKYCs(pendingKycList);

      if (pricing.zones && pricing.zones.length > 0) setZones(pricing.zones);
      if (pricing.categories && pricing.categories.length > 0) setCategories(pricing.categories);

      const map: Record<string, User> = {};
      allUsers.forEach(u => {
        map[u.id] = u;
        map[u.email.toLowerCase()] = u;
      });
      setUsersMap(map);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isAuthenticated]);

  // Campaign approval/rejection
  const handleReviewCampaign = async (task: Task, action: 'approved' | 'rejected') => {
    try {
      if (action === 'rejected') {
        const advertiser = usersMap[task.created_by] || usersMap[task.created_by.toLowerCase()];
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

  // KYC approval/rejection
  const handleApproveKYC = async (kyc: KYCVerification) => {
    try {
      await updateKYCStatus(kyc.id, kyc.user_id, 'approved');
      await loadAdminData();
    } catch (err) {
      console.error('Failed approving KYC', err);
    }
  };

  const handleRejectKYCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKycForReject) return;
    try {
      await updateKYCStatus(
        selectedKycForReject.id,
        selectedKycForReject.user_id,
        'rejected',
        kycRejectionReason || 'Images provided were unclear or invalid.'
      );
      setSelectedKycForReject(null);
      setKycRejectionReason('');
      await loadAdminData();
    } catch (err) {
      console.error('Failed rejecting KYC', err);
    }
  };

  // User Balance update
  const handleSaveBalance = async () => {
    if (!editingUser) return;
    try {
      await updateUserBalance(editingUser.id, newBalanceInput);
      setEditingUser(null);
      await loadAdminData();
    } catch (err) {
      console.error('Failed updating user balance', err);
    }
  };

  // Pricing saving
  const handleSavePricing = async () => {
    try {
      await savePricingSettings(zones, categories);
      setPricingSuccessMsg('Pricing settings saved successfully!');
      setTimeout(() => setPricingSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed saving pricing settings', err);
    }
  };

  // Filter users by search
  const filteredUsers = allUsersList.filter(u =>
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (u.kyc_country && u.kyc_country.toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-neutral-100 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto h-14 w-14 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center mb-4">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Unlock Administrator Control</h2>
            <p className="text-xs text-neutral-500">Input the admin password to review campaigns, KYC requests, users & pricing.</p>
          </div>

          {authError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl p-3.5 flex items-center space-x-2">
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
                  className="block w-full pl-9 pr-3 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-neutral-50/50"
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

          <p className="text-[11px] text-neutral-400 text-center italic">
            * Default secure administrator password is <strong>admin123</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8" id="admin-panel">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center">
            <Shield className="h-6 w-6 text-indigo-600 mr-2.5" />
            Administrator Workspace
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Review campaigns, verify user KYC identity documents, manage registered users, and customize zone & category pricing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAdminData}
            className="p-2.5 bg-neutral-100 text-neutral-600 rounded-xl hover:bg-neutral-200 transition-all cursor-pointer flex items-center space-x-1 text-xs font-bold"
            title="Refresh Admin Data"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {isUsingFallback && (
            <button
              onClick={onShowSqlModal}
              className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl hover:bg-amber-100 cursor-pointer flex items-center space-x-1"
            >
              <Database className="h-4 w-4 mr-1 text-amber-600" />
              <span>SQL Setup</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-neutral-200 flex flex-wrap gap-2 sm:gap-6">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 relative cursor-pointer ${
            activeTab === 'campaigns' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Pending Campaigns ({pendingCampaigns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 relative cursor-pointer ${
            activeTab === 'kyc' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>KYC Verifications ({pendingKYCs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 relative cursor-pointer ${
            activeTab === 'users' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Registered Users ({allUsersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 relative cursor-pointer ${
            activeTab === 'pricing' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Pricing & Rates</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 relative cursor-pointer ${
            activeTab === 'sql' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>SQL Script</span>
        </button>
      </div>

      {/* TAB 1: PENDING CAMPAIGNS QUEUE */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-neutral-800 uppercase tracking-wider">
              Campaign Review Queue
            </h2>
            <span className="text-xs text-neutral-400 font-medium">
              Campaigns require admin approval before becoming visible to workers.
            </span>
          </div>

          {loading ? (
            <div className="bg-white p-12 rounded-3xl border border-neutral-100 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
              <p className="text-xs text-neutral-400 mt-2">Loading pending campaigns...</p>
            </div>
          ) : pendingCampaigns.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-neutral-100 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-neutral-800">No Pending Campaigns</h3>
              <p className="text-xs text-neutral-400">All submitted campaigns have been reviewed and processed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingCampaigns.map((task) => (
                <div
                  key={task.id}
                  className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-4 hover:border-indigo-100 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 mb-1">
                        {task.category}
                      </span>
                      <h3 className="text-base font-extrabold text-neutral-900">{task.title}</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Created by: <span className="font-semibold text-neutral-700">{task.created_by}</span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs text-neutral-400 uppercase font-bold">Total Budget</p>
                      <p className="text-xl font-black font-mono text-indigo-900">${task.total_cost.toFixed(2)} USD</p>
                      <p className="text-[11px] text-neutral-500">
                        {task.workers_needed} workers @ ${task.worker_pay.toFixed(2)} pay
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-neutral-50/60 p-4 rounded-2xl border border-neutral-100">
                    <div>
                      <p className="font-bold text-neutral-500 uppercase text-[10px]">Target Zone & Countries</p>
                      <p className="font-semibold text-neutral-800 mt-0.5">{task.zone}</p>
                      <p className="text-neutral-500 mt-0.5">
                        Countries: {task.countries?.join(', ') || 'All'}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-neutral-500 uppercase text-[10px]">Proof Requirement</p>
                      <p className="font-semibold text-neutral-800 mt-0.5">
                        {task.require_proof ? 'Screenshot Required' : 'Text Proof Only'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-neutral-700 uppercase">Instructions:</p>
                    <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100 whitespace-pre-line">
                      {task.instructions}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleReviewCampaign(task, 'rejected')}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer flex items-center space-x-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      <span>Reject & Refund Budget</span>
                    </button>
                    <button
                      onClick={() => handleReviewCampaign(task, 'approved')}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-1 cursor-pointer"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      <span>Approve & Publish Campaign</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KYC VERIFICATION QUEUE */}
      {activeTab === 'kyc' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-neutral-800 uppercase tracking-wider">
              Identity Verification Requests
            </h2>
            <span className="text-xs text-neutral-400 font-medium">
              Inspect National ID cards and selfies before approving KYC identity verification.
            </span>
          </div>

          {loading ? (
            <div className="bg-white p-12 rounded-3xl border border-neutral-100 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
              <p className="text-xs text-neutral-400 mt-2">Loading KYC verifications...</p>
            </div>
          ) : pendingKYCs.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-neutral-100 text-center space-y-3">
              <UserCheck className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-neutral-800">No Pending KYC Verification Requests</h3>
              <p className="text-xs text-neutral-400">All submitted identity documents have been reviewed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {pendingKYCs.map((kyc) => (
                <div
                  key={kyc.id}
                  className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-neutral-900">{kyc.user_email}</h3>
                      <p className="text-xs text-neutral-500 mt-0.5 flex items-center">
                        <Globe className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                        Selected Country: <strong className="text-neutral-800 ml-1">{kyc.country}</strong>
                      </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Pending Review
                    </span>
                  </div>

                  {/* 3 Images Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Front Image */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-neutral-600">Front Side ID</span>
                      <div
                        onClick={() => setInspectedImage({ url: kyc.front_image, title: 'Front Side of ID' })}
                        className="relative h-36 bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 cursor-pointer group"
                      >
                        <img src={kyc.front_image} alt="Front ID" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                          <Eye className="h-5 w-5 mr-1" /> Inspect Image
                        </div>
                      </div>
                    </div>

                    {/* Back Image */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-neutral-600">Back Side ID</span>
                      <div
                        onClick={() => setInspectedImage({ url: kyc.back_image, title: 'Back Side of ID' })}
                        className="relative h-36 bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 cursor-pointer group"
                      >
                        <img src={kyc.back_image} alt="Back ID" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                          <Eye className="h-5 w-5 mr-1" /> Inspect Image
                        </div>
                      </div>
                    </div>

                    {/* Selfie Image */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-neutral-600">Selfie holding ID</span>
                      <div
                        onClick={() => setInspectedImage({ url: kyc.selfie_image, title: 'Selfie holding ID' })}
                        className="relative h-36 bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 cursor-pointer group"
                      >
                        <img src={kyc.selfie_image} alt="Selfie ID" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                          <Eye className="h-5 w-5 mr-1" /> Inspect Image
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setSelectedKycForReject(kyc)}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer flex items-center space-x-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      <span>Reject Request</span>
                    </button>
                    <button
                      onClick={() => handleApproveKYC(kyc)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-1 cursor-pointer"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      <span>Approve Identity Verification</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REGISTERED USERS & SEARCH */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-sm font-extrabold text-neutral-800 uppercase tracking-wider">
              Registered Users Directory
            </h2>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search user by email or country..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
              />
              {userSearchQuery && (
                <button
                  onClick={() => setUserSearchQuery('')}
                  className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-neutral-100 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50/80 border-b border-neutral-100 text-neutral-400 uppercase font-bold text-[10px] tracking-wider">
                    <th className="p-4">User Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">KYC Status</th>
                    <th className="p-4">Country</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-400">
                        No users matching search query "{userSearchQuery}".
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="p-4 font-bold text-neutral-900">
                          {u.email}
                          <span className="block text-[10px] font-mono text-neutral-400 font-normal">{u.id}</span>
                        </td>
                        <td className="p-4">
                          <span className="capitalize font-bold text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-md text-[10px]">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          {u.kyc_status === 'approved' ? (
                            <span className="inline-flex items-center text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                              Verified
                            </span>
                          ) : u.kyc_status === 'pending' ? (
                            <span className="inline-flex items-center text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md text-[10px]">
                              Pending Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-neutral-500 font-medium bg-neutral-100 px-2 py-0.5 rounded-md text-[10px]">
                              Unverified
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-semibold text-neutral-700">{u.kyc_country || 'Not set'}</td>
                        <td className="p-4 font-mono font-black text-indigo-900 text-sm">
                          ${u.balance.toFixed(2)} USD
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setNewBalanceInput(u.balance);
                            }}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-[11px] rounded-lg transition-all cursor-pointer"
                          >
                            Edit Balance
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRICING & RATES CONTROL */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-neutral-800 uppercase tracking-wider">
                Category & Zone Pricing Controls
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Adjust minimum execution prices ($ USD per task worker). These rates automatically apply to task creation.
              </p>
            </div>
            <button
              onClick={handleSavePricing}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Save Pricing Settings
            </button>
          </div>

          {pricingSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{pricingSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zones Pricing */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center">
                <Globe className="h-4 w-4 text-indigo-600 mr-1.5" />
                Zone Minimum Rates
              </h3>
              <div className="space-y-3">
                {zones.map((z, idx) => (
                  <div key={z.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div>
                      <p className="text-xs font-bold text-neutral-800">{z.name}</p>
                      <p className="text-[10px] text-neutral-400">Continent: {z.continent}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-mono text-neutral-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={z.minPrice}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0.01;
                          const updated = [...zones];
                          updated[idx].minPrice = val;
                          setZones(updated);
                        }}
                        className="w-20 p-2 bg-white border border-neutral-200 rounded-xl text-xs font-mono font-bold text-indigo-900 text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Pricing */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center">
                <Tag className="h-4 w-4 text-indigo-600 mr-1.5" />
                Category Minimum Rates
              </h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {categories.map((c, idx) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div>
                      <p className="text-xs font-bold text-neutral-800">{c.name}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-mono text-neutral-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={c.minPrice}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0.01;
                          const updated = [...categories];
                          updated[idx].minPrice = val;
                          setCategories(updated);
                        }}
                        className="w-20 p-2 bg-white border border-neutral-200 rounded-xl text-xs font-mono font-bold text-indigo-900 text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SQL SETUP SCRIPT */}
      {activeTab === 'sql' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-neutral-800 uppercase tracking-wider">
              Supabase Database SQL Setup Schema
            </h2>
            <button
              onClick={() => {
                navigator.clipboard.writeText(SETUP_SQL);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 3000);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1"
            >
              <Copy className="h-4 w-4 mr-1" />
              <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
            </button>
          </div>

          <p className="text-xs text-neutral-500">
            Run this script in your Supabase SQL Editor to provision all tables: <code>custom_users</code>, <code>tasks</code>, <code>submissions</code>, <code>notifications</code>, <code>kyc_verifications</code>, and <code>pricing_settings</code>.
          </p>

          <pre className="bg-neutral-900 text-emerald-400 font-mono text-xs p-6 rounded-3xl overflow-x-auto max-h-96 border border-neutral-800">
            {SETUP_SQL}
          </pre>
        </div>
      )}

      {/* REJECT KYC MODAL */}
      {selectedKycForReject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative border border-neutral-100">
            <h3 className="text-base font-extrabold text-neutral-900">
              Reject Identity Verification Request
            </h3>
            <p className="text-xs text-neutral-500">
              Provide a reason for rejecting the KYC request for {selectedKycForReject.user_email}.
            </p>

            <form onSubmit={handleRejectKYCSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={kycRejectionReason}
                onChange={(e) => setKycRejectionReason(e.target.value)}
                placeholder="Reason (e.g., Images were blurry or ID card expired...)"
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedKycForReject(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE INSPECT MODAL */}
      {inspectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 relative border border-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-extrabold text-neutral-900">{inspectedImage.title}</h3>
              <button
                onClick={() => setInspectedImage(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 bg-neutral-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-neutral-100 rounded-2xl p-2">
              <img src={inspectedImage.url} alt="Inspect" className="max-h-[65vh] w-auto object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER BALANCE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 relative border border-neutral-100">
            <h3 className="text-base font-extrabold text-neutral-900">
              Edit User Wallet Balance
            </h3>
            <p className="text-xs text-neutral-500">
              Adjust balance for {editingUser.email}.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 uppercase">New Balance ($ USD)</label>
              <input
                type="number"
                step="0.01"
                value={newBalanceInput}
                onChange={(e) => setNewBalanceInput(parseFloat(e.target.value) || 0)}
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBalance}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Save Balance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
