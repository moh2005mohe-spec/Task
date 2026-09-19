import React, { useState, useEffect } from 'react';
import { Task, User, Submission, CATEGORIES } from '../types';
import { getTasks, saveSubmission, getSubmissions } from '../lib/supabase';
import { CONTINENTS, getContinentForCountry } from '../data/countries';
import { Briefcase, Coins, FileCheck, ImageIcon, Send, X, AlertCircle, Clock, CheckCircle2, XCircle, Filter, ArrowRight, ShieldCheck, Globe, ShieldAlert, MapPin } from 'lucide-react';
import { KYCModal } from './KYCModal';

interface WorkerDashboardProps {
  user: User;
  onBalanceUpdate: (updatedUser: User) => void;
  onSelectTask?: (task: Task) => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ user, onBalanceUpdate, onSelectTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workerSubmissions, setWorkerSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // KYC Enforcer Modals
  const [kycWarningModal, setKycWarningModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  // Sub-tab navigation: 'jobs' | 'submissions'
  const [activeTab, setActiveTab] = useState<'jobs' | 'submissions'>('jobs');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Active submission modal fallback state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proofText, setProofText] = useState('');
  const [proofImageBase64, setProofImageBase64] = useState<string>('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const allTasks = await getTasks();
      // Display all active tasks from database (approved or pending review, exclude only rejected)
      const liveTasks = allTasks.filter(t => t.status !== 'rejected');
      setTasks(liveTasks);

      const allSubmissions = await getSubmissions();
      // Filter for this worker's submissions
      const mySubmissions = allSubmissions.filter(s => s.worker_email.toLowerCase() === user.email.toLowerCase());
      setWorkerSubmissions(mySubmissions);
    } catch (err) {
      console.error('Failed to load worker tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.email]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setModalError('Screenshot file size is too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenSubmission = (task: Task) => {
    setSelectedTask(task);
    const existingSub = workerSubmissions.find(s => s.task_id === task.id);
    if (existingSub) {
      setProofText(existingSub.proof_text || '');
      setProofImageBase64(existingSub.proof_image || '');
    } else {
      setProofText('');
      setProofImageBase64('');
    }
    setModalError('');
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setModalError('');

    if (user.kyc_status !== 'approved') {
      setModalError('You must be verified via KYC before submitting or executing any task.');
      return;
    }

    if (!proofText.trim()) {
      setModalError('Please enter written proof of completion details.');
      return;
    }

    if (selectedTask.require_proof && !proofImageBase64) {
      setModalError('This task strictly requires an uploaded screenshot proof to confirm completion.');
      return;
    }

    setSubmittingProof(true);

    try {
      const existingSub = workerSubmissions.find(s => s.task_id === selectedTask.id);
      const newSubmission: Submission = {
        id: existingSub ? existingSub.id : ('sub-' + Math.random().toString(36).substr(2, 9)),
        task_id: selectedTask.id,
        worker_email: user.email,
        proof_text: proofText.trim(),
        proof_image: proofImageBase64 || undefined,
        status: 'pending',
        submitted_at: new Date().toISOString()
      };

      await saveSubmission(newSubmission);
      setSelectedTask(null);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit proof.');
    } finally {
      setSubmittingProof(false);
    }
  };

  const hasSubmitted = (taskId: string) => {
    return workerSubmissions.some(s => s.task_id === taskId);
  };

  const getMySubmissionStatus = (taskId: string) => {
    const found = workerSubmissions.find(s => s.task_id === taskId);
    return found ? found.status : null;
  };

  const handleTaskClick = (task: Task) => {
    // 1. Check KYC verification status
    if (user.kyc_status !== 'approved') {
      setKycWarningModal({
        open: true,
        message: 'You must verify your account with KYC first to be able to execute tasks and receive payouts.'
      });
      return;
    }

    // 2. Direct task execution without restrictive geo-blocking
    if (onSelectTask) {
      onSelectTask(task);
    } else {
      handleOpenSubmission(task);
    }
  };

  // Strict Geo-Targeting based on KYC Country
  // If worker is KYC-verified, we resolve their country and continent to strictly show matching tasks.
  // This bypasses any VPN spoofing because it uses the verified KYC country from their profile.
  const workerKycCountry = (user.kyc_country || '').trim().toLowerCase();
  const workerContinent = workerKycCountry ? getContinentForCountry(user.kyc_country || '') : null;

  // Filter out tasks that the worker has already submitted
  const unsubmittedTasks = tasks.filter((task) => !hasSubmitted(task.id));

  // Geo-filter tasks:
  // If the user has an approved KYC with a country, only show tasks targeting their country or continent.
  const geoFilteredTasks = unsubmittedTasks.filter((task) => {
    // If worker has no approved KYC or no verified country recorded, they cannot see targeted jobs
    if (user.kyc_status !== 'approved' || !workerKycCountry) {
      return true; // will show prompt banner to complete KYC
    }

    const taskZone = (task.zone || '').toLowerCase();
    const taskCountries = (task.countries || []).map(c => c.toLowerCase());

    // 1. If task is Global / International (or targeting All countries), it is available
    if (taskZone.includes('international') || taskZone.includes('global') || taskZone.includes('all')) {
      return true;
    }

    // 2. Check if the task countries list explicitly includes the user's verified country
    const matchesCountry = taskCountries.some(c => 
      c === workerKycCountry || workerKycCountry.includes(c) || c.includes(workerKycCountry)
    );
    if (matchesCountry) {
      return true;
    }

    // 3. Check if the task zone or countries match the user's continent
    if (workerContinent) {
      const continentLower = workerContinent.toLowerCase();
      if (taskZone.includes(continentLower)) {
        // If task has no specific countries, or includes countries in this continent
        if (taskCountries.length === 0) return true;
        // Or if any country in the continent matches
        const continentCountries = (CONTINENTS[workerContinent] || []).map(c => c.toLowerCase());
        const targetsContinentCountries = taskCountries.some(tc => continentCountries.includes(tc));
        if (targetsContinentCountries && matchesCountry) return true;
      }
    }

    return false;
  });

  // Filter available tasks by selected category
  const filteredTasks = geoFilteredTasks.filter((task) => {
    if (selectedCategory === 'All') return true;
    return task.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
           selectedCategory.toLowerCase().includes(task.category.toLowerCase());
  });

  // Filter categories matching CreateTask categories
  const categoryNames = ['All', ...CATEGORIES.map(c => c.name)];
  const allCategories = Array.from(new Set([...categoryNames, ...tasks.map(t => t.category)]));

  // Helper to compute remaining auto-approval time (3 days = 72 hours)
  const getAutoApprovalTimeString = (submittedAt: string) => {
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const submittedTime = new Date(submittedAt).getTime();
    if (isNaN(submittedTime)) return 'Within 3 days';

    const deadline = submittedTime + THREE_DAYS_MS;
    const remainingMs = deadline - Date.now();

    if (remainingMs <= 0) return 'Auto-approving now...';

    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) return `${days}d ${remHours}h remaining`;
    return `${hours}h remaining`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 w-full" id="worker-dashboard">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Micro-Task Workspace</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Perform simple online jobs, submit verified proofs, and earn USD directly into your balance.
          </p>
        </div>
        <div className="flex items-center space-x-2.5 bg-emerald-50 text-emerald-800 px-4 py-2.5 rounded-xl font-bold text-sm shadow-2xs border border-emerald-100/50">
          <Coins className="h-4.5 w-4.5 text-emerald-600" />
          <span>Wallet Balance: ${user.balance.toFixed(2)} USD</span>
        </div>
      </div>

      {/* KYC Status Banner */}
      {user.kyc_status !== 'approved' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="worker-kyc-guard-banner">
          <div className="flex items-start space-x-3.5">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-amber-950 text-sm">KYC Identity Verification Required to Execute Tasks</h4>
              <p className="text-amber-800 leading-relaxed">
                To protect our platform and advertisers against multi-accounting and VPN location spoofing, all workers must complete KYC verification. Once verified, tasks will be strictly targeted to your official registered country.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsKycModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            <span>Verify KYC Now</span>
          </button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <div className="flex space-x-2 bg-neutral-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'jobs'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Available Tasks ({unsubmittedTasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'submissions'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            <span>My Executed Tasks ({workerSubmissions.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AVAILABLE TASKS */}
      {activeTab === 'jobs' && (
        <div className="space-y-6 w-full">
          {/* Category Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-2xs space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-neutral-700">
              <Filter className="h-4 w-4 text-emerald-600" />
              <span>Filter Tasks by Category:</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-200'
                      : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sequential Full-Width Tasks Stream */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center shadow-2xs w-full">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-2"></div>
              <p className="text-xs text-neutral-500 font-medium">Loading available micro-jobs...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center shadow-2xs space-y-3 w-full">
              <div className="bg-neutral-50 rounded-full p-4 w-fit mx-auto text-neutral-400">
                <Briefcase className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-neutral-800">No tasks found in category "{selectedCategory}"</h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Try selecting "All" or choosing another category above to view available campaigns.
              </p>
              {selectedCategory !== 'All' && (
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Show All Categories
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 w-full">
              {filteredTasks.map((task, idx) => {
                const isCompleted = hasSubmitted(task.id);
                const subStatus = getMySubmissionStatus(task.id);
                const doneCount = (idx * 7 + 12) % 120 + 5;
                const totalCount = doneCount + 45;

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 w-full ${
                      isCompleted ? 'border-neutral-200 bg-neutral-50/40' : 'border-emerald-100/60 shadow-xs'
                    }`}
                  >
                    {/* Task Metadata & Information matching SproutGigs screenshot */}
                    <div className="space-y-3 flex-1">
                      <div>
                        {/* SproutGigs Header Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-extrabold text-neutral-900 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200/50">
                            Offer: {task.title}
                          </span>
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                            PREMIUM
                          </span>
                          <span className="bg-neutral-100 text-neutral-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            N International
                          </span>
                          <span className="bg-neutral-100 text-neutral-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Novice
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 leading-snug">
                          {task.instructions.slice(0, 95)}...
                        </h3>

                        {/* Completion progress bar matching screenshot */}
                        <div className="mt-3 flex items-center space-x-3 text-xs text-neutral-500">
                          <div className="w-48 bg-neutral-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, (doneCount / totalCount) * 100)}%` }}></div>
                          </div>
                          <span className="font-mono font-bold text-[11px] text-neutral-600">{doneCount} of {totalCount} done</span>
                        </div>
                      </div>
                    </div>

                    {/* Task Price and Action Area */}
                    <div className="flex items-center justify-between lg:flex-col lg:items-end lg:justify-center gap-3 shrink-0 border-t lg:border-t-0 border-neutral-100 pt-4 lg:pt-0">
                      <div className="font-mono font-black text-emerald-600 text-lg sm:text-xl">
                        ${task.worker_pay.toFixed(2)}
                      </div>

                      {isCompleted && subStatus !== 'revision_requested' ? (
                        <div>
                          {subStatus === 'pending' && (
                            <span className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="h-3.5 w-3.5 mr-1 text-amber-600 animate-pulse" />
                              Under Review
                            </span>
                          )}
                          {subStatus === 'approved' && (
                            <span className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                              Paid
                            </span>
                          )}
                          {subStatus === 'rejected' && (
                            <span className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="h-3.5 w-3.5 mr-1 text-rose-600" />
                              Declined
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleTaskClick(task)}
                          className={`px-5 py-2.5 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md ${
                            subStatus === 'revision_requested'
                              ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
                          }`}
                        >
                          <span>{subStatus === 'revision_requested' ? 'Fix & Resubmit' : 'Complete Task'}</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY EXECUTED TASKS & SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div className="space-y-6 w-full">
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-6 shadow-2xs w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 flex items-center">
                  <FileCheck className="h-5 w-5 text-indigo-600 mr-2" />
                  My Executed Tasks & Status
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Track the verification status of your work. Pending tasks automatically approve after 3 days if unreviewed.
                </p>
              </div>

              <div className="text-xs font-semibold bg-indigo-50 text-indigo-800 px-3 py-1.5 rounded-xl border border-indigo-100/60 w-fit">
                3-Day Auto-Payout Protection Active
              </div>
            </div>

            {workerSubmissions.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="bg-neutral-50 rounded-full p-4 w-fit mx-auto text-neutral-400">
                  <FileCheck className="h-8 w-8" />
                </div>
                <h4 className="text-base font-bold text-neutral-800">No executed tasks yet</h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  Switch to the "Available Tasks" tab above to choose a task, submit proof, and start earning USD.
                </p>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Browse Available Tasks
                </button>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                {workerSubmissions.map((sub) => {
                  const matchedTask = tasks.find((t) => t.id === sub.task_id);
                  const taskTitle = matchedTask ? matchedTask.title : 'Micro-Task Submission';
                  const taskPay = matchedTask ? matchedTask.worker_pay : 0;

                  return (
                    <div
                      key={sub.id}
                      className="bg-neutral-50/60 rounded-2xl border border-neutral-200/80 p-5 space-y-4 transition-all w-full"
                    >
                      {/* Top status bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/60 pb-3">
                        <div>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Submitted Job</span>
                          <h3 className="text-sm font-bold text-neutral-900">{taskTitle}</h3>
                          <span className="text-[10px] text-neutral-400 font-medium">
                            Submitted on: {new Date(sub.submitted_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center space-x-2">
                          {sub.status === 'pending' && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="h-3.5 w-3.5 mr-1.5 text-amber-600 animate-pulse" />
                              Pending Review
                            </span>
                          )}

                          {sub.status === 'approved' && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                              Paid +${taskPay.toFixed(2)} USD
                            </span>
                          )}

                          {sub.status === 'rejected' && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="h-3.5 w-3.5 mr-1.5 text-rose-600" />
                              Declined / Rejected
                            </span>
                          )}

                          {sub.status === 'revision_requested' && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                              Revision Requested
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pending 3-day Auto Approval Banner */}
                      {sub.status === 'pending' && (
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                          <p className="font-bold flex items-center text-amber-800">
                            <Clock className="h-4 w-4 mr-1.5 text-amber-600 shrink-0" />
                            3-Day Auto-Approval Protection ({getAutoApprovalTimeString(sub.submitted_at)})
                          </p>
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            If the advertiser does not review your proof within 3 days (72 hours), system rules will automatically approve your submission and credit <strong>${taskPay.toFixed(2)} USD</strong> directly to your balance.
                          </p>
                        </div>
                      )}

                      {/* Revision Request Feedback Banner */}
                      {sub.status === 'revision_requested' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-2">
                          <p className="font-bold text-amber-800 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1.5 text-amber-600 shrink-0" />
                            Advertiser Note for Revision:
                          </p>
                          <p className="text-amber-700 italic bg-white/70 p-2.5 rounded-lg border border-amber-100">
                            "{sub.feedback || 'Please review your proof and resubmit.'}"
                          </p>

                          {matchedTask && (
                            <button
                              onClick={() => {
                                if (onSelectTask) {
                                  onSelectTask(matchedTask);
                                } else {
                                  handleOpenSubmission(matchedTask);
                                }
                              }}
                              className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer w-fit shadow-xs"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Fix & Resubmit Proof Now</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Submitted Proof Text Details */}
                      <div className="bg-white p-3.5 rounded-xl border border-neutral-200/60 text-xs space-y-1.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Your Submitted Written Proof</span>
                        <p className="text-neutral-800 font-medium whitespace-pre-line">{sub.proof_text}</p>
                      </div>

                      {/* Screenshot Preview */}
                      {sub.proof_image && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Uploaded Screenshot Proof</span>
                          <div className="h-28 w-28 rounded-xl border border-neutral-200 overflow-hidden bg-black/5">
                            <img src={sub.proof_image} alt="Submitted Screenshot" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submission Proof Modal Fallback */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="submission-modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-neutral-100 animate-slide-up" id="submission-modal">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-indigo-50">
              <div className="flex items-center space-x-2.5">
                <Briefcase className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-neutral-900">Submit Work Proof</h3>
                  <p className="text-[10px] text-indigo-700 font-medium">Provide details to advertisers for validation</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitProof} className="p-6 space-y-5 flex-1">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                  {modalError}
                </div>
              )}

              {/* Revision Notice */}
              {(() => {
                const sub = workerSubmissions.find(s => s.task_id === selectedTask.id);
                if (sub && sub.status === 'revision_requested' && sub.feedback) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3.5 space-y-1">
                      <p className="font-bold flex items-center text-amber-800">
                        <AlertCircle className="h-4 w-4 mr-1 text-amber-600 shrink-0" />
                        Advertiser Requested Revision:
                      </p>
                      <p className="text-amber-700 italic font-medium leading-relaxed bg-white/60 p-2 rounded-lg border border-amber-100/50">
                        "{sub.feedback}"
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Task Details Reminder */}
              <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-100">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Target Task Title</span>
                <p className="text-xs font-bold text-neutral-800">{selectedTask.title}</p>
                <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-neutral-200/50">
                  <span className="text-[10px] text-neutral-500 font-medium">Payout Reward:</span>
                  <span className="text-sm font-black text-emerald-600 font-mono">${selectedTask.worker_pay.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Written Details */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Written Proof of Execution
                </label>
                <textarea
                  rows={3}
                  required
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="e.g., username registered, reference codes, summary text, or comments made..."
                  className="block w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:outline-hidden bg-neutral-50/50 leading-relaxed"
                />
              </div>

              {/* Screenshot File Selection */}
              {selectedTask.require_proof && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Upload Confirmation Screenshot <span className="text-rose-500 font-bold">* Required</span>
                  </label>
                  
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-200 rounded-xl cursor-pointer bg-neutral-50/50 hover:bg-neutral-50 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="h-7 w-7 text-neutral-400 mb-2" />
                        <p className="text-xs text-neutral-500 font-semibold">Click to select screenshot image</p>
                        <p className="text-[10px] text-neutral-400 mt-1">PNG, JPG or JPEG (Max. 2MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {proofImageBase64 && (
                    <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-10 w-10 border border-neutral-200 rounded overflow-hidden">
                          <img src={proofImageBase64} alt="Screenshot preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600">Screenshot selected successfully</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProofImageBase64('')}
                        className="text-xs text-rose-500 hover:underline font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-neutral-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 py-3 px-4 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 bg-white hover:bg-neutral-50 transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProof}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  {submittingProof ? (
                    <span className="border-2 border-white border-t-transparent rounded-full h-3.5 w-3.5 animate-spin"></span>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Submit Proof for Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KYC Warning / Requirement Prompt Modal */}
      {kycWarningModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center relative border border-neutral-100">
            <button
              onClick={() => setKycWarningModal({ open: false, message: '' })}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1.5 rounded-full bg-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto h-14 w-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-neutral-900">
                KYC Verification Required
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed text-center">
                {kycWarningModal.message}
              </p>
            </div>

            <div className="pt-2 space-y-2">
              {user.kyc_status !== 'approved' && user.kyc_status !== 'pending' && (
                <button
                  onClick={() => {
                    setKycWarningModal({ open: false, message: '' });
                    setIsKycModalOpen(true);
                  }}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Start KYC Verification</span>
                </button>
              )}
              <button
                onClick={() => setKycWarningModal({ open: false, message: '' })}
                className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Upload Modal */}
      <KYCModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        user={user}
        onSuccess={(updatedUser) => {
          onBalanceUpdate(updatedUser);
        }}
      />
    </div>
  );
};
