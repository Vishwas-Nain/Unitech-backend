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
      console.error('❌ ProductPostgres.findById error:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    const {
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      page = 1,
      limit = 10
    } = filters;

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
    
    const queryParams = [];
    let paramIndex = 1;

    // Add filters
    if (category) {
      query += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (subcategory) {
      query += ` AND subcategory = $${paramIndex}`;
      queryParams.push(subcategory);
      paramIndex++;
    }

    if (brand) {
      query += ` AND brand = $${paramIndex}`;
      queryParams.push(brand);
      paramIndex++;
    }

    if (minPrice) {
      query += ` AND price >= $${paramIndex}`;
      queryParams.push(minPrice);
      paramIndex++;
    }

    if (maxPrice) {
      query += ` AND price <= $${paramIndex}`;
      queryParams.push(maxPrice);
      paramIndex++;
    }

    // Add sorting
    const validSortFields = ['name', 'price', 'created_at', 'updated_at'];
    const validSortOrders = ['ASC', 'DESC'];
    
    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
      query += ` ORDER BY ${sortBy} ${sortOrder}`;
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    try {
      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async create(productData) {
    const {
      name,
      description,
      price,
      images = [],
      category,
      subcategory,
      brand,
      stock = 0
    } = productData;

    const query = `
      INSERT INTO products (
        name, description, price, images, category, 
        subcategory, brand, stock, is_active, 
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW()
      ) RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        name,
        description,
        price,
        JSON.stringify(images),
        category,
        subcategory,
        brand,
        stock
      ]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    const {
      name,
      description,
      price,
      images,
      category,
      subcategory,
      brand,
      stock
    } = updateData;

    const query = `
      UPDATE products 
      SET 
        name = $1,
        description = $2,
        price = $3,
        images = $4,
        category = $5,
        subcategory = $6,
        brand = $7,
        stock = $8,
        updated_at = NOW()
      WHERE id = $9 AND is_active = true
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        name,
        description,
        price,
        JSON.stringify(images),
        category,
        subcategory,
        brand,
        stock,
        id
      ]);
      return result.rows[0];
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
}

module.exports = ProductPostgres;
