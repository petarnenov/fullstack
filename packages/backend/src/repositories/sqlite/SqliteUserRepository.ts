import { User, CreateUserRequest } from '../../schemas/user';
import { IUserRepository } from '../interfaces/IUserRepository';
import { db } from '../../db/database';

export class SqliteUserRepository implements IUserRepository {
  findAll(): User[] {
    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as 'admin' | 'user',
    }));
  }

  findById(id: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return undefined;
    
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as 'admin' | 'user',
    };
  }

  create(data: CreateUserRequest): User {
    const id = Date.now().toString();
    const role = data.role || 'user';
    
    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, role)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, data.name, data.email, role);
    
    return {
      id,
      name: data.name,
      email: data.email,
      role,
    };
  }

  update(id: string, data: Partial<User>): User | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }
    
    if (updates.length === 0) return existing;
    
    values.push(id);
    const stmt = db.prepare(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    
    return this.findById(id);
  }

  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
