const pool = require('../config/database');

class OrderPostgres {
  static async create(userId, orderData) {
    const { items, shippingAddress, paymentMethod, totalAmount } = orderData;
    
    const query = `
      INSERT INTO orders (
        user_id, 
        status, 
        total_amount, 
        shipping_address, 
        payment_method, 
        created_at, 
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, user_id, status, total_amount, shipping_address, payment_method, created_at, updated_at
    `;
    
    try {
      const result = await pool.query(query, [
        userId,
        'pending',
        totalAmount,
        JSON.stringify(shippingAddress),
        paymentMethod
      ]);
      
      const order = result.rows[0];
      
      // Insert order items
      for (const item of items) {
        await this.addOrderItem(order.id, item);
      }
      
      return order;
    } catch (error) {
      console.error('Create order error:', error);
      throw new Error('Failed to create order');
    }
  }

  static async addOrderItem(orderId, item) {
    const query = `
      INSERT INTO order_items (
        order_id, 
        product_id, 
        quantity, 
        price, 
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `;
    
    try {
      await pool.query(query, [
        orderId,
        item.product_id,
        item.quantity,
        item.price
      ]);
    } catch (error) {
      console.error('Add order item error:', error);
      throw new Error('Failed to add order item');
    }
  }

  static async getUserOrders(userId, limit = 10, offset = 0) {
    const query = `
      SELECT 
        o.id,
        o.user_id,
        o.status,
        o.total_amount,
        o.shipping_address,
        o.payment_method,
        o.created_at,
        o.updated_at,
        json_agg(
          json_build_object(
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'product_name', p.name,
            'product_images', p.images
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = $1
      GROUP BY o.id, o.user_id, o.status, o.total_amount, o.shipping_address, o.payment_method, o.created_at, o.updated_at
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await pool.query(query, [userId, limit, offset]);
      
      return result.rows.map(row => ({
        ...row,
        items: row.items || [],
        shippingAddress: typeof row.shipping_address === 'string' 
          ? JSON.parse(row.shipping_address) 
          : row.shipping_address
      }));
    } catch (error) {
      console.error('Get user orders error:', error);
      throw new Error('Failed to fetch user orders');
    }
  }

  static async getAllOrders(limit = 10, offset = 0) {
    const query = `
      SELECT 
        o.id,
        o.user_id,
        o.status,
        o.total_amount,
        o.shipping_address,
        o.payment_method,
        o.created_at,
        o.updated_at,
        u.name as user_name,
        u.email as user_email,
        json_agg(
          json_build_object(
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'product_name', p.name,
            'product_images', p.images
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN users u ON o.user_id = u.id
      GROUP BY o.id, o.user_id, o.status, o.total_amount, o.shipping_address, o.payment_method, o.created_at, o.updated_at, u.name, u.email
      ORDER BY o.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    try {
      const result = await pool.query(query, [limit, offset]);
      
      return result.rows.map(row => ({
        ...row,
        items: row.items || [],
        shippingAddress: typeof row.shipping_address === 'string' 
          ? JSON.parse(row.shipping_address) 
          : row.shipping_address
      }));
    } catch (error) {
      console.error('Get all orders error:', error);
      throw new Error('Failed to fetch all orders');
    }
  }

  static async updateOrderStatus(orderId, status) {
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, status, updated_at
    `;
    
    try {
      const result = await pool.query(query, [status, orderId]);
      
      if (result.rows.length === 0) {
        throw new Error('Order not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Update order status error:', error);
      throw new Error('Failed to update order status');
    }
  }

  static async countOrders(userId = null) {
    try {
      let query, params;
      
      if (userId) {
        query = 'SELECT COUNT(*) as count FROM orders WHERE user_id = $1';
        params = [userId];
      } else {
        query = 'SELECT COUNT(*) as count FROM orders';
        params = [];
      }
      
      const result = await pool.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Count orders error:', error);
      throw new Error('Failed to count orders');
    }
  }

  static async getOrderById(orderId) {
    const query = `
      SELECT 
        o.id,
        o.user_id,
        o.status,
        o.total_amount,
        o.shipping_address,
        o.payment_method,
        o.created_at,
        o.updated_at,
        u.name as user_name,
        u.email as user_email,
        json_agg(
          json_build_object(
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'product_name', p.name,
            'product_images', p.images,
            'product_brand', p.brand
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
      GROUP BY o.id, o.user_id, o.status, o.total_amount, o.shipping_address, o.payment_method, o.created_at, o.updated_at, u.name, u.email
    `;
    
    try {
      const result = await pool.query(query, [orderId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const order = result.rows[0];
      return {
        ...order,
        items: order.items || [],
        shippingAddress: typeof order.shipping_address === 'string' 
          ? JSON.parse(order.shipping_address) 
          : order.shipping_address
      };
    } catch (error) {
      console.error('Get order by ID error:', error);
      throw new Error('Failed to fetch order');
    }
  }
}

module.exports = OrderPostgres;
