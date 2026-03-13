const pool = require('../config/database');

class ProductPostgres {
  static async findById(productId) {
    const query = `
      SELECT 
        id,
        name,
        description,
        price,
        images,
        category,
        subcategory,
        stock,
        is_active,
        created_at,
        updated_at
      FROM products 
      WHERE id = $1 AND is_active = true
    `;
    
    try {
      const result = await pool.query(query, [productId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const product = result.rows[0];
      
      // Parse JSON fields if needed
      if (product.images && typeof product.images === 'string') {
        product.images = JSON.parse(product.images);
      }
      
      return product;
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT 
        id,
        name,
        description,
        price,
        images,
        category,
        subcategory,
        stock,
        is_active,
        created_at,
        updated_at
      FROM products 
      WHERE is_active = true
    `;
    const params = [];
    let paramIndex = 1;

    // Add category filter
    if (filters.category) {
      query += ` AND category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    // Add subcategory filter
    if (filters.subcategory) {
      query += ` AND subcategory = $${paramIndex}`;
      params.push(filters.subcategory);
      paramIndex++;
    }

    // Add search filter
    if (filters.search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
      paramIndex += 2;
    }

    // Add price range filter
    if (filters.minPrice !== undefined) {
      query += ` AND price >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }

    if (filters.maxPrice !== undefined) {
      query += ` AND price <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }

    // Add sorting
    query += ` ORDER BY created_at DESC`;

    // Add pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    try {
      const result = await pool.query(query, params);
      
      const products = result.rows.map(product => {
        // Parse JSON fields if needed
        if (product.images && typeof product.images === 'string') {
          product.images = JSON.parse(product.images);
        }
        return product;
      });
      
      return products;
    } catch (error) {
      throw error;
    }
  }

  static async updateStock(productId, quantityChange) {
    const query = `
      UPDATE products 
      SET stock = stock + $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
      RETURNING stock
    `;
    
    try {
      const result = await pool.query(query, [quantityChange, productId]);
      
      if (result.rows.length === 0) {
        throw new Error('Product not found or inactive');
      }
      
      return result.rows[0].stock;
    } catch (error) {
      throw error;
    }
  }

  static async checkStock(productId, requiredQuantity) {
    const query = `
      SELECT stock 
      FROM products 
      WHERE id = $1 AND is_active = true
    `;
    
    try {
      const result = await pool.query(query, [productId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].stock;
    } catch (error) {
      throw error;
    }
  }

  static async getCategoryStats() {
    const query = `
      SELECT 
        category,
        COUNT(*) as count,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price) as avg_price
      FROM products 
      WHERE is_active = true
      GROUP BY category
      ORDER BY count DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getFeaturedProducts(limit = 8) {
    const query = `
      SELECT 
        id,
        name,
        description,
        price,
        images,
        category,
        subcategory,
        stock,
        is_active,
        created_at,
        updated_at
      FROM products 
      WHERE is_active = true
      ORDER BY updated_at DESC
      LIMIT $1
    `;
    
    try {
      const result = await pool.query(query, [limit]);
      
      const products = result.rows.map(product => {
        if (product.images && typeof product.images === 'string') {
          product.images = JSON.parse(product.images);
        }
        return product;
      });
      
      return products;
    } catch (error) {
      throw error;
    }
  }

  static async create(productData) {
    const { name, description, price, category, subcategory, stock, images } = productData;
    
    const query = `
      INSERT INTO products (name, description, price, category, subcategory, stock, images, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, name, description, price, category, subcategory, stock, images, created_at, updated_at
    `;
    
    try {
      const result = await pool.query(query, [
        name, 
        description, 
        price, 
        category, 
        subcategory || null, 
        stock || 0, 
        images ? JSON.stringify(images) : '[]', 
        true
      ]);
      
      const product = result.rows[0];
      
      // Parse JSON fields if needed
      if (product.images && typeof product.images === 'string') {
        product.images = JSON.parse(product.images);
      }
      
      return product;
    } catch (error) {
      throw error;
    }
  }

  static async update(id, productData) {
    const { name, description, price, category, subcategory, stock, images } = productData;
    
    const query = `
      UPDATE products 
      SET name = $1, description = $2, price = $3, category = $4, subcategory = $5, stock = $6, images = $7, updated_at = NOW()
      WHERE id = $8 AND is_active = true
      RETURNING id, name, description, price, category, subcategory, stock, images, created_at, updated_at
    `;
    
    try {
      const result = await pool.query(query, [
        name, 
        description, 
        price, 
        category, 
        subcategory || null, 
        stock, 
        images ? JSON.stringify(images) : '[]', 
        id
      ]);
      
      const product = result.rows[0];
      
      // Parse JSON fields if needed
      if (product.images && typeof product.images === 'string') {
        product.images = JSON.parse(product.images);
      }
      
      return product;
    } catch (error) {
      throw error;
    }
  }

  static async deleteProduct(id) {
    const query = `
      UPDATE products 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async countProducts() {
    const query = `
      SELECT COUNT(*) as total
      FROM products 
      WHERE is_active = true
    `;
    
    try {
      const result = await pool.query(query);
      return parseInt(result.rows[0].total);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ProductPostgres;
