-- Supabase Database Schema for MLBB Draft Coach
-- Run this in your Supabase Dashboard -> SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Scrim Draft',
  map_trait TEXT NOT NULL DEFAULT 'DEFAULT',
  blue_picks JSONB NOT NULL DEFAULT '[]'::jsonb,
  blue_bans JSONB NOT NULL DEFAULT '[]'::jsonb,
  red_picks JSONB NOT NULL DEFAULT '[]'::jsonb,
  red_bans JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view their own drafts" ON public.drafts;
DROP POLICY IF EXISTS "Users can insert their own drafts" ON public.drafts;
DROP POLICY IF EXISTS "Users can update their own drafts" ON public.drafts;
DROP POLICY IF EXISTS "Users can delete their own drafts" ON public.drafts;

-- Create RLS Policies
CREATE POLICY "Users can view their own drafts"
  ON public.drafts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drafts"
  ON public.drafts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
  ON public.drafts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
  ON public.drafts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for speedy user draft queries
CREATE INDEX IF NOT EXISTS idx_drafts_user_created ON public.drafts (user_id, created_at DESC);
