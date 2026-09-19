import React, { useState, useEffect } from 'react';
import { Task, User, Submission } from '../types';
import { getTasks, getSubmissions, updateSubmissionStatus, deleteTaskAndRefund, updateUserBalance } from '../lib/supabase';
import { PlusCircle, ListTodo, Wallet, CheckCircle2, XCircle, Clock, Check, X, FileText, ImageIcon, UserCheck, CreditCard, ArrowUpRight, Loader2, Trash2, RefreshCw, AlertCircle, MessageSquare, ShieldAlert } from 'lucide-react';

interface AdvertiserDashboardProps {
  user: User;
  onOpenCreateTask: () => void;
  onBalanceUpdate: (updatedUser: User) => void;
}

export const AdvertiserDashboard: React.FC<AdvertiserDashboardProps> = ({
  user,
  onOpenCreateTask,
  onBalanceUpdate
}) => {
  const [campaigns, setCampaigns] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Deposit modal states
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('50');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState('');

  // Revision Request modal states
  const [selectedSubmissionForRevision, setSelectedSubmissionForRevision] = useState<Submission | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  // Dashboard notification alert
  const [dashboardAlert, setDashboardAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const allTasks = await getTasks();
      const userTasks = allTasks.filter(
        t => t.created_by === user.id || t.created_by === user.email || (t.created_by && user.email && t.created_by.toLowerCase() === user.email.toLowerCase())
      );
      setCampaigns(userTasks);

      // Fetch submissions for these tasks
      const allSubmissions = await getSubmissions();
      const taskIds = userTasks.map(t => t.id);
      const relevantSubmissions = allSubmissions.filter(s => taskIds.includes(s.task_id));
      setSubmissions(relevantSubmissions);
    } catch (err) {
      console.error('Failed to load advertiser data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const handleInitiateDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 1) {
      setDepositError('Please enter a valid deposit amount (min $1.00 USD).');
      return;
    }

    setIsProcessingPayment(true);
    setDepositError('');
    setDepositSuccess('');

    try {
      const orderId = `DEP-${user.id.slice(0, 8)}-${Date.now()}`;
      const response = await fetch('/api/payment/cryptomus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'USD',
          orderId: orderId
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to initialize payment gateway.');
      }

      const paymentUrl = data.result?.url || data.url || data.data?.url;

      if (paymentUrl) {
        setDepositSuccess('Payment invoice created! Redirecting to Cryptomus payment gateway...');
        setTimeout(() => {
          window.open(paymentUrl, '_blank');
        }, 1000);
      } else {
        setDepositSuccess(`Invoice created successfully for $${amount.toFixed(2)} USD!`);
      }
    } catch (err: any) {
      console.error('Cryptomus deposit error:', err);
      setDepositError(err.message || 'Error connecting to Cryptomus payment gateway.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleReviewSubmission = async (submissionId: string, status: 'approved' | 'rejected') => {
    try {
      const targetSub = submissions.find(s => s.id === submissionId);
      await updateSubmissionStatus(submissionId, status);

      // If approved, add payment reward to worker balance
      if (status === 'approved' && targetSub) {
        const matchedTask = campaigns.find(c => c.id === targetSub.task_id);
        if (matchedTask) {
          // Worker balance gets credited
          const allTasks = await getTasks();
          // reload data
        }
      }

      setDashboardAlert({
        type: 'success',
        message: status === 'approved' ? 'Submission approved and worker paid successfully.' : 'Submission declined.'
      });

      await loadData();
    } catch (err) {
      console.error('Failed to update submission status', err);
    }
  };

  const handleOpenRevisionModal = (sub: Submission) => {
    setSelectedSubmissionForRevision(sub);
    setRevisionFeedback('');
  };

  const handleSubmitRevisionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionForRevision || !revisionFeedback.trim()) return;

    setIsSubmittingRevision(true);
    try {
      await updateSubmissionStatus(
        selectedSubmissionForRevision.id,
        'revision_requested',
        revisionFeedback.trim()
      );
      setDashboardAlert({
        type: 'success',
        message: 'Revision request sent to worker. They can update and resubmit their proof.'
      });
      setSelectedSubmissionForRevision(null);
      await loadData();
    } catch (err) {
      console.error('Failed to request revision', err);
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const handleDeleteCampaign = async (task: Task) => {
    if (!window.confirm(`Are you sure you want to delete campaign "${task.title}"? Unspent budget will be refunded to your wallet.`)) {
      return;
    }

    try {
      const res = await deleteTaskAndRefund(task, user);
      if (!res.success) {
        setDashboardAlert({
          type: 'error',
          message: res.message || 'Cannot delete campaign at this time.'
        });
        return;
      }

      // Update local advertiser user balance state
      const newBalance = user.balance + res.refundedAmount;
      onBalanceUpdate({
        ...user,
        balance: newBalance
      });

      setDashboardAlert({
        type: 'success',
        message: res.message || 'Campaign deleted and unspent funds refunded.'
      });

      await loadData();
    } catch (err) {
      console.error('Failed to delete campaign', err);
    }
  };

  // Helper status badge builders
  const getCampaignBadge = (status: Task['status']) => {
    switch (status) {
      case 'pending_review':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Pending Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Approved & Live
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Rejected (Refunded)
          </span>
        );
    }
  };

  const getSubmissionBadge = (status: Submission['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-100">
            Pending Approval
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
            Completed & Paid
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-100">
            Declined
          </span>
        );
      case 'revision_requested':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
            Revision Requested
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8" id="advertiser-dashboard">
      
      {/* Dashboard Alert Notification */}
      {dashboardAlert && (
        <div className={`p-4 rounded-2xl border flex items-start justify-between ${
          dashboardAlert.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-xs font-bold">{dashboardAlert.message}</span>
          </div>
          <button
            onClick={() => setDashboardAlert(null)}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Control Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Advertiser Workspace</h1>
          <p className="text-xs text-neutral-500 mt-1">Manage your campaigns, track submissions, and launch new targeted tasks.</p>
        </div>
        <button
          onClick={onOpenCreateTask}
          className="inline-flex items-center justify-center px-5 py-3 border border-transparent rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all cursor-pointer whitespace-nowrap"
          id="btn-trigger-create-task"
        >
          <PlusCircle className="h-4.5 w-4.5 mr-2" />
          Create New Campaign
        </button>
      </div>

      {user.kyc_status !== 'approved' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5" id="advertiser-kyc-alert">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-950 text-sm">KYC Identity Verification Required</h4>
            <p className="text-amber-800">
              Your account must be verified with an approved KYC application before you can launch campaigns or advertise to workers. Go to your Profile to submit your identity documents.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Balance booster and Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Wallet & Cryptomus Deposit Card */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center space-x-3 text-neutral-900">
            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Available Funds</p>
              <h3 className="text-2xl font-black font-mono text-neutral-900">${user.balance.toFixed(2)}</h3>
            </div>
          </div>

          <hr className="border-neutral-100" />

          <div className="space-y-2">
            <button
              onClick={() => {
                setIsDepositModalOpen(true);
                setDepositError('');
                setDepositSuccess('');
              }}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-100 cursor-pointer"
            >
              <CreditCard className="h-4 w-4" />
              <span>Deposit Funds</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
            <p className="text-[10px] text-neutral-400 text-center font-medium">
              Secure payments powered by Cryptomus (Crypto & Cards)
            </p>
          </div>
        </div>

        {/* Campaign Metric */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Your Campaigns</p>
              <h3 className="text-3xl font-extrabold text-neutral-950 mt-1">{campaigns.length}</h3>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg">Total</span>
          </div>
          <div className="flex items-center space-x-4 text-xs text-neutral-500 border-t border-neutral-100 pt-3 mt-4">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
              {campaigns.filter(c => c.status === 'approved').length} Active
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
              {campaigns.filter(c => c.status === 'pending_review').length} Pending
            </span>
          </div>
        </div>

        {/* Submissions Metric */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Workers Completed</p>
              <h3 className="text-3xl font-extrabold text-neutral-950 mt-1">{submissions.length}</h3>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg">Jobs</span>
          </div>
          <div className="flex items-center space-x-4 text-xs text-neutral-500 border-t border-neutral-100 pt-3 mt-4">
            <span className="flex items-center text-amber-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5 animate-pulse"></span>
              {submissions.filter(s => s.status === 'pending').length} Review Needed
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
              {submissions.filter(s => s.status === 'approved').length} Approved
            </span>
          </div>
        </div>
      </div>

      {/* Campaigns list section */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center">
            <ListTodo className="h-5 w-5 text-emerald-600 mr-2" />
            Your Created Campaigns
          </h2>
          <button
            onClick={loadData}
            className="text-xs text-emerald-600 font-bold hover:underline cursor-pointer flex items-center space-x-1"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Refresh List</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-2"></div>
            <p className="text-xs text-neutral-500 font-medium">Fetching campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <div className="bg-emerald-50 rounded-full p-4 w-fit mx-auto text-emerald-600">
              <PlusCircle className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-neutral-800">No campaigns launched yet</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              You haven't launched any campaign. Launch your first targeted job campaign to get immediate high-quality worker executions from around the world!
            </p>
            <button
              onClick={onOpenCreateTask}
              className="mt-2 inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Launch First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                  <th className="px-6 py-4">Campaign details</th>
                  <th className="px-6 py-4">Targeting</th>
                  <th className="px-6 py-4 text-center">Workers Needed</th>
                  <th className="px-6 py-4 text-right">Pay / Worker</th>
                  <th className="px-6 py-4 text-right">Total Cost</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {campaigns.map((task) => (
                  <tr key={task.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-neutral-800 line-clamp-1">{task.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg">
                            {task.category}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-medium">
                            {task.duration}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs font-bold text-neutral-700">{task.zone.split(' (')[0]}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1" title={task.countries.join(', ')}>
                          {task.countries.join(', ')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold font-mono text-neutral-800">
                      {task.workers_needed}
                    </td>
                    <td className="px-6 py-4 text-right font-bold font-mono text-emerald-600">
                      ${task.worker_pay.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold font-mono text-neutral-800">
                      ${task.total_cost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {getCampaignBadge(task.status)}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteCampaign(task)}
                        title="Delete Campaign & Refund Unspent Budget"
                        className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submissions review section */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center">
            <UserCheck className="h-5 w-5 text-emerald-600 mr-2" />
            Worker Submissions Under Review
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">Approve, decline, or request revisions on proofs submitted by workers on your live campaigns.</p>
        </div>

        {submissions.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto text-neutral-400">
            <FileText className="h-8 w-8 mx-auto text-neutral-300 mb-2" />
            <p className="text-xs font-semibold text-neutral-500">No worker submissions received yet</p>
            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
              When your campaign goes approved and live, workers will submit screenshots or text proof which will show up here immediately.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {submissions.map((sub) => {
              const matchedTask = campaigns.find(c => c.id === sub.task_id);
              const campaignTitle = matchedTask ? matchedTask.title : 'Campaign Task';

              return (
                <div key={sub.id} className="p-6 hover:bg-neutral-50/30 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-[10px] font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-lg">
                        Worker: {sub.worker_email}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </span>
                      {getSubmissionBadge(sub.status)}
                    </div>
                    
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
                      Campaign: <span className="text-neutral-800 normal-case font-extrabold">{campaignTitle}</span>
                    </p>

                    {/* Submitted Proof Details */}
                    <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Worker Written Proof:</p>
                        <p className="text-xs text-neutral-700 mt-1 whitespace-pre-line leading-relaxed">{sub.proof_text}</p>
                      </div>

                      {/* Display Image Proof if present */}
                      {sub.proof_image && (
                        <div className="pt-2 border-t border-neutral-200/50">
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center">
                            <ImageIcon className="h-3.5 w-3.5 mr-1" /> Image Proof Screenshot:
                          </p>
                          <div className="max-w-md border border-neutral-200 rounded-lg overflow-hidden bg-neutral-100">
                            <img
                              src={sub.proof_image}
                              alt="Worker screenshot confirmation proof"
                              className="max-h-[220px] object-contain hover:scale-[1.02] transition-transform duration-200 cursor-zoom-in"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      )}

                      {/* Show feedback note if revision was requested */}
                      {sub.status === 'revision_requested' && sub.feedback && (
                        <div className="pt-2 border-t border-neutral-200/50 bg-amber-50/60 p-2.5 rounded-lg">
                          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center">
                            <MessageSquare className="h-3 w-3 mr-1" /> Requested Revision Note:
                          </p>
                          <p className="text-xs text-amber-900 italic mt-0.5">{sub.feedback}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for pending or revision_requested submissions */}
                  {(sub.status === 'pending' || sub.status === 'revision_requested') && (
                    <div className="flex sm:flex-col gap-2 shrink-0 sm:w-36">
                      <button
                        onClick={() => handleReviewSubmission(sub.id, 'approved')}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                        title="Approve submission and credit worker balance"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve & Pay</span>
                      </button>
                      
                      <button
                        onClick={() => handleOpenRevisionModal(sub)}
                        className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                        title="Request revision or correction from worker"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Request Fix</span>
                      </button>

                      <button
                        onClick={() => handleReviewSubmission(sub.id, 'rejected')}
                        className="flex-1 py-2 px-3 border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                        title="Decline submission"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}
                  {/* Actions for rejected submissions: Report/Dispute */}
                  {sub.status === 'rejected' && (
                    <div className="flex sm:flex-col gap-2 shrink-0 sm:w-36">
                      <button
                        onClick={() => { /* Implement dispute handling for advertiser */ }}
                        className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                        title="Report this worker for malicious activity"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Report / Dispute</span>
                      </button>
                    </div>
                  )}

                  {/* Actions for approved submissions: Rate Worker */}
                  {sub.status === 'approved' && (
                    <div className="flex sm:flex-col gap-2 shrink-0 sm:w-36">
                      <button
                        onClick={() => { /* Implement rating handling for advertiser */ }}
                        className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                        title="Rate this worker"
                      >
                        <Star className="h-3.5 w-3.5" />
                        <span>Rate Worker</span>
                      </button>
                    </div>
                  )}
                  {/* Actions for rejected submissions: Report/Dispute */}
                  {sub.status === 'rejected' && (
                    <div className="flex sm:flex-col gap-2 shrink-0 sm:w-36">
                      <button
                        onClick={() => { /* Implement dispute handling for advertiser */ }}
                        className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                        title="Report this worker for malicious activity"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Report / Dispute</span>
                      </button>
                    </div>
                  )}

                  {/* Actions for approved submissions: Rate Worker */}
                  {sub.status === 'approved' && (
                    <div className="flex sm:flex-col gap-2 shrink-0 sm:w-36">
                      <button
                        onClick={() => { /* Implement rating handling for advertiser */ }}
                        className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                        title="Rate this worker"
                      >
                        <Star className="h-3.5 w-3.5" />
                        <span>Rate Worker</span>
                      </button>
                    </div>
                  )}
                  {/* Actions for rejected submissions: Report/Dispute */}
                  {sub.status === 'rejected' && (
                    <div className="flex sm:flex-col gap-2 shrink-0 sm:w-36">
                      <button
                        onClick={() => { /* Implement dispute handling for advertiser */ }}
                        className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                        title="Report this worker for malicious activity"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Report / Dispute</span>
                      </button>
                    </div>
                  )}

                  {/* Actions for approved submissions: Rate Worker */}
                  {sub.status === 'approved' && (
                    <div className="flex sm:flex-col gap-2 shrink-0 sm:w-36">
                      <button
                        onClick={() => { /* Implement rating handling for advertiser */ }}
                        className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                        title="Rate this worker"
                      >
                        <Star className="h-3.5 w-3.5" />
                        <span>Rate Worker</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revision Request Modal */}
      {selectedSubmissionForRevision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-2xl border border-neutral-100 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-extrabold text-neutral-900">Request Revision</h3>
              </div>
              <button
                onClick={() => setSelectedSubmissionForRevision(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRevisionRequest} className="p-6 space-y-4">
              <p className="text-xs text-neutral-600 leading-relaxed">
                Explain what needs to be fixed or modified by the worker (e.g. invalid screenshot, missing user ID, or incomplete step).
              </p>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Revision Note / Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  placeholder="e.g. The screenshot is blurry. Please upload a clear screenshot showing your completed order number."
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden bg-neutral-50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubmissionForRevision(null)}
                  className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRevision || !revisionFeedback.trim()}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRevision ? 'Sending...' : 'Send Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cryptomus Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-2xl border border-neutral-100 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900">Deposit Wallet Funds</h3>
                  <p className="text-[11px] text-neutral-400 font-medium">Powered by Cryptomus Gateway</p>
                </div>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Preset Amounts */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Select Amount (USD)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {['10', '25', '50', '100'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDepositAmount(preset)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        depositAmount === preset
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400 font-bold text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Custom Amount"
                    className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-900 bg-neutral-50/50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Supported Payment Options Badge */}
              <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-100 space-y-2">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  Supported Payment Options:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-white border border-neutral-200 px-2 py-0.5 rounded-lg text-neutral-700">
                    Bitcoin (BTC)
                  </span>
                  <span className="text-[10px] font-semibold bg-white border border-neutral-200 px-2 py-0.5 rounded-lg text-neutral-700">
                    USDT (TRC20/ERC20)
                  </span>
                  <span className="text-[10px] font-semibold bg-white border border-neutral-200 px-2 py-0.5 rounded-lg text-neutral-700">
                    Ethereum (ETH)
                  </span>
                  <span className="text-[10px] font-semibold bg-white border border-neutral-200 px-2 py-0.5 rounded-lg text-neutral-700">
                    Visa / MasterCard
                  </span>
                </div>
              </div>

              {/* Status Messages */}
              {depositError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3">
                  {depositError}
                </div>
              )}
              {depositSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 font-semibold">
                  {depositSuccess}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleInitiateDeposit}
                  disabled={isProcessingPayment}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-100 disabled:opacity-60 cursor-pointer"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing Order...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Proceed to Payment (${parseFloat(depositAmount || '0').toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

