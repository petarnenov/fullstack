import { Order, CreateOrderRequest } from '../../schemas/order';
import { IOrderRepository } from '../interfaces/IOrderRepository';
import { db } from '../../db/database';

export class SqliteOrderRepository implements IOrderRepository {
  findAll(): Order[] {
    const stmt = db.prepare('SELECT * FROM orders ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      customerId: row.customer_id,
      productId: row.product_id,
      quantity: row.quantity,
      total: row.total_price,
    }));
  }

  findById(id: string): Order | undefined {
    const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return undefined;
    
    return {
      id: row.id,
      customerId: row.customer_id,
      productId: row.product_id,
      quantity: row.quantity,
      total: row.total_price,
    };
  }

  create(data: CreateOrderRequest): Order {
    const id = Date.now().toString();
    
    // Calculate total from product price lookup
    const productStmt = db.prepare('SELECT price FROM products WHERE id = ?');
    const product = productStmt.get(data.productId) as { price: number } | undefined;
    
    if (!product) {
      throw new Error(`Product with id ${data.productId} not found`);
    }
    
    const total = product.price * data.quantity;
    
    const stmt = db.prepare(`
      INSERT INTO orders (id, customer_id, product_id, quantity, total_price)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, data.customerId, data.productId, data.quantity, total);
    
    return {
      id,
      customerId: data.customerId,
      productId: data.productId,
      quantity: data.quantity,
      total,
    };
  }

  update(id: string, data: Partial<Order>): Order | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.customerId !== undefined) {
      updates.push('customer_id = ?');
      values.push(data.customerId);
    }
    if (data.productId !== undefined) {
      updates.push('product_id = ?');
      values.push(data.productId);
    }
    if (data.quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(data.quantity);
    }
    if (data.total !== undefined) {
      updates.push('total_price = ?');
      values.push(data.total);
    }
    
    if (updates.length === 0) return existing;
    
    values.push(id);
    const stmt = db.prepare(`
      UPDATE orders
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    
    return this.findById(id);
  }

  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
