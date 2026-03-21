const pool = require('../config/database');

class ProductPostgres {
  static async findById(productId) {
    console.log('📦 ProductPostgres.findById called with productId:', productId);
    
    const query = `
      SELECT 
        id,
        name,
        description,
        price,
        images,
        category,
        subcategory,
        brand,
        stock,
        is_active,
        created_at,
        updated_at
      FROM products 
      WHERE id = $1 AND is_active = true
    `;
    
    try {
      const result = await pool.query(query, [productId]);
      console.log('📦 ProductPostgres.findById result:', {
        productId,
        found: result.rows.length > 0,
        product: result.rows.length > 0 ? {
          id: result.rows[0].id,
          name: result.rows[0].name,
          stock: result.rows[0].stock
        } : null
      });
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const product = result.rows[0];
      
      // Handle images array (PostgreSQL returns array directly)
      if (!product.images) {
        product.images = [];
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
        brand,
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
        // Handle images array (PostgreSQL returns array directly)
        if (!product.images) {
          product.images = [];
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
        // Handle images array (PostgreSQL returns array directly)
        if (!product.images) {
          product.images = [];
        }
        return product;
      });
      
      return products;
    } catch (error) {
      throw error;
    }
  }

  static async create(productData) {
    const { name, description, price, category, subcategory, brand, stock, images } = productData;
    
    console.log('ProductPostgres.create called with:', productData);
    
    const query = `
      INSERT INTO products (name, description, price, category, subcategory, brand, stock, images, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, name, description, price, category, subcategory, brand, stock, images, created_at, updated_at
    `;
    
    try {
      const imagesArray = images && Array.isArray(images) ? images : [];
      
      console.log('Executing query with params:', {
        name, 
        description, 
        price, 
        category, 
        subcategory: subcategory || null, 
        brand: brand || null,
        stock: stock || 0, 
        imagesArray, 
        is_active: true
      });
      
      const result = await pool.query(query, [
        name, 
        description, 
        price, 
        category, 
        subcategory || null, 
        brand || null,
        stock || 0, 
        imagesArray, 
        true
      ]);
      
      const product = result.rows[0];
      
      console.log('Product created successfully:', product);
      return product;
    } catch (error) {
      console.error('ProductPostgres.create error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      });
      throw error;
    }
  }

  static async update(id, productData) {
    const { name, description, price, category, subcategory, brand, stock, images } = productData;
    
    const query = `
      UPDATE products 
      SET name = $1, description = $2, price = $3, category = $4, subcategory = $5, brand = $6, stock = $7, images = $8, updated_at = NOW()
      WHERE id = $9 AND is_active = true
      RETURNING id, name, description, price, category, subcategory, brand, stock, images, created_at, updated_at
    `;
    
    try {
      const imagesArray = images && Array.isArray(images) ? images : [];
      
      const result = await pool.query(query, [
        name, 
        description, 
        price, 
        category, 
        subcategory || null, 
        brand || null,
        stock, 
        imagesArray, 
        id
      ]);
      
      const product = result.rows[0];
      
      console.log('Product updated successfully:', product);
      return product;
    } catch (error) {
      console.error('ProductPostgres.update error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      });
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

  static async updateStock(productId, quantityChange) {
    const query = `
      UPDATE products 
      SET stock = stock + $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
      RETURNING id, stock, updated_at
    `;
    
    try {
      const result = await pool.query(query, [quantityChange, productId]);
      
      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

module.exports = ProductPostgres;
