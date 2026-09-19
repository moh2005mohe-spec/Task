import React, { useState } from 'react';
import { User } from '../types';
import { Auth } from './Auth';
import { Leaf, ArrowRight, CheckCircle2, TrendingUp, Search, Briefcase, FileText, Palette, Presentation, Video, Smartphone, Code, Globe, Shield } from 'lucide-react';

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
  const [authInitialMode, setAuthInitialMode] = useState<boolean>(true); // true = login, false = signup

  const categories = [
    { name: 'Digital Marketing', proposals: '518 proposals', icon: TrendingUp },
    { name: 'Digital Writing', proposals: '295 proposals', icon: FileText },
    { name: 'Graphic Design', proposals: '373 proposals', icon: Palette },
    { name: 'Presentation', proposals: '15 proposals', icon: Presentation },
    { name: 'Photo & Video', proposals: '223 proposals', icon: Video },
    { name: 'Mobile Apps', proposals: '56 proposals', icon: Smartphone },
    { name: 'Web Development', proposals: '152 proposals', icon: Code },
    { name: 'SEO', proposals: '70 proposals', icon: Search },
    { name: 'All Gigs', proposals: '27 categories', icon: Globe, highlight: true },
  ];

  return (
    <div className="min-h-screen bg-[#f0fdf4] text-neutral-900 font-sans flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Header Navbar */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowAuthModal(false)}>
            <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-200">
              <Leaf className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black tracking-tight text-neutral-900">
              Sprout<span className="text-emerald-600">Gigs</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-bold text-neutral-600">
            <button onClick={() => setShowAuthModal(false)} className="hover:text-emerald-600 transition-colors cursor-pointer">Explore Gigs</button>
            <button onClick={() => setShowAuthModal(false)} className="hover:text-emerald-600 transition-colors cursor-pointer">Referral Program</button>
          </nav>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setAuthInitialMode(true);
                setShowAuthModal(true);
              }}
              className="px-5 py-2.5 text-sm font-bold text-neutral-700 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={() => {
                setAuthInitialMode(false);
                setShowAuthModal(true);
              }}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 lg:pt-20 lg:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black text-neutral-900 tracking-tight leading-[1.1]">
                HIRE REAL PEOPLE <br />
                <span className="text-emerald-600">FOR ANY TASK</span>
              </h1>
              <p className="text-base sm:text-lg text-neutral-600 max-w-xl leading-relaxed font-medium">
                An online marketplace that instantly connects freelancers and business owners around the world with easy-to-do affordable digital tasks.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
              <button
                onClick={() => {
                  setAuthInitialMode(false);
                  setShowAuthModal(true);
                }}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-base shadow-xl shadow-emerald-200 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>CROWDSOURCE A MICRO JOB</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('categories-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-4 text-emerald-700 hover:text-emerald-800 font-bold text-sm text-center transition-colors cursor-pointer"
              >
                or browse gigs
              </button>
            </div>

            <div className="flex items-center space-x-3 text-xs text-neutral-500 pt-4 border-t border-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Access millions of freelancers worldwide to crowdsource micro jobs & gigs for your business.</span>
            </div>
          </div>

          {/* Right Visual Card Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-emerald-100 space-y-6 relative z-10">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                    <Leaf className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-neutral-900 text-sm">SproutGigs</span>
                </div>
                <div className="flex space-x-2 text-[11px] font-bold text-neutral-400">
                  <span>My Tasks</span>
                  <span className="text-emerald-600">Gigs</span>
                  <span>Wallet</span>
                </div>
              </div>

              <div className="space-y-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>DIGITAL MARKETING</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px]">TIKTOK</span>
                </div>
                <h3 className="font-extrabold text-neutral-900 text-sm">I will record a hilarious TikTok video for you</h3>
                <div className="flex items-center space-x-2 pt-1">
                  <div className="h-7 w-7 rounded-full bg-emerald-200 flex items-center justify-center font-bold text-xs text-emerald-800">
                    JD
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-neutral-800">Jim Jarmush</p>
                    <p className="text-[10px] text-amber-500 font-bold">★ 5.0 (1213 reviews)</p>
                  </div>
                </div>
              </div>

              {/* Floating Notifications */}
              <div className="bg-white p-3.5 rounded-2xl shadow-lg border border-neutral-100 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-xs font-bold text-neutral-800">You have 2 new job offers</span>
                </div>
                <button
                  onClick={() => {
                    setAuthInitialMode(true);
                    setShowAuthModal(true);
                  }}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  Go to my jobs
                </button>
              </div>
            </div>

            {/* Decorative backdrop glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-200 to-teal-100 rounded-3xl blur-2xl opacity-50 -z-10"></div>
          </div>
        </div>

        {/* Browse Gig Categories Section */}
        <div id="categories-section" className="bg-white py-20 border-t border-emerald-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
                Browse Gig Categories
              </h2>
              <p className="text-sm text-neutral-500 mt-2">
                Explore popular categories and verified task proposals from skilled workers worldwide.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat, idx) => {
                const IconComp = cat.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setAuthInitialMode(false);
                      setShowAuthModal(true);
                    }}
                    className={`p-6 rounded-2xl border transition-all cursor-pointer flex items-center space-x-4 group ${
                      cat.highlight
                        ? 'bg-amber-50/60 border-amber-200 hover:bg-amber-100/60'
                        : 'bg-neutral-50/50 border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50/30 shadow-2xs'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                      cat.highlight ? 'bg-amber-200 text-amber-800' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      <IconComp className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-neutral-900 text-base group-hover:text-emerald-700 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs font-medium text-neutral-500 mt-0.5">
                        {cat.proposals}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-10 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
              <Leaf className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-white text-sm">SproutGigs</span>
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
