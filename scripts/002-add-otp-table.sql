-- OTP Verification table for Aurora DSQL

CREATE TABLE IF NOT EXISTS otp_verification (
  id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_otp_email ON otp_verification(email);
COMMIT;
