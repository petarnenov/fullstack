import { User, CreateUserRequest } from '../../schemas/user';
import { IUserRepository } from '../interfaces/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
  ];
  private nextId = 3;

  findAll(): User[] {
    return [...this.users];
  }

  findById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  create(data: CreateUserRequest): User {
    const newUser: User = {
      id: String(this.nextId++),
      ...data,
      role: data.role || 'user',
    };
    this.users.push(newUser);
    return newUser;
  }

  update(id: string, data: Partial<User>): User | undefined {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    
    this.users[index] = { ...this.users[index], ...data };
    return this.users[index];
  }

  delete(id: string): boolean {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  }
}
