-- Create agents table for onboarding agents with access code login
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  region VARCHAR(255) NOT NULL,
  access_code VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'agent',
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_access_code ON agents(access_code);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
