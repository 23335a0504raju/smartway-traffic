-- Run this command in your Supabase SQL Editor to create the alert_messages table.

CREATE TABLE IF NOT EXISTS public.alert_messages (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  video_id uuid NULL,
  type text NOT NULL,        -- 'Emergency', 'Congestion', 'System'
  message text NOT NULL,     -- The actual alert body
  recipient text NULL,       -- Email or Phone number (optional)
  delivery_status text NULL DEFAULT 'pending', -- 'sent', 'failed'
  CONSTRAINT alert_messages_pkey PRIMARY KEY (id),
  CONSTRAINT alert_messages_video_id_fkey FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Optional: Index for faster queries
CREATE INDEX IF NOT EXISTS idx_alert_messages_created_at ON public.alert_messages (created_at);

-- Grant access (if RLS is enabled, you might need policies, but for now assuming public/service role access)
-- ALTER TABLE public.alert_messages ENABLE ROW LEVEL SECURITY;
