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

  // Admin management methods
  static async findAllUsers(skip = 0, limit = 10) {
    const query = `
      SELECT id, name, email, mobile, is_verified, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    try {
      console.log('Executing query:', query, 'with params:', [limit, skip]);
      const result = await pool.query(query, [limit, skip]);
      console.log('Query result:', result.rows.length, 'rows found');
      console.log('Sample row:', result.rows[0]);
      return result.rows;
    } catch (error) {
      console.error('Database error in findAllUsers:', error);
      throw error;
    }
  }

  static async countUsers() {
    const query = `
      SELECT COUNT(*) as total
      FROM users
    `;
    
    try {
      console.log('Executing count query:', query);
      const result = await pool.query(query);
      const total = parseInt(result.rows[0].total);
      console.log('Total users count:', total);
      return total;
    } catch (error) {
      console.error('Database error in countUsers:', error);
      throw error;
    }
  }

  static async createUser(userData) {
    const { name, email, mobile, password, role = 'user', is_verified = true } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const query = `
      INSERT INTO users (name, email, mobile, password, role, is_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, name, email, mobile, role, is_verified, created_at
    `;
    
    try {
      const result = await pool.query(query, [name, email, mobile, hashedPassword, role, is_verified]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async updateUser(id, userData) {
    const { name, email, mobile, role, is_verified } = userData;
    
    const query = `
      UPDATE users
      SET name = $1, email = $2, mobile = $3, role = $4, is_verified = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING id, name, email, mobile, role, is_verified, created_at, updated_at
    `;
    
    try {
      const result = await pool.query(query, [name, email, mobile, role, is_verified, id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async deleteUser(id) {
    const query = `
      DELETE FROM users
      WHERE id = $1
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserPostgres;
