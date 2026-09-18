import React, { useState, useEffect } from 'react';
import { Task, User, Submission } from '../types';
import { getTasks, getSubmissions, updateUserBalance, updateSubmissionStatus } from '../lib/supabase';
import { PlusCircle, ListTodo, Wallet, BadgeAlert, AlertCircle, CheckCircle2, XCircle, Clock, Eye, Check, X, FileText, ImageIcon, UserCheck } from 'lucide-react';

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
  const [fundingAmount, setFundingAmount] = useState('50');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const allTasks = await getTasks();
      const userTasks = allTasks.filter(t => t.created_by === user.id);
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

  const handleAddMockFunds = async () => {
    const amount = parseFloat(fundingAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const newBalance = user.balance + amount;
      await updateUserBalance(user.id, newBalance);
      onBalanceUpdate({
        ...user,
        balance: newBalance
      });
      setSuccessMsg(`Successfully added $${amount.toFixed(2)} to your account!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to add mock funds', err);
    }
  };

  const handleReviewSubmission = async (submissionId: string, status: 'approved' | 'rejected') => {
    try {
      await updateSubmissionStatus(submissionId, status);
      // Reload submissions list
      const allSubmissions = await getSubmissions();
      const taskIds = campaigns.map(t => t.id);
      setSubmissions(allSubmissions.filter(s => taskIds.includes(s.task_id)));
    } catch (err) {
      console.error('Failed to update submission status', err);
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
            Completed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-100">
            Declined
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8" id="advertiser-dashboard">
      
      {/* Top Banner & Control Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Advertiser Workspace</h1>
          <p className="text-xs text-neutral-500 mt-1">Manage your campaigns, track submissions, and launch new targeted tasks.</p>
        </div>
        <button
          onClick={onOpenCreateTask}
          className="inline-flex items-center justify-center px-5 py-3 border border-transparent rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all cursor-pointer whitespace-nowrap"
          id="btn-trigger-create-task"
        >
          <PlusCircle className="h-4.5 w-4.5 mr-2" />
          Create New Campaign
        </button>
      </div>

      {/* Grid: Balance booster and Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Wallet / Mock Balance Booster Card */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs space-y-4">
          <div className="flex items-center space-x-3 text-neutral-900">
            <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Available Funds</p>
              <h3 className="text-2xl font-black font-mono text-neutral-900">${user.balance.toFixed(2)}</h3>
            </div>
          </div>

          <hr className="border-neutral-100" />

          <div className="space-y-3">
            <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Test Balance Booster
            </label>
            <div className="flex gap-2">
              <select
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                className="block w-2/3 px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-neutral-50/50 focus:outline-hidden"
              >
                <option value="10">Add $10.00 USD</option>
                <option value="25">Add $25.00 USD</option>
                <option value="50">Add $50.00 USD</option>
                <option value="100">Add $100.00 USD</option>
                <option value="250">Add $250.00 USD</option>
              </select>
              <button
                onClick={handleAddMockFunds}
                className="w-1/3 py-2 px-3 bg-neutral-950 text-white font-bold rounded-xl text-xs hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Boost
              </button>
            </div>
            {successMsg && (
              <p className="text-[10px] text-emerald-600 font-semibold text-center bg-emerald-50 py-1 px-2 rounded-lg">{successMsg}</p>
            )}
          </div>
        </div>

        {/* Campaign Metric */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Your Campaigns</p>
              <h3 className="text-3xl font-extrabold text-neutral-950 mt-1">{campaigns.length}</h3>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg">Total</span>
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
              <span className="w-2 h-2 rounded-full bg-indigo-500 mr-1.5"></span>
              {submissions.filter(s => s.status === 'approved').length} Approved
            </span>
          </div>
        </div>
      </div>

      {/* Campaigns list section */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center">
            <ListTodo className="h-5 w-5 text-indigo-600 mr-2" />
            Your Created Campaigns
          </h2>
          <button
            onClick={loadData}
            className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
          >
            Refresh List
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2"></div>
            <p className="text-xs text-neutral-500 font-medium">Fetching campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <div className="bg-indigo-50 rounded-full p-4 w-fit mx-auto text-indigo-600">
              <PlusCircle className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-neutral-800">No campaigns launched yet</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              You haven't launched any campaign. Launch your first targeted job campaign to get immediate high-quality worker executions from around the world!
            </p>
            <button
              onClick={onOpenCreateTask}
              className="mt-2 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
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
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {campaigns.map((task) => (
                  <tr key={task.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-neutral-800 line-clamp-1">{task.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg">
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
                    <td className="px-6 py-4 text-right font-bold font-mono text-indigo-600">
                      ${task.worker_pay.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold font-mono text-neutral-800">
                      ${task.total_cost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {getCampaignBadge(task.status)}
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
          <p className="text-xs text-neutral-400 mt-0.5">Approve or decline proofs submitted by workers on your live campaigns.</p>
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
              if (!matchedTask) return null;

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
                      Campaign: <span className="text-neutral-800 normal-case">{matchedTask.title}</span>
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
                    </div>
                  </div>

                  {/* Actions for pending submissions */}
                  {sub.status === 'pending' && (
                    <div className="flex sm:flex-col gap-2 shrink-0 sm:w-28">
                      <button
                        onClick={() => handleReviewSubmission(sub.id, 'approved')}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1 transition-all shadow-xs cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReviewSubmission(sub.id, 'rejected')}
                        className="flex-1 py-2 px-3 border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1 transition-all cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
