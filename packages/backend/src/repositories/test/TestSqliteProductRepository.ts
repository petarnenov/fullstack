import { Product, CreateProductRequest } from '../../schemas/product';
import { IProductRepository } from '../interfaces/IProductRepository';
import { testDb } from '../../db/testDatabase';

export class TestSqliteProductRepository implements IProductRepository {
  findAll(): Product[] {
    const stmt = testDb.prepare('SELECT * FROM products ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      inStock: row.in_stock === 1,
    }));
  }

  findById(id: string): Product | undefined {
    const stmt = testDb.prepare('SELECT * FROM products WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return undefined;
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      inStock: row.in_stock === 1,
    };
  }

  create(data: CreateProductRequest): Product {
    const id = Date.now().toString();
    const inStock = data.inStock !== undefined ? data.inStock : true;
    
    const stmt = testDb.prepare(`
      INSERT INTO products (id, name, description, price, in_stock)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, data.name, data.description || null, data.price, inStock ? 1 : 0);
    
    return {
      id,
      name: data.name,
      description: data.description,
      price: data.price,
      inStock,
    };
  }

  update(id: string, data: Partial<Product>): Product | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.price !== undefined) {
      updates.push('price = ?');
      values.push(data.price);
    }
    if (data.inStock !== undefined) {
      updates.push('in_stock = ?');
      values.push(data.inStock ? 1 : 0);
    }
    
    if (updates.length === 0) return existing;
    
    values.push(id);
    const stmt = testDb.prepare(`
      UPDATE products
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    
    return this.findById(id);
  }

  delete(id: string): boolean {
    const stmt = testDb.prepare('DELETE FROM products WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
