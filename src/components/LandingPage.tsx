import React, { useState } from 'react';
import { User } from '../types';
import { Auth } from './Auth';
import { CATEGORIES } from '../types';
import { CheckSquare, ArrowRight, CheckCircle2, TrendingUp, Search, Briefcase, FileText, Globe, Shield, Sparkles, Zap, Users, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
  onAuthSuccess: (user: User) => void;
  isDbConnected: boolean;
  isUsingFallback: boolean;
  onShowSqlModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onAuthSuccess,
  isDbConnected,
  isUsingFallback,
  onShowSqlModal
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header Navbar */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-50 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowAuthModal(false)}>
            <div className="h-11 w-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-neutral-900">
                Task<span className="text-indigo-600">Zone</span>
              </span>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Micro-Task Ecosystem</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-bold text-neutral-600">
            <a href="#categories-section" className="hover:text-indigo-600 transition-colors">Task Categories</a>
            <a href="#features-section" className="hover:text-indigo-600 transition-colors">Platform Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a>
          </nav>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-5 py-2.5 text-sm font-bold text-neutral-700 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 lg:pt-20 lg:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-full text-xs font-bold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>The Next-Generation Micro-Task Marketplace</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black text-neutral-900 tracking-tight leading-[1.1]">
                Connect, Complete & <br />
                <span className="text-indigo-600">Grow Your Business</span>
              </h1>
              <p className="text-base sm:text-lg text-neutral-600 max-w-xl leading-relaxed font-medium">
                TaskZone bridges advertisers launching high-impact campaigns with verified digital workers worldwide. Fast execution, secure escrow, and automated rewards.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-base shadow-xl shadow-indigo-200 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Launch Your Campaign</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('categories-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-4 text-indigo-700 hover:text-indigo-800 font-bold text-sm text-center transition-colors cursor-pointer"
              >
                Explore Categories ({CATEGORIES.length})
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-neutral-200">
              <div>
                <p className="text-2xl font-black text-neutral-900">100%</p>
                <p className="text-xs text-neutral-500 font-medium">Secure Escrow</p>
              </div>
              <div>
                <p className="text-2xl font-black text-neutral-900">15+</p>
                <p className="text-xs text-neutral-500 font-medium">Task Categories</p>
              </div>
              <div>
                <p className="text-2xl font-black text-neutral-900">24/7</p>
                <p className="text-xs text-neutral-500 font-medium">Verified Workers</p>
              </div>
            </div>
          </div>

          {/* Right Visual Card Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-neutral-100 space-y-6 relative z-10">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <CheckSquare className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-neutral-900 text-sm">TaskZone Dashboard</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Live Escrow</span>
              </div>

              <div className="space-y-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200/60">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                  <span>SOCIAL MEDIA ENGAGEMENT</span>
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md text-[10px]">$0.15 Reward</span>
                </div>
                <h3 className="font-extrabold text-neutral-900 text-sm">Subscribe to channel & watch latest tutorial</h3>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-neutral-500 font-medium">By Verified Advertiser</span>
                  <button onClick={() => setShowAuthModal(true)} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold">
                    Start Task
                  </button>
                </div>
              </div>

              <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-950">KYC Verified Geo-Targeting Active</span>
                </div>
                <span className="text-xs font-bold text-indigo-600">Protected</span>
              </div>
            </div>

            <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-200 to-purple-100 rounded-3xl blur-2xl opacity-45 -z-10"></div>
          </div>
        </div>

        {/* Categories Section using our actual CATEGORIES */}
        <div id="categories-section" className="bg-white py-20 border-t border-neutral-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
                Our Platform Task Categories
              </h2>
              <p className="text-sm text-neutral-500 mt-2">
                Choose from our proprietary catalog of 15+ specialized task categories designed for maximum engagement.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setShowAuthModal(true)}
                  className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all cursor-pointer group flex items-start justify-between shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-extrabold text-neutral-900 text-base group-hover:text-indigo-600 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs font-medium text-neutral-500 mt-1">
                        Minimum Pay: <strong className="text-neutral-900">${cat.minPrice.toFixed(2)}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-10 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <CheckSquare className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-white text-sm">TaskZone</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex space-x-6 font-medium">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-700 bg-neutral-100 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
            <Auth
              onAuthSuccess={onAuthSuccess}
              isDbConnected={isDbConnected}
              isUsingFallback={isUsingFallback}
              onShowSqlModal={onShowSqlModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};
