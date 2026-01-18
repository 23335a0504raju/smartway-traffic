-- Run this command in your Supabase SQL Editor to create the traffic_logs table.

CREATE TABLE IF NOT EXISTS public.traffic_logs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  video_id uuid NULL,
  vehicle_count integer NULL,
  emergency_detected boolean NULL,
  signal_status text NULL,
  detailed_analysis jsonb NULL, -- Stores full report including AI text
  analysis_data jsonb NULL,     -- Stores raw vehicle counts
  snapshot_url text NULL,       -- Stores the path to the accident snapshot
  CONSTRAINT traffic_logs_pkey PRIMARY KEY (id),
  CONSTRAINT traffic_logs_video_id_fkey FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Optional: Create an index on video_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_traffic_logs_video_id ON public.traffic_logs (video_id);

-- Verify the table creation
SELECT * FROM public.traffic_logs;
