-- ===== Memory Diary AI — Supabase PostgreSQL Schema =====

-- 1. Users Table
CREATE TABLE IF NOT EXISTS Users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Memories Table
CREATE TABLE IF NOT EXISTS Memories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES Users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  text_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  favorite BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- 3. VoiceTranscripts Table
CREATE TABLE IF NOT EXISTS VoiceTranscripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id TEXT REFERENCES Memories(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  language TEXT DEFAULT 'en-US',
  duration_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Stories Table
CREATE TABLE IF NOT EXISTS Stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id TEXT REFERENCES Memories(id) ON DELETE CASCADE,
  ai_story TEXT NOT NULL,
  tone TEXT DEFAULT 'emotional',
  model_used TEXT DEFAULT 'gemini-1.5-flash',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Translations Table
CREATE TABLE IF NOT EXISTS Translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id TEXT REFERENCES Memories(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Images Table
CREATE TABLE IF NOT EXISTS Images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id TEXT REFERENCES Memories(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Videos Table
CREATE TABLE IF NOT EXISTS Videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id TEXT REFERENCES Memories(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  duration_seconds INT,
  file_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Audio Table
CREATE TABLE IF NOT EXISTS Audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id TEXT REFERENCES Memories(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  duration_seconds INT,
  file_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PDFs Table
CREATE TABLE IF NOT EXISTS PDFs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id TEXT REFERENCES Memories(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  page_count INT DEFAULT 1,
  file_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Files Table (DOCX, PPTX, XLSX, ZIP, TXT)
CREATE TABLE IF NOT EXISTS Files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id TEXT REFERENCES Memories(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Locations Table
CREATE TABLE IF NOT EXISTS Locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id TEXT REFERENCES Memories(id) ON DELETE CASCADE,
  latitude NUMERIC,
  longitude NUMERIC,
  city TEXT,
  state TEXT,
  country TEXT,
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Settings Table
CREATE TABLE IF NOT EXISTS Settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES Users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  auto_translate BOOLEAN DEFAULT TRUE,
  ai_model TEXT DEFAULT 'gemini-1.5-flash',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ActivityLogs Table
CREATE TABLE IF NOT EXISTS ActivityLogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES Users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Backups Table
CREATE TABLE IF NOT EXISTS Backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES Users(id) ON DELETE CASCADE,
  backup_url TEXT NOT NULL,
  memory_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
