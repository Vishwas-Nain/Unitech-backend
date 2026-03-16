const pool = require('./config/database');

async function checkOtpColumns() {
  try {
    console.log('🔍 Checking OTP-related database columns...');
    
    // Check users table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('email_verification_code', 'email_verification_expires', 'otp_attempts', 'last_otp_sent')
      ORDER BY column_name
    `);
    
    console.log('📋 OTP columns in users table:');
    if (result.rows.length === 0) {
      console.log('❌ No OTP columns found. Adding them...');
      
      // Add missing columns
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(255),
        ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP,
        ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_otp_sent TIMESTAMP
      `);
      
      console.log('✅ OTP columns added successfully');
    } else {
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
    // Test a user record
    const userResult = await pool.query('SELECT id, email, email_verification_code IS NOT NULL as has_code, otp_attempts FROM users LIMIT 1');
    if (userResult.rows.length > 0) {
      console.log('👤 Sample user record:', userResult.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error checking OTP columns:', error.message);
  }
  process.exit(0);
}

checkOtpColumns();
