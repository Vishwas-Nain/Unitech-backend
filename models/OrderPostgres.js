const pool = require('../config/database');

class OrderPostgres {
  static async create(userId, orderData) {
    console.log('🛒 OrderPostgres.create called:', {
      userId,
      orderData: {
        itemsCount: orderData.items?.length || 0,
        paymentMethod: orderData.paymentMethod,
        totalAmount: orderData.totalAmount
      }
    });
    
    const { items, shippingAddress, paymentMethod, totalAmount } = orderData;
    
    const query = `
      INSERT INTO orders (
        order_number,
        user_id, 
        status, 
        total, 
        shipping_address, 
        payment_method, 
        order_items,
        created_at, 
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, user_id, status, total, shipping_address, payment_method, order_items, created_at, updated_at
    `;
    
    try {
      // Generate order number
      const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      const result = await pool.query(query, [
        orderNumber,
        userId,
        'pending',
        totalAmount,
        JSON.stringify(shippingAddress),
        paymentMethod,
        JSON.stringify(items) // Store items as JSONB
      ]);
      
      const order = result.rows[0];
      console.log('✅ Order created successfully:', { orderId: order.id, orderNumber });
      
      return order;
    } catch (error) {
      console.error('❌ Create order error:', error);
      throw new Error('Failed to create order');
    }
  }

  static async addOrderItem(orderId, item) {
    console.log('🛒 OrderPostgres.addOrderItem called:', {
      orderId,
      item: {
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }
    });
    
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
      const result = await pool.query(query, [
        orderId,
        item.product_id,
        item.quantity,
        item.price
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ OrderPostgres.addOrderItem error:', error);
      throw error;
    }
  }

  static async getUserOrders(userId, limit = 10, offset = 0) {
    const query = `
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.status,
        o.total,
        o.shipping_address,
        o.payment_method,
        o.order_items,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await pool.query(query, [userId, limit, offset]);
      
      return result.rows.map(row => {
        // Parse JSONB order_items
        let items = [];
        if (row.order_items) {
          try {
            const orderItems = typeof row.order_items === 'string' 
              ? JSON.parse(row.order_items) 
              : row.order_items;
            items = orderItems;
          } catch (parseError) {
            console.error('Error parsing order_items:', parseError);
            items = [];
          }
        }
        
        return {
          ...row,
          items,
          totalAmount: row.total, // Map total to totalAmount for consistency
          shippingAddress: typeof row.shipping_address === 'string' 
            ? JSON.parse(row.shipping_address) 
            : row.shipping_address,
          // Remove raw JSONB fields from response
          order_items: undefined,
          shipping_address: undefined,
          total: undefined // Remove original total field
        };
      });
    } catch (error) {
      console.error('Get user orders error:', error);
      throw new Error('Failed to fetch user orders');
    }
  }

  static async getAllOrders(limit = 10, offset = 0) {
    const query = `
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.status,
        o.total,
        o.shipping_address,
        o.payment_method,
        o.order_items,
        o.created_at,
        o.updated_at,
        u.name as user_name,
        u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    try {
      const result = await pool.query(query, [limit, offset]);
      
      return result.rows.map(row => {
        // Parse JSONB order_items and enrich with product data
        let items = [];
        if (row.order_items) {
          try {
            const orderItems = typeof row.order_items === 'string' 
              ? JSON.parse(row.order_items) 
              : row.order_items;
            
            // For now, return basic order items without product details
            // TODO: Enrich with product data if needed
            items = orderItems;
          } catch (parseError) {
            console.error('Error parsing order_items:', parseError);
            items = [];
          }
        }
        
        return {
          ...row,
          items,
          totalAmount: row.total, // Map total to totalAmount for consistency
          shippingAddress: typeof row.shipping_address === 'string' 
            ? JSON.parse(row.shipping_address) 
            : row.shipping_address,
          // Remove raw JSONB fields from response
          order_items: undefined,
          shipping_address: undefined,
          total: undefined // Remove original total field
        };
      });
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
        o.order_number,
        o.user_id,
        o.status,
        o.total,
        o.shipping_address,
        o.payment_method,
        o.order_items,
        o.created_at,
        o.updated_at,
        u.name as user_name,
        u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `;
    
    try {
      const result = await pool.query(query, [orderId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const order = result.rows[0];
      
      // Parse JSONB order_items
      let items = [];
      if (order.order_items) {
        try {
          const orderItems = typeof order.order_items === 'string' 
            ? JSON.parse(order.order_items) 
            : order.order_items;
          items = orderItems;
        } catch (parseError) {
          console.error('Error parsing order_items:', parseError);
          items = [];
        }
      }
      
      return {
        ...order,
        items,
        totalAmount: order.total, // Map total to totalAmount for consistency
        shippingAddress: typeof order.shipping_address === 'string' 
          ? JSON.parse(order.shipping_address) 
          : order.shipping_address,
        // Remove raw JSONB fields from response
        order_items: undefined,
        shipping_address: undefined,
        total: undefined // Remove original total field
      };
    } catch (error) {
      console.error('Get order by ID error:', error);
      throw new Error('Failed to fetch order');
    }
  }
}

module.exports = OrderPostgres;
