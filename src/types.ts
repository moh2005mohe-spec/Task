export interface User {
  id: string;
  email: string;
  balance: number;
  role: 'worker' | 'advertiser' | 'admin';
  password?: string;
  kyc_status?: 'unverified' | 'pending' | 'approved' | 'rejected';
  kyc_country?: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  zone: string;
  countries: string[];
  category: string;
  duration: string;
  workers_needed: number;
  worker_pay: number;
  total_cost: number;
  instructions: string;
  require_proof: boolean;
  status: 'pending_review' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
}

export interface Submission {
  id: string;
  task_id: string;
  worker_email: string;
  proof_text: string;
  proof_image?: string; // base64 or URL
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  feedback?: string; // Feedback from advertiser (e.g. revision request reason)
  submitted_at: string;
}

export interface KYCVerification {
  id: string;
  user_id: string;
  user_email: string;
  country: string;
  front_image: string; // base64 or URL
  back_image: string;  // base64 or URL
  selfie_image: string; // base64 or URL
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface AppNotification {
  id: string;
  recipient_email: string;
  title: string;
  message: string;
  type: 'submission_approved' | 'submission_rejected' | 'submission_revision' | 'task_approved' | 'task_rejected' | 'kyc_approved' | 'kyc_rejected' | 'general';
  read: boolean;
  created_at: string;
}

export interface ZoneConfig {
  id: string;
  name: string;
  minPrice: number;
  continent: string;
}

export interface CategoryConfig {
  id: string;
  name: string;
  minPrice: number;
}

export const ZONES: ZoneConfig[] = [
  { id: 'international', name: 'International Zone (Global)', minPrice: 0.05, continent: 'All' },
  { id: 'africa', name: 'Africa Zone', minPrice: 0.08, continent: 'Africa' },
  { id: 'asia', name: 'Asia Zone', minPrice: 0.08, continent: 'Asia' },
  { id: 'latin_america', name: 'Latin America Zone', minPrice: 0.10, continent: 'South America' },
  { id: 'europe', name: 'Europe Zone', minPrice: 0.15, continent: 'Europe' },
  { id: 'usa_western', name: 'USA / Western Zone', minPrice: 0.25, continent: 'North America' }
];

export const CATEGORIES: CategoryConfig[] = [
  { id: 'click_search', name: 'Click, Search', minPrice: 0.05 },
  { id: 'signup', name: 'Sign up', minPrice: 0.08 },
  { id: 'social_media', name: 'Social Media (Facebook, Twitter, Instagram, TikTok)', minPrice: 0.06 },
  { id: 'youtube', name: 'YouTube', minPrice: 0.06 },
  { id: 'download_install', name: 'Download, Install', minPrice: 0.10 },
  { id: 'write_article', name: 'Write an Article', minPrice: 0.25 },
  { id: 'blogs_forums', name: 'Blogs/Forums', minPrice: 0.07 },
  { id: 'data_mining', name: 'Data Mining', minPrice: 0.08 },
  { id: 'transcription', name: 'Transcription', minPrice: 0.10 },
  { id: 'surveys', name: 'Surveys', minPrice: 0.12 },
  { id: 'testing', name: 'Testing', minPrice: 0.15 },
  { id: 'moderation', name: 'Moderation', minPrice: 0.05 },
  { id: 'translation', name: 'Translation', minPrice: 0.20 },
  { id: 'mobile_applications', name: 'Mobile Applications', minPrice: 0.15 },
  { id: 'ai_data_annotation', name: 'AI Data / Annotation', minPrice: 0.08 }
];
