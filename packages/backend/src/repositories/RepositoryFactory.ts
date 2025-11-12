import { IUserRepository } from './interfaces/IUserRepository';
import { IProductRepository } from './interfaces/IProductRepository';
import { IOrderRepository } from './interfaces/IOrderRepository';
import { InMemoryUserRepository } from './memory/InMemoryUserRepository';
import { InMemoryProductRepository } from './memory/InMemoryProductRepository';
import { InMemoryOrderRepository } from './memory/InMemoryOrderRepository';
import { SqliteUserRepository } from './sqlite/SqliteUserRepository';
import { SqliteProductRepository } from './sqlite/SqliteProductRepository';
import { SqliteOrderRepository } from './sqlite/SqliteOrderRepository';

type RepositoryType = 'memory' | 'sqlite';

export class RepositoryFactory {
  private static repositoryType: RepositoryType = 
    process.env.USE_SQLITE === 'true' ? 'sqlite' : 'memory';

  static setRepositoryType(type: RepositoryType): void {
    this.repositoryType = type;
  }

  static getRepositoryType(): RepositoryType {
    return this.repositoryType;
  }

  static getUserRepository(): IUserRepository {
    if (this.repositoryType === 'sqlite') {
      return new SqliteUserRepository();
    }
    return new InMemoryUserRepository();
  }

  static getProductRepository(): IProductRepository {
    if (this.repositoryType === 'sqlite') {
      return new SqliteProductRepository();
    }
    return new InMemoryProductRepository();
  }

  static getOrderRepository(): IOrderRepository {
    if (this.repositoryType === 'sqlite') {
      return new SqliteOrderRepository();
    }
    return new InMemoryOrderRepository();
  }
}
