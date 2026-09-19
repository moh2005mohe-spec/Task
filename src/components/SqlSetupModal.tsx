import React, { useState } from 'react';
import { SETUP_SQL } from '../lib/supabase';
import { Database, Check, Copy, X, Terminal, HelpCircle } from 'lucide-react';

interface SqlSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlSetupModal: React.FC<SqlSetupModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="sql-modal-overlay">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-neutral-100 animate-slide-up" id="sql-modal-container">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-emerald-50">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 text-white p-2 rounded-xl flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Configure Supabase Database</h3>
              <p className="text-xs text-emerald-700 font-medium">Follow these steps to unlock persistent cloud storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm leading-relaxed text-neutral-600">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
            <HelpCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 text-sm">Why see this?</h4>
              <p className="text-xs text-amber-800 mt-1">
                The application connects to your Supabase project but didn't find the necessary tables.
                We have enabled a seamless <strong>LocalStorage Fallback</strong> so everything is immediately functional!
                To make the app persistent across different machines and users, follow the steps below.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-neutral-800 text-sm flex items-center">
              <span className="flex items-center justify-center bg-emerald-100 text-emerald-800 rounded-full h-5 w-5 text-xs mr-2 font-mono">1</span>
              Open Supabase SQL Editor
            </h4>
            <p className="text-xs pl-7 text-neutral-500">
              Go to your Supabase Dashboard at{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 font-medium hover:underline inline-flex items-center"
              >
                supabase.com/dashboard
              </a>
              , select your project, and click on the <strong>SQL Editor</strong> icon in the sidebar.
            </p>

            <h4 className="font-bold text-neutral-800 text-sm flex items-center pt-2">
              <span className="flex items-center justify-center bg-emerald-100 text-emerald-800 rounded-full h-5 w-5 text-xs mr-2 font-mono">2</span>
              Paste the SQL Schema & Run
            </h4>
            <p className="text-xs pl-7 text-neutral-500">
              Click <strong>"New query"</strong>, paste the complete SQL script below, and click <strong>"Run"</strong>.
              This will safely build the custom user tables, campaigns, and submissions!
            </p>
          </div>

          {/* SQL Editor Block */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-900 font-mono text-xs">
            <div className="flex justify-between items-center bg-neutral-800 px-4 py-2 border-b border-neutral-700">
              <div className="flex items-center space-x-2 text-neutral-400">
                <Terminal className="h-4 w-4" />
                <span className="font-medium text-neutral-300">schema.sql</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-semibold transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-[11px]">Copy Script</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-neutral-300 max-h-[250px] leading-relaxed">
              <code>{SETUP_SQL}</code>
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-all cursor-pointer text-sm"
          >
            I understand, Continue
          </button>
        </div>
      </div>
    </div>
  );
};
