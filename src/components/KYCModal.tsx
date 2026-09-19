import React, { useState } from 'react';
import { User, KYCVerification } from '../types';
import { saveKYCVerification } from '../lib/supabase';
import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Clock, Camera, Globe, X, ArrowRight } from 'lucide-react';
import { CONTINENTS } from '../data/countries';

interface KYCModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: (updatedUser: User) => void;
}

export const KYCModal: React.FC<KYCModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
  const allCountriesList = Array.from(new Set(Object.values(CONTINENTS).flat())).sort();

  const [country, setCountry] = useState(user.kyc_country || allCountriesList[0] || 'Egypt');
  const [frontImage, setFrontImage] = useState<string>('');
  const [backImage, setBackImage] = useState<string>('');
  const [selfieImage, setSelfieImage] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setError('Selected image is too large. Please upload an image under 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!country) {
      setError('Please select your country of residence.');
      return;
    }

    if (!frontImage) {
      setError('Please upload the FRONT side of your National ID / Passport.');
      return;
    }

    if (!backImage) {
      setError('Please upload the BACK side of your National ID.');
      return;
    }

    if (!selfieImage) {
      setError('Please upload a SELFIE of yourself holding your National ID.');
      return;
    }

    setSubmitting(true);
    try {
      const kycRecord: KYCVerification = {
        id: 'kyc-' + Math.random().toString(36).substr(2, 9),
        user_id: user.id,
        user_email: user.email,
        country: country,
        front_image: frontImage,
        back_image: backImage,
        selfie_image: selfieImage,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      await saveKYCVerification(kycRecord);

      const updatedUser: User = {
        ...user,
        kyc_status: 'pending',
        kyc_country: country
      };

      onSuccess(updatedUser);
      onClose();
    } catch (err: any) {
      console.error('KYC submission error', err);
      setError(err?.message || 'Failed to submit KYC verification request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-neutral-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-neutral-700 bg-neutral-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title Header */}
        <div className="flex items-center space-x-3 border-b border-neutral-100 pb-4">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-neutral-900">Identity Verification (KYC) / توثيق الحساب</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Verify your country and identity to access geotargeted high-paying micro-jobs.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Country Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center">
              <Globe className="h-4 w-4 text-indigo-600 mr-1.5" />
              1. Select Country of Residence / اختر دولتك
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {allCountriesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-400">
              * Note: Your tasks will be filtered based on advertisers targeting your verified country.
            </p>
          </div>

          {/* Step 2: Upload Documents Grid */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              2. Capture & Upload Identity Proofs / رفع بطاقة الهوية
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Front of ID */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-neutral-600 block">ID Front / الأمام</span>
                <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-3 text-center bg-neutral-50 hover:bg-neutral-100 transition-all relative cursor-pointer min-h-[140px] flex flex-col items-center justify-center">
                  {frontImage ? (
                    <div className="relative w-full h-28 rounded-xl overflow-hidden">
                      <img src={frontImage} alt="ID Front" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFrontImage('')}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full text-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center space-y-1">
                      <Camera className="h-6 w-6 text-indigo-600 mb-1" />
                      <span className="text-xs font-bold text-neutral-700">Upload Front</span>
                      <span className="text-[10px] text-neutral-400">Front side of card</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setFrontImage)}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Back of ID */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-neutral-600 block">ID Back / الخلف</span>
                <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-3 text-center bg-neutral-50 hover:bg-neutral-100 transition-all relative cursor-pointer min-h-[140px] flex flex-col items-center justify-center">
                  {backImage ? (
                    <div className="relative w-full h-28 rounded-xl overflow-hidden">
                      <img src={backImage} alt="ID Back" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setBackImage('')}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full text-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center space-y-1">
                      <Camera className="h-6 w-6 text-indigo-600 mb-1" />
                      <span className="text-xs font-bold text-neutral-700">Upload Back</span>
                      <span className="text-[10px] text-neutral-400">Back side of card</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setBackImage)}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Selfie holding ID */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-neutral-600 block">Selfie with ID / صورة شخصية</span>
                <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-3 text-center bg-neutral-50 hover:bg-neutral-100 transition-all relative cursor-pointer min-h-[140px] flex flex-col items-center justify-center">
                  {selfieImage ? (
                    <div className="relative w-full h-28 rounded-xl overflow-hidden">
                      <img src={selfieImage} alt="Selfie holding ID" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSelfieImage('')}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full text-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center space-y-1">
                      <Camera className="h-6 w-6 text-indigo-600 mb-1" />
                      <span className="text-xs font-bold text-neutral-700">Selfie holding ID</span>
                      <span className="text-[10px] text-neutral-400">Photo with card</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setSelfieImage)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <span>Submit KYC for Admin Review</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
