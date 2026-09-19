import React, { useState, useEffect } from 'react';
import { Task, User, Submission } from '../types';
import { getTasks, saveSubmission, getSubmissions, updateUserBalance } from '../lib/supabase';
import { Briefcase, Coins, FileCheck, HelpCircle, ImageIcon, Send, X, AlertCircle, Sparkles } from 'lucide-react';

interface WorkerDashboardProps {
  user: User;
  onBalanceUpdate: (updatedUser: User) => void;
  onSelectTask?: (task: Task) => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ user, onBalanceUpdate, onSelectTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workerSubmissions, setWorkerSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Active submission modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proofText, setProofText] = useState('');
  const [proofImageBase64, setProofImageBase64] = useState<string>('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const allTasks = await getTasks();
      // Only display approved live tasks
      const liveTasks = allTasks.filter(t => t.status === 'approved');
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
    // Find existing submission if any (e.g., revision requested)
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
      const newSubmission: Submission = {
        id: 'sub-' + Math.random().toString(36).substr(2, 9),
        task_id: selectedTask.id,
        worker_email: user.email,
        proof_text: proofText.trim(),
        proof_image: proofImageBase64 || undefined,
        status: 'pending',
        submitted_at: new Date().toISOString()
      };

      await saveSubmission(newSubmission);

      // Close modal & refresh data
      setSelectedTask(null);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit proof.');
    } finally {
      setSubmittingProof(false);
    }
  };

  // Check if worker has already submitted proof for a specific task
  const hasSubmitted = (taskId: string) => {
    return workerSubmissions.some(s => s.task_id === taskId);
  };

  const getMySubmissionStatus = (taskId: string) => {
    const found = workerSubmissions.find(s => s.task_id === taskId);
    return found ? found.status : null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8" id="worker-dashboard">
      {/* Top Welcome Card */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Worker Dashboard</h1>
          <p className="text-xs text-neutral-500 mt-1">Browse available jobs, complete simple micro-tasks, and earn real USD directly into your balance.</p>
        </div>
        <div className="flex items-center space-x-2.5 bg-emerald-50 text-emerald-800 px-4 py-2.5 rounded-xl font-bold text-sm shadow-2xs">
          <Coins className="h-4.5 w-4.5 text-emerald-600" />
          <span>Earnings Balance: ${user.balance.toFixed(2)} USD</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Tasks List column */}
        <div className="lg:col-span-2 space-y-5">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center">
            <Briefcase className="h-5 w-5 text-indigo-600 mr-2" />
            Available Micro-Jobs
          </h2>

          {loading ? (
            <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center shadow-2xs">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2"></div>
              <p className="text-xs text-neutral-500 font-medium">Loading available micro-jobs...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center shadow-2xs space-y-3">
              <div className="bg-neutral-50 rounded-full p-4 w-fit mx-auto text-neutral-400">
                <Briefcase className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-neutral-800">No jobs available right now</h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Check back soon! When advertisers launch new approved campaigns, they will show up here immediately for you to complete.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const isCompleted = hasSubmitted(task.id);
                const subStatus = getMySubmissionStatus(task.id);

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all hover:shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                      isCompleted ? 'border-neutral-100 bg-neutral-50/20' : 'border-neutral-100'
                    }`}
                  >
                    <div className="space-y-3 max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {task.category}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-600">
                          Region: {task.zone.split(' (')[0]}
                        </span>
                        {task.require_proof && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                            Screenshot Proof Required
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-neutral-900">{task.title}</h3>
                        <div className="mt-2 p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs text-neutral-600 whitespace-pre-line leading-relaxed">
                          <p className="font-bold text-neutral-700 mb-1">Instructions:</p>
                          {task.instructions}
                        </div>
                      </div>

                      <div className="text-[10px] text-neutral-400 font-medium">
                        Targeting: <span className="font-semibold text-neutral-500">{task.countries.join(', ')}</span>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4 shrink-0 border-t md:border-t-0 border-neutral-100 pt-3 md:pt-0">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Worker Payout</span>
                        <span className="text-xl font-black text-emerald-600 font-mono">${task.worker_pay.toFixed(2)}</span>
                      </div>

                      {/* Action buttons */}
                      {isCompleted && subStatus !== 'revision_requested' ? (
                        <div className="text-right">
                          {subStatus === 'pending' && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Review Pending
                            </span>
                          )}
                          {subStatus === 'approved' && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Earned & Paid
                            </span>
                          )}
                          {subStatus === 'rejected' && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Declined / Rejected
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (onSelectTask) {
                              onSelectTask(task);
                            } else {
                              handleOpenSubmission(task);
                            }
                          }}
                          className={`px-4 py-2.5 font-bold text-xs rounded-xl flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-sm ${
                            subStatus === 'revision_requested'
                              ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>
                            {subStatus === 'revision_requested'
                              ? 'Fix & Resubmit Proof'
                              : 'Complete Task & Submit Proof'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Worker History Log sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4 shadow-2xs">
            <h3 className="text-lg font-bold text-neutral-900 flex items-center">
              <FileCheck className="h-5 w-5 text-indigo-600 mr-2" />
              Your Completion Logs
            </h3>

            {workerSubmissions.length === 0 ? (
              <p className="text-xs text-neutral-400 leading-relaxed text-center py-6">
                You haven't submitted any jobs yet. Browse available jobs on the left to start earning.
              </p>
            ) : (
              <div className="space-y-3.5">
                {workerSubmissions.map((sub) => {
                  const matchedTask = tasks.find(t => t.id === sub.task_id);
                  return (
                    <div key={sub.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-neutral-700 truncate max-w-[120px]">
                          {matchedTask ? matchedTask.title : 'Task Completion'}
                        </span>
                        {sub.status === 'pending' && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Pending</span>
                        )}
                        {sub.status === 'approved' && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Approved</span>
                        )}
                        {sub.status === 'rejected' && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">Rejected</span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400">{new Date(sub.submitted_at).toLocaleDateString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submission Proof Modal */}
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
              {/* Revision Request Notice if applicable */}
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
                      <p className="text-[10px] text-amber-600 font-semibold mt-1">
                        Please make the required changes below and submit updated proof.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Task Reminder */}
              <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-100">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Target Task Title</span>
                <p className="text-xs font-bold text-neutral-800">{selectedTask.title}</p>
                <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-neutral-200/50">
                  <span className="text-[10px] text-neutral-500 font-medium">Estimated Reward:</span>
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

              {/* Screenshot Proof File Selection */}
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
    </div>
  );
};
