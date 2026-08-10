import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('Starting migration...')

  try {
    // Test if address column exists by trying to select it
    const { error: testError } = await supabase
      .from('auth_users')
      .select('address')
      .limit(1)

    if (testError && testError.message.includes('address')) {
      console.log('Need to add columns to auth_users via Supabase dashboard SQL editor')
      console.log('Run the following SQL:')
      console.log(`
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT false;
      `)
    } else {
      console.log('auth_users columns already exist')
    }

    // Test OTP table
    const { error: otpError } = await supabase
      .from('otp_verification')
      .select('id')
      .limit(1)

    if (otpError && otpError.message.includes('does not exist')) {
      console.log('Need to create otp_verification table')
    } else {
      console.log('otp_verification table exists')
    }

    // Test conversations table
    const { error: convError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1)

    if (convError && convError.message.includes('does not exist')) {
      console.log('Need to create conversations table')
    } else {
      console.log('conversations table exists')
    }

    // Test payment_methods table
    const { error: pmError } = await supabase
      .from('payment_methods')
      .select('id')
      .limit(1)

    if (pmError && pmError.message.includes('does not exist')) {
      console.log('Need to create payment_methods table')
    } else {
      console.log('payment_methods table exists')
    }

    console.log('Migration check complete!')
  } catch (error) {
    console.error('Migration error:', error)
  }
}

runMigration()
