const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class UserPostgres {
  static async create(userData) {
    const { name, email, mobile, password, isVerified = false } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const query = `
      INSERT INTO users (name, email, mobile, password, is_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, name, email, mobile, is_verified, created_at
    `;
    
    try {
      const result = await pool.query(query, [name, email, mobile, hashedPassword, isVerified]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByEmailOrMobile(email, mobile) {
    const query = `
      SELECT id, name, email, mobile, password, is_verified, role, created_at, updated_at
      FROM users
      WHERE email = $1 OR mobile = $2
    `;
    
    try {
      const result = await pool.query(query, [email, mobile]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = `
      SELECT id, name, email, mobile, password, is_verified, role, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    
    try {
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT id, name, email, mobile, is_verified, role, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async createEmailOTP(userId, otp) {
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    const query = `
      UPDATE users
      SET email_verification_code = $1, email_verification_expires = $2, last_otp_sent = NOW(), updated_at = NOW()
      WHERE id = $3
      RETURNING id
    `;
    
    try {
      await pool.query(query, [hashedOtp, expiresAt, userId]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  static async verifyEmailOTP(userId, otp) {
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    
    const query = `
      UPDATE users
      SET is_verified = true, email_verification_code = NULL, email_verification_expires = NULL, 
          otp_attempts = 0, updated_at = NOW()
      WHERE id = $1 
        AND email_verification_code = $2 
        AND email_verification_expires > NOW()
        AND otp_attempts < 5
      RETURNING id, name, email, mobile, is_verified, role
    `;
    
    try {
      const result = await pool.query(query, [userId, hashedOtp]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async incrementOTPAttempts(userId) {
    const query = `
      UPDATE users
      SET otp_attempts = otp_attempts + 1, updated_at = NOW()
      WHERE id = $1
      RETURNING otp_attempts
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0]?.otp_attempts || 0;
    } catch (error) {
      throw error;
    }
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = UserPostgres;
