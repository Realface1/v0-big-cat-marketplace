-- Create merchant onboarding requests table handled by agents
CREATE TABLE IF NOT EXISTS merchant_onboarding_requests (
  id VARCHAR(100) PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  date_of_commencement DATE NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(255) NOT NULL,
  onboarding_status VARCHAR(30) NOT NULL DEFAULT 'not_started',
  assigned_agent_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_status ON merchant_onboarding_requests(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_assigned_agent ON merchant_onboarding_requests(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_email ON merchant_onboarding_requests(email);
