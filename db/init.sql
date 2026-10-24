CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  github_id BIGINT UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id BIGINT UNIQUE;
CREATE TABLE IF NOT EXISTS problems (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  description TEXT NOT NULL,
  examples JSONB NOT NULL DEFAULT '[]',
  constraints JSONB NOT NULL DEFAULT '[]',
  hints JSONB NOT NULL DEFAULT '[]',
  starter_code JSONB NOT NULL DEFAULT '{}',
  reference_solution JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE problems ADD COLUMN IF NOT EXISTS reference_solution JSONB NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS test_cases (
  id BIGSERIAL PRIMARY KEY,
  problem_slug TEXT NOT NULL REFERENCES problems(slug) ON DELETE CASCADE,
  stdin TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_slug TEXT REFERENCES problems(slug) ON DELETE SET NULL,
  language TEXT NOT NULL,
  source_code TEXT NOT NULL,
  verdict TEXT NOT NULL,
  stdout TEXT,
  stderr TEXT,
  time_seconds NUMERIC,
  memory_kb INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bookmarks (user_id UUID REFERENCES users(id) ON DELETE CASCADE, problem_slug TEXT REFERENCES problems(slug) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(user_id,problem_slug));
CREATE TABLE IF NOT EXISTS notes (user_id UUID REFERENCES users(id) ON DELETE CASCADE, problem_slug TEXT REFERENCES problems(slug) ON DELETE CASCADE, body TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(user_id,problem_slug));
CREATE TABLE IF NOT EXISTS tutor_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_slug TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tutor_feedback_user_created_idx ON tutor_feedback(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS study_plans (id TEXT PRIMARY KEY, title TEXT NOT NULL, duration_days INTEGER NOT NULL, plan JSONB NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS user_study_plans (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES study_plans(id),
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO study_plans(id,title,duration_days) VALUES
  ('30-day','30-day interview warmup',30),
  ('60-day','60-day interview practice',60)
ON CONFLICT(id) DO NOTHING;
CREATE INDEX IF NOT EXISTS submissions_user_created_idx ON submissions(user_id, created_at DESC);
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS knowledge_documents (source TEXT PRIMARY KEY,title TEXT NOT NULL,topic TEXT,language TEXT,content_hash TEXT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS knowledge_chunks (id BIGSERIAL PRIMARY KEY,source TEXT NOT NULL REFERENCES knowledge_documents(source) ON DELETE CASCADE,chunk_index INTEGER NOT NULL,chunk_text TEXT NOT NULL,embedding vector(1536) NOT NULL,UNIQUE(source,chunk_index));
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
CREATE UNIQUE INDEX IF NOT EXISTS test_cases_unique ON test_cases(problem_slug,stdin,hidden);
CREATE TABLE IF NOT EXISTS mcp_tool_audit (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL,
  actor_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_summary JSONB NOT NULL DEFAULT '{}',
  outcome TEXT NOT NULL CHECK (outcome IN ('success','error')),
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mcp_tool_audit_created_idx ON mcp_tool_audit(created_at DESC);
