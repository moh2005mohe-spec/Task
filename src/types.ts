export interface User {
  id: string;
  email: string;
  balance: number;
  role: 'advertiser' | 'admin';
  password?: string;
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
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
}

export interface ZoneConfig {
  id: string;
  name: string;
  minPrice: number;
  countries: string[];
}

export interface CategoryConfig {
  id: string;
  name: string;
  minPrice: number;
}

export const ZONES: ZoneConfig[] = [
  {
    id: 'international',
    name: 'International Zone (Global - Cheap)',
    minPrice: 0.05,
    countries: ['All Countries']
  },
  {
    id: 'africa',
    name: 'Africa Zone (Africa Continent)',
    minPrice: 0.08,
    countries: ['Egypt', 'Nigeria', 'South Africa', 'Kenya', 'Morocco', 'Ghana', 'Algeria', 'Ethiopia', 'Tunisia']
  },
  {
    id: 'asia',
    name: 'Asia Zone (Asia Continent)',
    minPrice: 0.08,
    countries: ['India', 'Pakistan', 'Bangladesh', 'Indonesia', 'Philippines', 'Vietnam', 'Japan', 'China', 'Saudi Arabia', 'UAE', 'Turkey']
  },
  {
    id: 'latin_america',
    name: 'Latin America Zone (Latin America)',
    minPrice: 0.10,
    countries: ['Brazil', 'Mexico', 'Argentina', 'Colombia', 'Peru', 'Chile', 'Venezuela', 'Ecuador', 'Guatemala']
  },
  {
    id: 'europe',
    name: 'Europe Zone (Eastern & Western Europe)',
    minPrice: 0.15,
    countries: ['Germany', 'France', 'Poland', 'Romania', 'Ukraine', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'United Kingdom']
  },
  {
    id: 'usa_western',
    name: 'USA / Western Zone (US, CA, UK, AU, NZ)',
    minPrice: 0.25,
    countries: ['United States', 'Canada', 'United Kingdom', 'Australia', 'New Zealand']
  }
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
