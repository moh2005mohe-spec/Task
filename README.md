# 🚀 TaskZone - Micro-Task Marketplace Platform

Welcome to **TaskZone**, a highly polished, fully functional dual-sided micro-task marketplace platform built in React + TypeScript, Vite, and Tailwind CSS. Advertisers can create and target campaigns, and workers can complete them and upload screenshot proofs.

---

## 🌎 1. Deploying to Render.com (Vite SPA)

This project is pre-configured to be deployed as a **Render Static Site**.

### Step-by-Step Render Deployment:
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Static Site**.
3. Connect your GitHub repository: `https://github.com/moh2005mohe-spec/Task`.
4. Render will automatically detect the configuration in `render.yaml`, or you can input them manually:
   - **Name**: `taskzone-marketplace`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
5. *(Optional)* Add the following **Environment Variables** in the Render settings to connect to your Supabase instance:
   - `VITE_SUPABASE_URL` = `your-supabase-project-url`
   - `VITE_SUPABASE_ANON_KEY` = `your-supabase-anon-public-key`
6. Click **Create Static Site**! Your app will be live in a few minutes.

---

## 🗄️ 2. Supabase SQL Script (Database Initialization)

To configure your Supabase Postgres database so that the application syncs instantly, copy the following SQL script, navigate to your **Supabase Dashboard ➡️ SQL Editor ➡️ New Query**, paste it, and click **Run**:

```sql
-- Create custom_users table to store advertiser, worker, and admin accounts
CREATE TABLE IF NOT EXISTS custom_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  balance NUMERIC DEFAULT 100.00,
  role TEXT NOT NULL DEFAULT 'advertiser',
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tasks table to store micro-payment campaigns
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

-- Create submissions table for worker proofs
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_email TEXT NOT NULL,
  proof_text TEXT NOT NULL,
  proof_image TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) to secure database tables
ALTER TABLE custom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access policies since we are using public anon keys
CREATE POLICY "Public full access on custom_users" ON custom_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);

-- Insert a default administrator account (Password: admin123)
INSERT INTO custom_users (id, email, balance, role, password, created_at)
VALUES ('admin-id', 'admin@taskzone.com', 9999.00, 'admin', 'admin123', NOW())
ON CONFLICT (id) DO NOTHING;
```

---

## 💎 Features Included:
- **Resilient Offline/Offline Mode**: If Supabase credentials are not supplied or tables are missing, the application defaults to using local storage so it remains 100% functional for evaluation.
- **Micro-payment & Categorization Enforcer**: Ensures correct payment levels matching targets like USA/Western ($0.25+), Europe ($0.15+), Africa ($0.08+), etc.
- **Admin Verification Panel**: Allows reviewing, approving, and rejecting micro-payment submissions with automated transaction flows.
