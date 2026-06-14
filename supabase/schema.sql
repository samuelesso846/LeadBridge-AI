-- =============================================
-- LEADBRIDGE AI — Base de données complète
-- Coller dans Supabase > SQL Editor > Run
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- UTILISATEURS
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- PAGES PUBLIQUES
CREATE TABLE pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  bio TEXT,
  emoji TEXT DEFAULT '🚀',
  whatsapp TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  linkedin_url TEXT,
  ai_persona TEXT DEFAULT 'assistant commercial professionnel',
  active BOOLEAN DEFAULT TRUE,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_user ON pages(user_id);

-- CONNEXIONS RÉSEAUX SOCIAUX
CREATE TABLE social_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','tiktok')),
  platform_user_id TEXT,
  platform_page_id TEXT,
  platform_page_name TEXT,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_user ON social_connections(user_id);

-- LEADS
CREATE TABLE leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  prenom TEXT NOT NULL,
  nom TEXT DEFAULT '',
  email TEXT,
  phone TEXT,
  message TEXT,
  source TEXT DEFAULT 'Manuel',
  statut TEXT DEFAULT 'nouveau' CHECK (statut IN ('nouveau','contacte','qualifie','gagne','perdu')),
  score INTEGER DEFAULT 0,
  ai_summary TEXT,
  tags TEXT[] DEFAULT '{}',
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_user ON leads(user_id);
CREATE INDEX idx_leads_statut ON leads(statut);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- MESSAGES IA (historique conversations)
CREATE TABLE ai_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  platform TEXT,
  direction TEXT CHECK (direction IN ('inbound','outbound')),
  content TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTES SUR LES LEADS
CREATE TABLE notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  icon TEXT DEFAULT '🔔',
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifs_user ON notifications(user_id, read);

-- SÉCURITÉ (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_pages" ON pages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "public_pages" ON pages FOR SELECT USING (active = TRUE);
CREATE POLICY "own_social" ON social_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_leads" ON leads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_messages" ON ai_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_notes" ON notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_notifs" ON notifications FOR ALL USING (auth.uid() = user_id);

-- TEMPS RÉEL
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_messages;

-- FONCTION : incrémenter vues
CREATE OR REPLACE FUNCTION increment_views(page_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE pages SET views = views + 1 WHERE slug = page_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

