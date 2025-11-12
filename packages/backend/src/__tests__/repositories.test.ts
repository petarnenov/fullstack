import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { RepositoryFactory } from '../repositories/RepositoryFactory';
import { initializeTestDatabase, seedTestDatabase, clearTestDatabase, closeTestDatabase } from '../db/testDatabase';

describe('User Repository Tests', () => {
  beforeEach(() => {
    // Set to test mode
    RepositoryFactory.setRepositoryType('test');
    initializeTestDatabase();
    clearTestDatabase();
    seedTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  it('should find all users', () => {
    const userRepo = RepositoryFactory.getUserRepository();
    const users = userRepo.findAll();
    
    expect(users).toHaveLength(2);
    expect(users[0].email).toBe('admin@example.com');
  });

  it('should find user by id', () => {
    const userRepo = RepositoryFactory.getUserRepository();
    const user = userRepo.findById('test-1');
    
    expect(user).toBeDefined();
    expect(user?.name).toBe('Test User');
    expect(user?.email).toBe('test@example.com');
  });

  it('should create new user', () => {
    const userRepo = RepositoryFactory.getUserRepository();
    const newUser = userRepo.create({
      name: 'New Test User',
      email: 'newuser@example.com',
      role: 'user',
    });
    
    expect(newUser.id).toBeDefined();
    expect(newUser.name).toBe('New Test User');
    expect(newUser.email).toBe('newuser@example.com');
    
    const users = userRepo.findAll();
    expect(users).toHaveLength(3);
  });

  it('should update user', () => {
    const userRepo = RepositoryFactory.getUserRepository();
    const updated = userRepo.update('test-1', {
      name: 'Updated Name',
    });
    
    expect(updated).toBeDefined();
    expect(updated?.name).toBe('Updated Name');
    expect(updated?.email).toBe('test@example.com');
  });

  it('should delete user', () => {
    const userRepo = RepositoryFactory.getUserRepository();
    const deleted = userRepo.delete('test-1');
    
    expect(deleted).toBe(true);
    
    const user = userRepo.findById('test-1');
    expect(user).toBeUndefined();
    
    const users = userRepo.findAll();
    expect(users).toHaveLength(1);
  });

  it('should return undefined for non-existent user', () => {
    const userRepo = RepositoryFactory.getUserRepository();
    const user = userRepo.findById('non-existent');
    
    expect(user).toBeUndefined();
  });
});

describe('Product Repository Tests', () => {
  beforeEach(() => {
    RepositoryFactory.setRepositoryType('test');
    initializeTestDatabase();
    clearTestDatabase();
    seedTestDatabase();
  });

  it('should find all products', () => {
    const productRepo = RepositoryFactory.getProductRepository();
    const products = productRepo.findAll();
    
    expect(products).toHaveLength(2);
  });

  it('should create product with default inStock', () => {
    const productRepo = RepositoryFactory.getProductRepository();
    const newProduct = productRepo.create({
      name: 'New Product',
      description: 'Test product',
      price: 300,
    });
    
    expect(newProduct.inStock).toBe(true);
  });

  it('should handle boolean inStock conversion', () => {
    const productRepo = RepositoryFactory.getProductRepository();
    const product = productRepo.findById('test-p2');
    
    expect(product?.inStock).toBe(false);
  });
});

describe('Order Repository Tests', () => {
  beforeEach(() => {
    RepositoryFactory.setRepositoryType('test');
    initializeTestDatabase();
    clearTestDatabase();
    seedTestDatabase();
  });

  it('should calculate total from product price', () => {
    const orderRepo = RepositoryFactory.getOrderRepository();
    const newOrder = orderRepo.create({
      customerId: 'test-1',
      productId: 'test-p1',
      quantity: 3,
    });
    
    expect(newOrder.total).toBe(300); // 100 * 3
  });

  it('should throw error for non-existent product', () => {
    const orderRepo = RepositoryFactory.getOrderRepository();
    
    expect(() => {
      orderRepo.create({
        customerId: 'test-1',
        productId: 'non-existent',
        quantity: 1,
      });
    }).toThrow('Product with id non-existent not found');
  });
});
