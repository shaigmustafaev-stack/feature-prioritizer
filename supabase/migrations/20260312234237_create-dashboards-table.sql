-- Create dashboards table for analytics tool
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  share_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own dashboards
CREATE POLICY "Users manage own dashboards" ON dashboards
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Anyone can read dashboards that have a share_id (public sharing)
CREATE POLICY "Public read by share_id" ON dashboards
  FOR SELECT
  USING (share_id IS NOT NULL);
