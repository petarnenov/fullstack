import { IUserRepository } from './interfaces/IUserRepository';
import { IProductRepository } from './interfaces/IProductRepository';
import { IOrderRepository } from './interfaces/IOrderRepository';
import { InMemoryUserRepository } from './memory/InMemoryUserRepository';
import { InMemoryProductRepository } from './memory/InMemoryProductRepository';
import { InMemoryOrderRepository } from './memory/InMemoryOrderRepository';
import { SqliteUserRepository } from './sqlite/SqliteUserRepository';
import { SqliteProductRepository } from './sqlite/SqliteProductRepository';
import { SqliteOrderRepository } from './sqlite/SqliteOrderRepository';
import { TestSqliteUserRepository } from './test/TestSqliteUserRepository';
import { TestSqliteProductRepository } from './test/TestSqliteProductRepository';
import { TestSqliteOrderRepository } from './test/TestSqliteOrderRepository';

type RepositoryType = 'memory' | 'sqlite' | 'test';

export class RepositoryFactory {
  private static repositoryType: RepositoryType = 
    process.env.NODE_ENV === 'test' ? 'test' :
    process.env.USE_SQLITE === 'true' ? 'sqlite' : 'memory';

  static setRepositoryType(type: RepositoryType): void {
    this.repositoryType = type;
  }

  static getRepositoryType(): RepositoryType {
    return this.repositoryType;
  }

  static getUserRepository(): IUserRepository {
    if (this.repositoryType === 'test') {
      return new TestSqliteUserRepository();
    }
    if (this.repositoryType === 'sqlite') {
      return new SqliteUserRepository();
    }
    return new InMemoryUserRepository();
  }

  static getProductRepository(): IProductRepository {
    if (this.repositoryType === 'test') {
      return new TestSqliteProductRepository();
    }
    if (this.repositoryType === 'sqlite') {
      return new SqliteProductRepository();
    }
    return new InMemoryProductRepository();
  }

  static getOrderRepository(): IOrderRepository {
    if (this.repositoryType === 'test') {
      return new TestSqliteOrderRepository();
    }
    if (this.repositoryType === 'sqlite') {
      return new SqliteOrderRepository();
    }
    return new InMemoryOrderRepository();
  }
}
