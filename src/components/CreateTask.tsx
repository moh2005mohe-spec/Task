import React, { useState, useEffect, useMemo } from 'react';
import { Task, User, ZONES, CATEGORIES } from '../types';
import { CONTINENTS } from '../data/countries';
import { saveTask, updateUserBalance } from '../lib/supabase';
import { ChevronLeft, Info, Calculator, ShieldCheck, Globe, ClipboardList } from 'lucide-react';

interface CreateTaskProps {
  user: User;
  onSuccess: (updatedUser: User) => void;
  onCancel: () => void;
}

export const CreateTask: React.FC<CreateTaskProps> = ({ user, onSuccess, onCancel }) => {
  const [title, setTitle] = useState('');
  
  // Zone selection
  const [selectedZoneId, setSelectedZoneId] = useState(ZONES[0].id);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  // Category selection
  const [selectedCategoryId, setSelectedCategoryId] = useState(CATEGORIES[0].id);

  // Campaign settings
  const [duration, setDuration] = useState('3 Days');
  const [workersNeeded, setWorkersNeeded] = useState(20);
  const [workerPay, setWorkerPay] = useState(0.05);

  // Instructions
  const [instructions, setInstructions] = useState('');
  const [requireProof, setRequireProof] = useState(true);

  // Calculated values
  const [minPayRequired, setMinPayRequired] = useState(0.05);
  const [subtotal, setSubtotal] = useState(1.00);
  const [platformFee, setPlatformFee] = useState(0.10); // 10% fee
  const [totalCost, setTotalCost] = useState(1.10);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentZone = ZONES.find(z => z.id === selectedZoneId) || ZONES[0];
  const currentCategory = CATEGORIES.find(c => c.id === selectedCategoryId) || CATEGORIES[0];

  // Recalculate minimum pay and campaign costs when selections change
  useEffect(() => {
    // Minimum execution price cannot be less than the category's price AND the selected zone's price
    const categoryMin = currentCategory.minPrice;
    const zoneMin = currentZone.minPrice;
    const absoluteMin = Math.max(categoryMin, zoneMin);

    setMinPayRequired(absoluteMin);

    // If current worker pay is lower than absolute minimum, update it
    if (workerPay < absoluteMin) {
      setWorkerPay(parseFloat(absoluteMin.toFixed(2)));
    }
  }, [selectedZoneId, selectedCategoryId]);

  useEffect(() => {
    const calcSubtotal = workerPay * workersNeeded;
    const calcFee = calcSubtotal * 0.10; // 10% service charge
    setSubtotal(parseFloat(calcSubtotal.toFixed(2)));
    setPlatformFee(parseFloat(calcFee.toFixed(2)));
    setTotalCost(parseFloat((calcSubtotal + calcFee).toFixed(2)));
  }, [workerPay, workersNeeded]);

  const handleZoneChange = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setSelectedCountries([]); // Reset countries on zone change
  };

  const isAllSelected = useMemo(() => {
    const continent = ZONES.find(z => z.id === selectedZoneId)?.continent;
    if (continent === 'All') return selectedCountries.length === Object.values(CONTINENTS).flat().length;
    if (continent) return selectedCountries.length === (CONTINENTS[continent]?.length || 0);
    return false;
  }, [selectedCountries, selectedZoneId]);

  const handleToggleCountry = (country: string) => {
    setSelectedCountries(prev => 
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
  };

  const handleToggleAll = () => {
    const continent = ZONES.find(z => z.id === selectedZoneId)?.continent;
    if (!continent) return;
    
    let allCountries: string[] = [];
    if (continent === 'All') {
      allCountries = Object.values(CONTINENTS).flat();
    } else {
      allCountries = CONTINENTS[continent] || [];
    }

    if (isAllSelected) {
      setSelectedCountries([]);
    } else {
      setSelectedCountries(allCountries);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a descriptive campaign title.');
      return;
    }

    if (workersNeeded < 20) {
      setError('The minimum number of workers is strictly 20.');
      return;
    }

    if (workerPay < minPayRequired) {
      setError(`Minimum worker pay for this combination of zone and category is $${minPayRequired.toFixed(2)}.`);
      return;
    }

    if (!instructions.trim()) {
      setError('Please provide clear campaign instructions for workers.');
      return;
    }

    if (user.balance < totalCost) {
      setError(`Insufficient balance. This campaign costs $${totalCost.toFixed(2)}, but you only have $${user.balance.toFixed(2)}.`);
      return;
    }

    setSubmitting(true);

    try {
      const newTask: Task = {
        id: 'task-' + Math.random().toString(36).substr(2, 9),
        title: title.trim(),
        zone: currentZone.name,
        countries: selectedCountries,
        category: currentCategory.name,
        duration: duration,
        workers_needed: workersNeeded,
        worker_pay: workerPay,
        total_cost: totalCost,
        instructions: instructions.trim(),
        require_proof: requireProof,
        status: 'pending_review',
        created_by: user.id,
        created_at: new Date().toISOString()
      };

      // Deduct campaign cost from balance
      const newBalance = user.balance - totalCost;
      await updateUserBalance(user.id, newBalance);

      // Save campaign to Database
      await saveTask(newTask);

      // Trigger success callback
      onSuccess({
        ...user,
        balance: newBalance
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8" id="create-task-view">
      {/* Header breadcrumb */}
      <div className="mb-6">
        <button
          onClick={onCancel}
          className="inline-flex items-center text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-all cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main form column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-xs p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Create New Micro-Task Campaign</h2>
              <p className="text-xs text-neutral-500 mt-1">Fill out the requirements below to launch a reviewing campaign for our worker community.</p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl p-4 flex items-start space-x-2.5">
                <Info className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Subscribe to my YouTube channel and drop a comment"
                  className="block w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-neutral-50/50"
                />
                <p className="text-[11px] text-neutral-400 mt-1.5 font-medium">Use a concise and clear instruction title that summary what needs to be done.</p>
              </div>

              {/* Step 1: Target Zones */}
              <div className="border-t border-neutral-100 pt-5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3 flex items-center">
                  <Globe className="h-4 w-4 text-indigo-500 mr-1.5" />
                  Target Zone & Countries
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ZONES.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => handleZoneChange(zone.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                        selectedZoneId === zone.id
                          ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-600/10'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs text-neutral-900">{zone.name.split(' (')[0]}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{zone.name.includes('(') ? zone.name.substring(zone.name.indexOf('(')) : ''}</p>
                      </div>
                      <span className="inline-flex mt-2.5 items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 w-fit">
                        Min Pay: ${zone.minPrice.toFixed(2)} / task
                      </span>
                    </button>
                  ))}
                </div>

                {/* Specific country togglers */}
                {currentZone.id !== 'international' && (
                  <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-neutral-700">Target Specific Countries:</span>
                      <button
                        type="button"
                        onClick={handleToggleAll}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          isAllSelected
                            ? 'bg-indigo-600 text-white border-transparent'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        {isAllSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
                      {(CONTINENTS[currentZone.continent] || []).map((country) => {
                        const isSelected = selectedCountries.includes(country);
                        return (
                          <button
                            key={country}
                            type="button"
                            onClick={() => handleToggleCountry(country)}
                            className={`p-2 rounded-lg border text-left text-[10px] font-medium transition-all cursor-pointer truncate ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                                : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-600'
                            }`}
                          >
                            <span className="mr-1.5">{isSelected ? '✓' : '○'}</span>
                            {country}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Task Category */}
              <div className="border-t border-neutral-100 pt-5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3 flex items-center">
                  <ClipboardList className="h-4 w-4 text-indigo-500 mr-1.5" />
                  Task Category
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        selectedCategoryId === category.id
                          ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-600/50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <span className="font-bold text-xs text-neutral-800 truncate max-w-[170px]">{category.name}</span>
                      <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg whitespace-nowrap">
                        ${category.minPrice.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Campaign Parameters */}
              <div className="border-t border-neutral-100 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Campaign Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-neutral-50/50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option>24 Hours</option>
                    <option>3 Days</option>
                    <option>7 Days</option>
                    <option>14 Days</option>
                    <option>30 Days</option>
                  </select>
                </div>

                {/* Worker pay */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Pay Per Worker
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 font-bold font-mono text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min={minPayRequired}
                      required
                      value={workerPay}
                      onChange={(e) => setWorkerPay(parseFloat(e.target.value) || 0)}
                      className="block w-full pl-7 pr-3 py-2.5 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-neutral-50/50 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-indigo-600 mt-1.5 font-bold">Min required: ${minPayRequired.toFixed(2)}</p>
                </div>

                {/* Workers needed */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Workers Required
                  </label>
                  <input
                    type="number"
                    min="20"
                    required
                    value={workersNeeded}
                    onChange={(e) => setWorkersNeeded(Math.max(20, parseInt(e.target.value) || 20))}
                    className="block w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-neutral-50/50 font-mono"
                  />
                  <p className="text-[10px] text-rose-500 mt-1.5 font-bold">Minimum 20 (Fixed constraint)</p>
                </div>
              </div>

              {/* Step 4: Campaign Instructions */}
              <div className="border-t border-neutral-100 pt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Task Instructions
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Provide step-by-step instructions for the worker to complete. For example:&#10;1. Visit the YouTube link: www.youtube.com/...&#10;2. Subscribe to the channel.&#10;3. Submit screenshot showing your subscription."
                    className="block w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-neutral-50/50 leading-relaxed"
                  />
                </div>

                {/* Require Screenshot Switcher */}
                <div className="bg-indigo-50/30 rounded-xl p-4 border border-indigo-100 flex items-center justify-between">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-neutral-800">Require Screenshot Confirmation Proof</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">When toggled ON, workers will have the ability to upload an image or screenshot confirming task completion.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireProof(!requireProof)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      requireProof ? 'bg-indigo-600' : 'bg-neutral-200'
                    }`}
                  >
                    <span className="sr-only">Require screenshot proof</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        requireProof ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Submit trigger */}
              <div className="border-t border-neutral-100 pt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  id="btn-submit-campaign"
                >
                  {submitting ? (
                    <span className="border-2 border-white border-t-transparent rounded-full h-4 w-4 animate-spin"></span>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Submit Campaign for Review & Deduct Balance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Calculator Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 space-y-6 sticky top-24">
            <h3 className="text-lg font-bold text-neutral-900 flex items-center">
              <Calculator className="h-5 w-5 text-indigo-600 mr-2" />
              Campaign Cost Estimator
            </h3>

            {/* Campaign Selection Details */}
            <div className="space-y-3.5 bg-neutral-50 p-4 rounded-xl text-xs text-neutral-600">
              <div className="flex justify-between">
                <span className="font-medium text-neutral-500">Selected Zone</span>
                <span className="font-semibold text-neutral-800">{currentZone.name.split(' (')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-500">Zone Min Price</span>
                <span className="font-semibold font-mono text-neutral-800">${currentZone.minPrice.toFixed(2)}</span>
              </div>
              <hr className="border-neutral-200" />
              <div className="flex justify-between">
                <span className="font-medium text-neutral-500">Selected Category</span>
                <span className="font-semibold text-neutral-800">{currentCategory.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-500">Category Min Price</span>
                <span className="font-semibold font-mono text-neutral-800">${currentCategory.minPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Mathematical cost breakdown */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 font-medium">Workers Ordered</span>
                <span className="font-bold text-neutral-900 font-mono">{workersNeeded} workers</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 font-medium">Payout Rate</span>
                <span className="font-bold text-indigo-600 font-mono">${workerPay.toFixed(2)} each</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 font-medium">Campaign Subtotal</span>
                <span className="font-bold text-neutral-900 font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 font-medium flex items-center">
                  Service Fee (10%)
                  <span title="10% platform service & review fee" className="cursor-help flex items-center">
                    <Info className="h-3 w-3 text-neutral-400 ml-1" />
                  </span>
                </span>
                <span className="font-bold text-neutral-900 font-mono">${platformFee.toFixed(2)}</span>
              </div>

              <hr className="border-neutral-100 my-4" />

              <div className="flex justify-between items-center bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                <span className="text-sm font-bold text-neutral-800">Total Campaign Cost</span>
                <div className="text-right">
                  <span className="text-xl font-black text-indigo-700 font-mono">${totalCost.toFixed(2)}</span>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Deducted immediately</p>
                </div>
              </div>
            </div>

            {/* Advertiser balance info */}
            <div className="bg-neutral-50 border border-neutral-200/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-neutral-500">Your Current Balance</span>
                <span className="font-bold font-mono text-neutral-800">${user.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-medium text-neutral-500">Remaining After Submission</span>
                <span className={`font-bold font-mono ${user.balance - totalCost >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  ${(user.balance - totalCost).toFixed(2)}
                </span>
              </div>
              {user.balance - totalCost < 0 && (
                <div className="text-[11px] text-rose-500 font-bold bg-rose-50 p-2 rounded-lg mt-2 text-center">
                  ⚠️ Insufficient balance to submit this campaign. Add mock funds on your dashboard.
                </div>
              )}
            </div>

            {/* Campaign verification policy */}
            <div className="text-[11px] text-neutral-400 leading-relaxed flex items-start space-x-1.5 pt-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Campaign Review Policy:</strong> All submitted campaigns are sent directly to the Admin Review queue. Campaigns will be verified and approved or rejected within 24 hours. Rejected campaigns are fully refunded.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
