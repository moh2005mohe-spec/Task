import { createClient } from '@supabase/supabase-js';
import { Task, User, Submission, AppNotification, KYCVerification, ZoneConfig, CategoryConfig, ZONES, CATEGORIES } from '../types';

// Supabase URL and Anon Key (provided by user)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gzrhexrtdvjitifsdcsv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cmhleHJ0ZHZqaXRpZnNkY3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MzY5OTQsImV4cCI6MjEwNTMxMjk5NH0.II-IRV04VYtaRbHOnU6lD9Ql_YVL99_OIT8PRZbHjbA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SQL script for setting up the Supabase database
export const SETUP_SQL = `-- Create custom_users table if not exists
CREATE TABLE IF NOT EXISTS custom_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  balance NUMERIC DEFAULT 100.00,
  role TEXT NOT NULL DEFAULT 'advertiser',
  password TEXT NOT NULL,
  kyc_status TEXT DEFAULT 'unverified',
  kyc_country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist if table was created previously
ALTER TABLE custom_users ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'unverified';
ALTER TABLE custom_users ADD COLUMN IF NOT EXISTS kyc_country TEXT;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  zone TEXT NOT NULL,
  countries TEXT[] NOT NULL,
  category TEXT NOT NULL,
  duration TEXT NOT NULL,
  workers_needed INTEGER NOT NULL DEFAULT 20,
  worker_pay NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  instructions TEXT NOT NULL,
  require_proof BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_email TEXT NOT NULL,
  proof_text TEXT NOT NULL,
  proof_image TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create kyc_verifications table
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  country TEXT NOT NULL,
  front_image TEXT NOT NULL,
  back_image TEXT NOT NULL,
  selfie_image TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create pricing_settings table
CREATE TABLE IF NOT EXISTS pricing_settings (
  id TEXT PRIMARY KEY,
  zones JSONB NOT NULL,
  categories JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) bypass / public access for ease of use in demo
ALTER TABLE custom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to prevent duplicate policy errors on re-run
DROP POLICY IF EXISTS "Public full access on custom_users" ON custom_users;
DROP POLICY IF EXISTS "Public full access on tasks" ON tasks;
DROP POLICY IF EXISTS "Public full access on submissions" ON submissions;
DROP POLICY IF EXISTS "Public full access on notifications" ON notifications;
DROP POLICY IF EXISTS "Public full access on kyc_verifications" ON kyc_verifications;
DROP POLICY IF EXISTS "Public full access on pricing_settings" ON pricing_settings;

-- Allow public read/write policies since we are using anon key for simplicity
CREATE POLICY "Public full access on custom_users" ON custom_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on kyc_verifications" ON kyc_verifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on pricing_settings" ON pricing_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert dummy admin user (password: admin123)
INSERT INTO custom_users (id, email, balance, role, password, kyc_status, created_at)
VALUES ('admin-id', 'admin@taskzone.com', 9999.00, 'admin', 'admin123', 'approved', NOW())
ON CONFLICT (id) DO NOTHING;
`;

// Helper to determine if we are currently falling back to LocalStorage
export let isUsingFallback = false;

export function setUsingFallback(val: boolean) {
  isUsingFallback = val;
}

// Check database connection and tables existence
export async function testDbConnection(): Promise<{ connected: boolean; hasTables: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.from('custom_users').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        isUsingFallback = true;
        return { connected: true, hasTables: false, error: 'Tables do not exist. Please run the SQL schema.' };
      }
      isUsingFallback = true;
      return { connected: false, hasTables: false, error: error.message };
    }
    isUsingFallback = false;
    return { connected: true, hasTables: true };
  } catch (err: any) {
    isUsingFallback = true;
    return { connected: false, hasTables: false, error: err.message };
  }
}

// Local Storage Fallback helpers
const LS_KEYS = {
  USERS: 'taskzone_fallback_users',
  TASKS: 'taskzone_fallback_tasks',
  SUBMISSIONS: 'taskzone_fallback_submissions',
  NOTIFICATIONS: 'taskzone_fallback_notifications',
  KYC: 'taskzone_fallback_kyc',
  PRICING: 'taskzone_fallback_pricing'
};

const getLS = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
};

const setLS = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Initial local storage values if none exist
const defaultUsers: User[] = [
  {
    id: 'admin-id',
    email: 'admin@taskzone.com',
    balance: 9999.00,
    role: 'admin',
    password: 'admin123',
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-advertiser',
    email: 'demo@taskzone.com',
    balance: 100.00,
    role: 'advertiser',
    password: 'password123',
    created_at: new Date().toISOString()
  }
];

const defaultTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Watch YouTube Video and Subscribe',
    zone: 'International Zone (Global - Cheap)',
    countries: ['All Countries'],
    category: 'YouTube',
    duration: '3 Days',
    workers_needed: 20,
    worker_pay: 0.08,
    total_cost: 1.60,
    instructions: '1. Go to YouTube and search for "TaskZone Tutorial".\n2. Watch the full video (at least 2 minutes).\n3. Like and subscribe to the channel.\n4. Take a screenshot showing your subscription.',
    require_proof: true,
    status: 'approved',
    created_by: 'demo-advertiser',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'task-2',
    title: 'Sign up on Crypto Wallet App',
    zone: 'USA / Western Zone (US, CA, UK, AU, NZ)',
    countries: ['United States', 'Canada'],
    category: 'Sign up',
    duration: '7 Days',
    workers_needed: 25,
    worker_pay: 0.30,
    total_cost: 7.50,
    instructions: '1. Download the app using our referral link.\n2. Complete the basic registration.\n3. Verify your email address.\n4. Submit your registered username as text proof.',
    require_proof: false,
    status: 'approved',
    created_by: 'demo-advertiser',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

const defaultSubmissions: Submission[] = [];

// Initialize LocalStorage if empty
if (!localStorage.getItem(LS_KEYS.USERS)) setLS(LS_KEYS.USERS, defaultUsers);
if (!localStorage.getItem(LS_KEYS.TASKS)) setLS(LS_KEYS.TASKS, defaultTasks);
if (!localStorage.getItem(LS_KEYS.SUBMISSIONS)) setLS(LS_KEYS.SUBMISSIONS, defaultSubmissions);

// Database Operations
export async function getUsers(): Promise<User[]> {
  if (isUsingFallback) {
    return getLS<User[]>(LS_KEYS.USERS, defaultUsers);
  }
  try {
    const { data, error } = await supabase.from('custom_users').select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetch failed, falling back to LocalStorage', err);
    isUsingFallback = true;
    return getLS<User[]>(LS_KEYS.USERS, defaultUsers);
  }
}

export async function saveUser(user: User): Promise<User> {
  if (isUsingFallback) {
    const users = getLS<User[]>(LS_KEYS.USERS, defaultUsers);
    // Avoid duplicates
    const idx = users.findIndex(u => u.email === user.email || u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    setLS(LS_KEYS.USERS, users);
    return user;
  }
  try {
    const { data, error } = await supabase.from('custom_users').upsert(user).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase save user failed, using LocalStorage', err);
    isUsingFallback = true;
    return saveUser(user);
  }
}

export async function updateUserBalance(userId: string, newBalance: number): Promise<void> {
  if (isUsingFallback) {
    const users = getLS<User[]>(LS_KEYS.USERS, defaultUsers);
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      users[idx].balance = parseFloat(newBalance.toFixed(2));
      setLS(LS_KEYS.USERS, users);
    }
    return;
  }
  try {
    const { error } = await supabase.from('custom_users').update({ balance: parseFloat(newBalance.toFixed(2)) }).eq('id', userId);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase update balance failed, using LocalStorage', err);
    isUsingFallback = true;
    await updateUserBalance(userId, newBalance);
  }
}

export async function getTasks(): Promise<Task[]> {
  if (isUsingFallback) {
    return getLS<Task[]>(LS_KEYS.TASKS, defaultTasks);
  }
  try {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetch tasks failed, using LocalStorage', err);
    isUsingFallback = true;
    return getLS<Task[]>(LS_KEYS.TASKS, defaultTasks);
  }
}

export async function saveTask(task: Task): Promise<Task> {
  if (isUsingFallback) {
    const tasks = getLS<Task[]>(LS_KEYS.TASKS, defaultTasks);
    tasks.push(task);
    setLS(LS_KEYS.TASKS, tasks);
    return task;
  }
  try {
    const { data, error } = await supabase.from('tasks').insert(task).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase save task failed, using LocalStorage', err);
    isUsingFallback = true;
    return saveTask(task);
  }
}

export async function updateTaskStatus(taskId: string, status: 'approved' | 'rejected'): Promise<void> {
  let targetTask: Task | undefined;
  if (isUsingFallback) {
    const tasks = getLS<Task[]>(LS_KEYS.TASKS, defaultTasks);
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx >= 0) {
      tasks[idx].status = status;
      targetTask = tasks[idx];
      setLS(LS_KEYS.TASKS, tasks);
    }
  } else {
    try {
      const { data, error } = await supabase.from('tasks').update({ status }).eq('id', taskId).select().single();
      if (error) throw error;
      targetTask = data;
    } catch (err) {
      console.warn('Supabase update task status failed, using LocalStorage', err);
      isUsingFallback = true;
      await updateTaskStatus(taskId, status);
      return;
    }
  }

  // Create notification for campaign creator
  if (targetTask) {
    const users = await getUsers();
    const creator = users.find(u => u.id === targetTask!.created_by || u.email.toLowerCase() === targetTask!.created_by.toLowerCase());
    const recipientEmail = creator ? creator.email : targetTask.created_by;

    if (recipientEmail) {
      await createNotification({
        recipient_email: recipientEmail,
        title: status === 'approved' ? 'Campaign Approved & Live!' : 'Campaign Declined',
        message: status === 'approved'
          ? `Your campaign "${targetTask.title}" has been approved by Admin and is now live for workers.`
          : `Your campaign "${targetTask.title}" was declined by Admin. Your unspent budget has been refunded.`,
        type: status === 'approved' ? 'task_approved' : 'task_rejected'
      });
    }
  }
}

export async function getSubmissions(): Promise<Submission[]> {
  let list: Submission[] = [];
  if (isUsingFallback) {
    list = getLS<Submission[]>(LS_KEYS.SUBMISSIONS, defaultSubmissions);
  } else {
    try {
      const { data, error } = await supabase.from('submissions').select('*');
      if (error) throw error;
      list = data || [];
    } catch (err) {
      console.warn('Supabase fetch submissions failed, using LocalStorage', err);
      isUsingFallback = true;
      list = getLS<Submission[]>(LS_KEYS.SUBMISSIONS, defaultSubmissions);
    }
  }

  // Check 3-day auto-approval rule for pending submissions
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 72 hours
  const now = Date.now();
  let updated = false;

  for (const sub of list) {
    if (sub.status === 'pending') {
      const submittedTime = new Date(sub.submitted_at).getTime();
      if (!isNaN(submittedTime) && (now - submittedTime) >= THREE_DAYS_MS) {
        sub.status = 'approved';
        sub.feedback = 'Auto-approved after 3 days without advertiser review.';
        await updateSubmissionStatus(sub.id, 'approved', sub.feedback);

        // Credit worker balance
        const tasks = await getTasks();
        const matchedTask = tasks.find(t => t.id === sub.task_id);
        if (matchedTask) {
          const users = await getUsers();
          const worker = users.find(u => u.email.toLowerCase() === sub.worker_email.toLowerCase());
          if (worker) {
            const newBal = parseFloat((worker.balance + matchedTask.worker_pay).toFixed(2));
            await updateUserBalance(worker.id, newBal);
          }
        }
        updated = true;
      }
    }
  }

  return list;
}

export async function saveSubmission(submission: Submission): Promise<Submission> {
  submission.status = 'pending';
  submission.feedback = undefined;
  submission.submitted_at = new Date().toISOString();

  if (isUsingFallback) {
    const submissions = getLS<Submission[]>(LS_KEYS.SUBMISSIONS, defaultSubmissions);
    const existingIdx = submissions.findIndex(
      s => s.task_id === submission.task_id && s.worker_email.toLowerCase() === submission.worker_email.toLowerCase()
    );
    if (existingIdx >= 0) {
      submission.id = submissions[existingIdx].id;
      submissions[existingIdx] = {
        ...submissions[existingIdx],
        ...submission,
        status: 'pending',
        feedback: undefined
      };
    } else {
      submissions.push(submission);
    }
    setLS(LS_KEYS.SUBMISSIONS, submissions);
    return submission;
  }
  try {
    // Lookup existing submission ID to prevent duplicate rows in Supabase
    const { data: existing } = await supabase
      .from('submissions')
      .select('id')
      .eq('task_id', submission.task_id)
      .ilike('worker_email', submission.worker_email)
      .maybeSingle();

    if (existing && existing.id) {
      submission.id = existing.id;
    }

    const payload = {
      id: submission.id,
      task_id: submission.task_id,
      worker_email: submission.worker_email,
      proof_text: submission.proof_text,
      proof_image: submission.proof_image || null,
      status: 'pending',
      feedback: null,
      submitted_at: submission.submitted_at
    };

    const { data, error } = await supabase.from('submissions').upsert(payload).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase save submission failed, using LocalStorage', err);
    isUsingFallback = true;
    return saveSubmission(submission);
  }
}

export async function updateSubmissionStatus(
  submissionId: string,
  status: 'approved' | 'rejected' | 'revision_requested',
  feedback?: string
): Promise<void> {
  let updatedSub: Submission | undefined;
  if (isUsingFallback) {
    const submissions = getLS<Submission[]>(LS_KEYS.SUBMISSIONS, defaultSubmissions);
    const idx = submissions.findIndex(s => s.id === submissionId);
    if (idx >= 0) {
      submissions[idx].status = status;
      submissions[idx].feedback = feedback;
      updatedSub = submissions[idx];
      setLS(LS_KEYS.SUBMISSIONS, submissions);
    }
  } else {
    try {
      const { data, error } = await supabase.from('submissions').update({ status, feedback }).eq('id', submissionId).select().single();
      if (error) throw error;
      updatedSub = data;
    } catch (err) {
      console.warn('Supabase update submission status failed, using LocalStorage', err);
      isUsingFallback = true;
      await updateSubmissionStatus(submissionId, status, feedback);
      return;
    }
  }

  // Dispatch notification to worker
  if (updatedSub) {
    const tasks = await getTasks();
    const matchedTask = tasks.find(t => t.id === updatedSub!.task_id);
    const taskTitle = matchedTask ? matchedTask.title : 'Task';
    const pay = matchedTask ? matchedTask.worker_pay : 0;

    let notifTitle = 'Submission Update';
    let notifMsg = `Your submission for "${taskTitle}" status was updated to ${status}.`;
    let notifType: AppNotification['type'] = 'general';

    if (status === 'approved') {
      notifTitle = 'Submission Approved & Paid!';
      notifMsg = `Congratulations! Your submission for "${taskTitle}" was approved and $${pay.toFixed(2)} USD has been credited to your balance.`;
      notifType = 'submission_approved';

      // Credit worker balance automatically
      if (matchedTask) {
        try {
          const users = await getUsers();
          const worker = users.find(u => u.email.toLowerCase() === updatedSub!.worker_email.toLowerCase());
          if (worker) {
            const newBal = parseFloat((worker.balance + pay).toFixed(2));
            await updateUserBalance(worker.id, newBal);
          }
        } catch (err) {
          console.error('Failed crediting worker balance on approval', err);
        }
      }
    } else if (status === 'rejected') {
      notifTitle = 'Submission Declined';
      notifMsg = `Your submission for "${taskTitle}" was declined by the advertiser.`;
      notifType = 'submission_rejected';
    } else if (status === 'revision_requested') {
      notifTitle = 'Revision Requested';
      notifMsg = `Advertiser requested a revision for "${taskTitle}". Note: ${feedback || 'Please update your proof.'}`;
      notifType = 'submission_revision';
    }

    await createNotification({
      recipient_email: updatedSub.worker_email,
      title: notifTitle,
      message: notifMsg,
      type: notifType
    });
  }
}

// Notification database functions
export async function getNotifications(userEmailOrId: string): Promise<AppNotification[]> {
  if (!userEmailOrId) return [];
  const normalized = userEmailOrId.toLowerCase();

  if (isUsingFallback) {
    const list = getLS<AppNotification[]>(LS_KEYS.NOTIFICATIONS, []);
    return list.filter(n => n.recipient_email.toLowerCase() === normalized);
  }
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .ilike('recipient_email', normalized)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetch notifications failed, using LocalStorage', err);
    isUsingFallback = true;
    const list = getLS<AppNotification[]>(LS_KEYS.NOTIFICATIONS, []);
    return list.filter(n => n.recipient_email.toLowerCase() === normalized);
  }
}

export async function createNotification(
  notification: Omit<AppNotification, 'id' | 'created_at' | 'read'>
): Promise<AppNotification> {
  const newNotif: AppNotification = {
    ...notification,
    id: 'notif-' + Math.random().toString(36).substr(2, 9),
    read: false,
    created_at: new Date().toISOString()
  };

  if (isUsingFallback) {
    const list = getLS<AppNotification[]>(LS_KEYS.NOTIFICATIONS, []);
    list.unshift(newNotif);
    setLS(LS_KEYS.NOTIFICATIONS, list);
    return newNotif;
  }
  try {
    const { data, error } = await supabase.from('notifications').insert(newNotif).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase create notification failed, using LocalStorage', err);
    isUsingFallback = true;
    const list = getLS<AppNotification[]>(LS_KEYS.NOTIFICATIONS, []);
    list.unshift(newNotif);
    setLS(LS_KEYS.NOTIFICATIONS, list);
    return newNotif;
  }
}

export async function markNotificationsAsRead(userEmailOrId: string): Promise<void> {
  if (!userEmailOrId) return;
  const normalized = userEmailOrId.toLowerCase();

  if (isUsingFallback) {
    const list = getLS<AppNotification[]>(LS_KEYS.NOTIFICATIONS, []);
    list.forEach(n => {
      if (n.recipient_email.toLowerCase() === normalized) {
        n.read = true;
      }
    });
    setLS(LS_KEYS.NOTIFICATIONS, list);
    return;
  }
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .ilike('recipient_email', normalized);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase mark notifications read failed, using LocalStorage', err);
    isUsingFallback = true;
    await markNotificationsAsRead(userEmailOrId);
  }
}

export async function markSingleNotificationAsRead(notifId: string): Promise<void> {
  if (!notifId) return;

  if (isUsingFallback) {
    const list = getLS<AppNotification[]>(LS_KEYS.NOTIFICATIONS, []);
    const item = list.find(n => n.id === notifId);
    if (item) {
      item.read = true;
    }
    setLS(LS_KEYS.NOTIFICATIONS, list);
    return;
  }
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notifId);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase mark single notification read failed, using LocalStorage', err);
    isUsingFallback = true;
    await markSingleNotificationAsRead(notifId);
  }
}

export async function deleteTaskAndRefund(
  task: Task,
  advertiserUser: User
): Promise<{ success: boolean; refundedAmount: number; message?: string }> {
  const allSubmissions = await getSubmissions();
  const taskSubmissions = allSubmissions.filter(s => s.task_id === task.id);

  // Check if there are active unresolved submissions
  const pendingOrRevision = taskSubmissions.filter(s => s.status === 'pending' || s.status === 'revision_requested');
  if (pendingOrRevision.length > 0) {
    return {
      success: false,
      refundedAmount: 0,
      message: `Cannot delete task yet! There are ${pendingOrRevision.length} pending or revision submission(s). You must approve, reject, or resolve them first.`
    };
  }

  // Calculate refund: original total cost minus pay given for approved submissions
  const approvedCount = taskSubmissions.filter(s => s.status === 'approved').length;
  const approvedPayout = approvedCount * task.worker_pay;
  const refundedAmount = Math.max(0, task.total_cost - approvedPayout);

  // 1. Delete task from DB/LocalStorage
  if (isUsingFallback) {
    const tasks = getLS<Task[]>(LS_KEYS.TASKS, defaultTasks);
    const updatedTasks = tasks.filter(t => t.id !== task.id);
    setLS(LS_KEYS.TASKS, updatedTasks);

    const submissions = getLS<Submission[]>(LS_KEYS.SUBMISSIONS, defaultSubmissions);
    const updatedSubmissions = submissions.filter(s => s.task_id !== task.id);
    setLS(LS_KEYS.SUBMISSIONS, updatedSubmissions);
  } else {
    try {
      await supabase.from('tasks').delete().eq('id', task.id);
    } catch (err) {
      console.warn('Failed deleting task from Supabase, falling back', err);
      isUsingFallback = true;
      return deleteTaskAndRefund(task, advertiserUser);
    }
  }

  // 2. Refund remaining amount to advertiser balance
  if (refundedAmount > 0) {
    const newBalance = parseFloat((advertiserUser.balance + refundedAmount).toFixed(2));
    await updateUserBalance(advertiserUser.id, newBalance);
  }

  return {
    success: true,
    refundedAmount,
    message: refundedAmount > 0
      ? `Task deleted successfully. $${refundedAmount.toFixed(2)} USD refunded to your wallet balance.`
      : `Task deleted successfully.`
  };
}

// KYC Database Functions
export async function getKYCVerifications(): Promise<KYCVerification[]> {
  if (isUsingFallback) {
    return getLS<KYCVerification[]>(LS_KEYS.KYC, []);
  }
  try {
    const { data, error } = await supabase.from('kyc_verifications').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetch KYC failed, using LocalStorage', err);
    isUsingFallback = true;
    return getLS<KYCVerification[]>(LS_KEYS.KYC, []);
  }
}

export async function saveKYCVerification(verification: KYCVerification): Promise<KYCVerification> {
  // Update user kyc_status to pending in custom_users
  const users = await getUsers();
  const user = users.find(u => u.id === verification.user_id || u.email.toLowerCase() === verification.user_email.toLowerCase());
  if (user) {
    user.kyc_status = 'pending';
    user.kyc_country = verification.country;
    await saveUser(user);
  }

  if (isUsingFallback) {
    const list = getLS<KYCVerification[]>(LS_KEYS.KYC, []);
    const idx = list.findIndex(k => k.id === verification.id || k.user_email.toLowerCase() === verification.user_email.toLowerCase());
    if (idx >= 0) {
      list[idx] = verification;
    } else {
      list.unshift(verification);
    }
    setLS(LS_KEYS.KYC, list);
    return verification;
  }
  try {
    const { data, error } = await supabase.from('kyc_verifications').upsert(verification).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase save KYC failed, using LocalStorage', err);
    isUsingFallback = true;
    return saveKYCVerification(verification);
  }
}

export async function updateKYCStatus(
  verificationId: string,
  userId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<void> {
  let targetEmail = '';
  let targetCountry = '';

  if (isUsingFallback) {
    const list = getLS<KYCVerification[]>(LS_KEYS.KYC, []);
    const idx = list.findIndex(k => k.id === verificationId);
    if (idx >= 0) {
      list[idx].status = status;
      list[idx].rejection_reason = rejectionReason;
      targetEmail = list[idx].user_email;
      targetCountry = list[idx].country;
      setLS(LS_KEYS.KYC, list);
    }
  } else {
    try {
      const { data, error } = await supabase
        .from('kyc_verifications')
        .update({ status, rejection_reason: rejectionReason, updated_at: new Date().toISOString() })
        .eq('id', verificationId)
        .select()
        .single();
      if (error) throw error;
      if (data) {
        targetEmail = data.user_email;
        targetCountry = data.country;
      }
    } catch (err) {
      console.warn('Supabase update KYC failed, using LocalStorage', err);
      isUsingFallback = true;
      await updateKYCStatus(verificationId, userId, status, rejectionReason);
      return;
    }
  }

  // Update custom_users status
  const users = await getUsers();
  const matchedUser = users.find(u => u.id === userId || (targetEmail && u.email.toLowerCase() === targetEmail.toLowerCase()));
  if (matchedUser) {
    matchedUser.kyc_status = status;
    if (status === 'approved' && targetCountry) {
      matchedUser.kyc_country = targetCountry;
    }
    await saveUser(matchedUser);

    // Send notification to user
    await createNotification({
      recipient_email: matchedUser.email,
      title: status === 'approved' ? 'Identity Verified! (KYC Approved)' : 'KYC Verification Rejected',
      message: status === 'approved'
        ? `Your identity document for ${targetCountry || matchedUser.kyc_country || 'your country'} has been verified by Admin. You can now execute micro-tasks!`
        : `Your KYC verification request was rejected. Reason: ${rejectionReason || 'Documents unclear or unreadable. Please resubmit.'}`,
      type: status === 'approved' ? 'kyc_approved' : 'kyc_rejected'
    });
  }
}

// Pricing Settings Functions
export async function getPricingSettings(): Promise<{ zones: ZoneConfig[]; categories: CategoryConfig[] }> {
  if (isUsingFallback) {
    const saved = getLS<{ zones: ZoneConfig[]; categories: CategoryConfig[] } | null>(LS_KEYS.PRICING, null);
    if (saved) return saved;
    return { zones: ZONES, categories: CATEGORIES };
  }
  try {
    const { data, error } = await supabase.from('pricing_settings').select('*').eq('id', 'default_pricing').maybeSingle();
    if (error || !data) {
      return { zones: ZONES, categories: CATEGORIES };
    }
    return {
      zones: data.zones || ZONES,
      categories: data.categories || CATEGORIES
    };
  } catch (err) {
    console.warn('Supabase fetch pricing failed, using default', err);
    isUsingFallback = true;
    const saved = getLS<{ zones: ZoneConfig[]; categories: CategoryConfig[] } | null>(LS_KEYS.PRICING, null);
    return saved || { zones: ZONES, categories: CATEGORIES };
  }
}

export async function savePricingSettings(zones: ZoneConfig[], categories: CategoryConfig[]): Promise<void> {
  const payload = { id: 'default_pricing', zones, categories, updated_at: new Date().toISOString() };
  if (isUsingFallback) {
    setLS(LS_KEYS.PRICING, { zones, categories });
    return;
  }
  try {
    const { error } = await supabase.from('pricing_settings').upsert(payload);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase save pricing failed, using LocalStorage', err);
    isUsingFallback = true;
    setLS(LS_KEYS.PRICING, { zones, categories });
  }
}
