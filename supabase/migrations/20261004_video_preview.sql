-- Storage bucket for customer videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-videos',
  'customer-videos',
  true,
  104857600,  -- 100 MB
  ARRAY['video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous clients to upload (INSERT)
CREATE POLICY "anon upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'customer-videos');

-- Allow public reads (SELECT) so fal.ai can fetch the video URL
CREATE POLICY "public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'customer-videos');

-- Allow the service role (edge function) to delete after processing
CREATE POLICY "service delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'customer-videos');

-- Render logs table
CREATE TABLE IF NOT EXISTS render_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  haircut_id  text        NOT NULL,
  status      text        NOT NULL CHECK (status IN ('success', 'failed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by date range (cost tracking)
CREATE INDEX IF NOT EXISTS render_logs_created_at_idx ON render_logs (created_at DESC);
