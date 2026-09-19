import React, { useState, useEffect } from 'react';
import { Task, User, Submission } from '../types';
import { saveSubmission, getSubmissions } from '../lib/supabase';
import { ArrowLeft, Clock, DollarSign, Globe, FileText, Upload, CheckCircle2, AlertCircle, ImageIcon, X, Send, ShieldCheck, ListChecks, ShieldAlert } from 'lucide-react';

interface TaskExecutionPageProps {
  task: Task;
  user: User;
  workerSubmission?: Submission;
  onBack: () => void;
  onSuccess: () => void;
}

export const TaskExecutionPage: React.FC<TaskExecutionPageProps> = ({
  task,
  user,
  workerSubmission,
  onBack,
  onSuccess
}) => {
  const [activeSubmission, setActiveSubmission] = useState<Submission | undefined>(workerSubmission);
  const [proofText, setProofText] = useState(workerSubmission?.proof_text || '');
  const [proofImageBase64, setProofImageBase64] = useState<string>(workerSubmission?.proof_image || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const allSubs = await getSubmissions();
        const mySub = allSubs.find(
          s => s.task_id === task.id && s.worker_email.toLowerCase() === user.email.toLowerCase()
        );
        if (mySub) {
          setActiveSubmission(mySub);
          if (!proofText) setProofText(mySub.proof_text || '');
          if (!proofImageBase64) setProofImageBase64(mySub.proof_image || '');
        }
      } catch (err) {
        console.error('Failed to load existing submission in TaskExecutionPage', err);
      }
    };
    fetchExisting();
  }, [task.id, user.email]);

  const isRevision = activeSubmission?.status === 'revision_requested';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImageBase64(reader.result as string);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict KYC verification enforcement: worker must have approved KYC
    if (user.kyc_status !== 'approved') {
      setErrorMsg('Access Denied: You must complete KYC verification and receive approval before you can submit or execute tasks.');
      return;
    }

    if (!proofText.trim()) {
      setErrorMsg('Please enter your written proof or submission notes.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const newSubmission: Submission = {
        id: activeSubmission?.id || workerSubmission?.id || 'sub_' + Math.random().toString(36).substr(2, 9),
        task_id: task.id,
        worker_email: user.email,
        proof_text: proofText.trim(),
        proof_image: proofImageBase64 || undefined,
        status: 'pending',
        feedback: undefined,
        submitted_at: new Date().toISOString()
      };

      await saveSubmission(newSubmission);
      setSuccessMsg('Proof submitted successfully! The advertiser will review your submission shortly.');

      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      console.error('Failed submitting proof', err);
      setErrorMsg(err.message || 'Failed submitting task proof. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8" id="task-execution-page">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 px-3.5 py-2 rounded-xl transition-all hover:bg-neutral-50 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Available Tasks
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
          Task Execution Mode
        </span>
      </div>

      {/* Revision Request Banner if applicable */}
      {isRevision && (activeSubmission?.feedback || workerSubmission?.feedback) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-amber-800 font-bold">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <span className="text-sm">Advertiser Requested Revision</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed font-medium bg-white/70 p-3 rounded-xl border border-amber-100 italic">
            "{activeSubmission?.feedback || workerSubmission?.feedback}"
          </p>
          <p className="text-[11px] text-amber-700 font-semibold">
            Please make the requested adjustments below and click "Resubmit Updated Proof".
          </p>
        </div>
      )}

      {/* Main Task Card Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                {task.category}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 flex items-center">
                <Globe className="h-3 w-3 mr-1" />
                {task.countries && task.countries.length > 0 ? task.countries.join(', ') : task.zone || 'Global'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-snug">
              {task.title}
            </h1>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-right shrink-0">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Worker Reward</span>
            <span className="text-3xl font-black font-mono text-emerald-800">${task.worker_pay.toFixed(2)} <span className="text-xs font-sans font-bold text-emerald-600">USD</span></span>
          </div>
        </div>

        {/* Task Details Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Campaign Budget</span>
            <span className="text-xs font-bold text-neutral-800 flex items-center mt-1 font-mono">
              <DollarSign className="h-3.5 w-3.5 mr-0.5 text-emerald-500" />
              ${task.total_cost.toFixed(2)} USD
            </span>
          </div>

          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Target Workers</span>
            <span className="text-xs font-bold text-neutral-800 mt-1 block">
              {task.workers_needed} Total Openings
            </span>
          </div>
        </div>

        {/* Step-by-Step Task Instructions */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center">
            <ListChecks className="h-4 w-4 text-emerald-600 mr-2" />
            Task Instructions & Requirements
          </h2>

          <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100 text-sm text-neutral-700 leading-relaxed space-y-3">
            <p className="whitespace-pre-line font-medium text-neutral-800">{task.instructions}</p>
          </div>
        </div>

        {/* Required Proof Format */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center">
            <ShieldCheck className="h-4 w-4 text-emerald-600 mr-2" />
            Required Proof Format
          </h2>

          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
            <p className="font-bold text-emerald-950 flex items-center">
              <FileText className="h-4 w-4 mr-1.5 text-emerald-600" />
              Proof Instructions from Advertiser:
            </p>
            <p className="font-medium text-emerald-800 leading-relaxed pl-5">
              {task.require_proof
                ? 'Written proof (ID, Username, or URL) and optional screenshot attachment required.'
                : 'Provide text confirmation of completed task.'}
            </p>
          </div>
        </div>
      </div>

      {/* Submission Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-100 shadow-sm space-y-6">
        <h2 className="text-base font-extrabold text-neutral-900 flex items-center">
          <Send className="h-5 w-5 text-emerald-600 mr-2.5" />
          Submit Task Completion Proof
        </h2>

        {user.kyc_status !== 'approved' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5" id="execution-kyc-guard-alert">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-amber-950 text-sm">KYC Verification Required</h4>
              <p className="text-amber-800 leading-relaxed">
                You cannot execute tasks or submit completion proofs until your KYC verification is submitted and approved by administration. Please visit your profile to verify your identity.
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl p-4 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl p-4 flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitProof} className="space-y-6">
          {/* Written Proof Input */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Written Proof / Text Confirmation <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="Enter your username, transaction ID, email, or details as requested in task instructions..."
              className="w-full px-4 py-3 border border-neutral-200 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-neutral-50/50"
            />
          </div>

          {/* Screenshot / Image Upload Input */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Upload Proof Screenshot (Optional / Recommended)
            </label>

            {proofImageBase64 ? (
              <div className="relative inline-block border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-900 max-w-sm group">
                <img
                  src={proofImageBase64}
                  alt="Task Proof Screenshot"
                  className="max-h-56 w-auto object-contain mx-auto"
                />
                <button
                  type="button"
                  onClick={() => setProofImageBase64('')}
                  className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
                  title="Remove Image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-200 hover:border-emerald-400 rounded-2xl bg-neutral-50 hover:bg-emerald-50/20 transition-all cursor-pointer group">
                <div className="p-3 bg-white rounded-2xl shadow-2xs group-hover:scale-110 transition-transform text-emerald-600 mb-2">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-neutral-700 group-hover:text-emerald-600">
                  Click to upload proof screenshot
                </span>
                <span className="text-[10px] text-neutral-400 font-medium mt-1">
                  Supports PNG, JPG, WEBP (Max 5MB)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onBack}
              className="py-3 px-6 border border-neutral-200 rounded-2xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer text-center"
            >
              Cancel & Return
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!successMsg || user.kyc_status !== 'approved'}
              className={`flex-1 py-3 px-6 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center space-x-2 ${
                user.kyc_status !== 'approved'
                  ? 'bg-neutral-400 cursor-not-allowed opacity-60'
                  : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-md shadow-emerald-100 disabled:opacity-50'
              }`}
            >
              {user.kyc_status !== 'approved' ? (
                <>
                  <ShieldAlert className="h-4 w-4" />
                  <span>KYC Verification Required to Submit Proof</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? 'Submitting Proof...'
                      : isRevision
                      ? 'Resubmit Updated Proof'
                      : 'Submit Proof for Advertiser Review'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
