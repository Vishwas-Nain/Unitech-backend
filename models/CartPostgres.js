const pool = require('../config/database');
const ProductPostgres = require('./ProductPostgres');

class CartPostgres {
  static async getUserCart(userId) {
    const query = `
      SELECT 
        c.id,
        c.user_id,
        c.product_id,
        c.quantity,
        c.created_at,
        c.updated_at,
        p.name as product_name,
        p.price,
        p.images,
        p.stock
      FROM carts c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Calculate totals
      const items = result.rows.map(row => ({
        id: row.id, // Use cart item ID, not product ID
        product_id: row.product_id, // Keep product ID separate
        name: row.product_name,
        price: parseFloat(row.price),
        quantity: row.quantity,
        images: row.images || [],
        stock: row.stock,
        addedAt: row.created_at
      }));
      
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return {
        items,
        totalItems,
        totalPrice: parseFloat(totalPrice.toFixed(2))
      };
    } catch (error) {
      throw error;
    }
  }

  static async addToCart(userId, productId, quantity) {
    // Check if product exists and has stock using ProductPostgres
    const product = await ProductPostgres.findById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    if (product.stock < quantity) {
      throw new Error(`Insufficient stock. Only ${product.stock} items available.`);
    }
    
    // Check if item already in cart
    const existingQuery = 'SELECT id, quantity FROM carts WHERE user_id = $1 AND product_id = $2';
    const existingResult = await pool.query(existingQuery, [userId, productId]);
    
    try {
      if (existingResult.rows.length > 0) {
        // Update existing item
        const newQuantity = existingResult.rows[0].quantity + quantity;
        const updateQuery = `
          UPDATE carts 
          SET quantity = $1, updated_at = NOW() 
          WHERE user_id = $2 AND product_id = $3
          RETURNING *
        `;
        await pool.query(updateQuery, [newQuantity, userId, productId]);
      } else {
        // Add new item
        const insertQuery = `
          INSERT INTO carts (user_id, product_id, quantity, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING *
        `;
        await pool.query(insertQuery, [userId, productId, quantity]);
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  static async updateCartItem(userId, productId, quantity) {
    if (quantity <= 0) {
      return this.removeFromCart(userId, productId);
    }
    
    const query = `
      UPDATE carts 
      SET quantity = $1, updated_at = NOW() 
      WHERE user_id = $2 AND product_id = $3
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [quantity, userId, productId]);
      
      if (result.rows.length === 0) {
        throw new Error('Cart item not found');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async removeFromCart(userId, productId) {
    const query = 'DELETE FROM carts WHERE user_id = $1 AND product_id = $2 RETURNING *';
    
    try {
      const result = await pool.query(query, [userId, productId]);
      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  static async clearCart(userId) {
    const query = 'DELETE FROM carts WHERE user_id = $1';
    
    try {
      await pool.query(query, [userId]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getCartItemCount(userId) {
    const query = `
      SELECT COALESCE(SUM(quantity), 0) as total_items
      FROM carts
      WHERE user_id = $1
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return parseInt(result.rows[0].total_items);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CartPostgres;
