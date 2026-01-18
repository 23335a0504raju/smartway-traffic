-- Run this in your Supabase SQL Editor

-- 1. Disable RLS on traffic_logs to allow the Backend (using 'anon' key) to insert data
ALTER TABLE public.traffic_logs DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on videos table to ensure status updates work
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;

-- 3. Verify the table exists and has the correct columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'traffic_logs';
