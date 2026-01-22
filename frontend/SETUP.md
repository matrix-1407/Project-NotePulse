# NotePulse Frontend - Quick Start

## Prerequisites

1. **Supabase Project**: Create a free project at https://supabase.com
2. **Database Tables**: Run the SQL below in Supabase SQL Editor

## Database Setup

### 1. Create Tables

```sql
-- profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default now()
);

-- items table
create table items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  description text,
  status text default 'active',
  created_at timestamp with time zone default now()
);
```

### 2. Enable Row Level Security

```sql
alter table profiles enable row level security;
alter table items enable row level security;

-- Users can read their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

-- Users can insert their own profile
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Users can read their own items
create policy "Users can view own items" on items
  for select using (auth.uid() = user_id);

-- Users can create their own items
create policy "Users can insert own items" on items
  for insert with check (auth.uid() = user_id);
```

## Local Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from Supabase Dashboard → Settings → API

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173

## Testing Checklist

✅ App loads without blank screen  
✅ Sign up form appears  
✅ Can create new account  
✅ Profile created in database  
✅ Dashboard shows after sign in  
✅ Can add new items  
✅ Items appear in list  
✅ Items persist after refresh  
✅ Sign out works  
✅ Sign back in shows same items  

## Troubleshooting

**Blank screen?** Check browser console for errors and ensure env vars are set

**Can't sign up?** Verify Supabase URL and anon key are correct

**Items not saving?** Check RLS policies are created and Supabase tables exist

**Auth not persisting?** Clear browser storage and try again
