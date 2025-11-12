import { Product, CreateProductRequest } from '../../schemas/product';
import { IProductRepository } from '../interfaces/IProductRepository';

export class InMemoryProductRepository implements IProductRepository {
  private products: Product[] = [
    { id: '1', name: 'Laptop', description: 'Powerful laptop for development', price: 2500, inStock: true },
    { id: '2', name: 'Keyboard', description: 'Mechanical keyboard', price: 150, inStock: true },
    { id: '3', name: 'Monitor', description: '27" 4K monitor', price: 800, inStock: false },
  ];
  private nextId = 4;

  findAll(): Product[] {
    return [...this.products];
  }

  findById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  create(data: CreateProductRequest): Product {
    const newProduct: Product = {
      id: String(this.nextId++),
      ...data,
      inStock: data.inStock !== undefined ? data.inStock : true,
    };
    this.products.push(newProduct);
    return newProduct;
  }

  update(id: string, data: Partial<Product>): Product | undefined {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    
    this.products[index] = { ...this.products[index], ...data };
    return this.products[index];
  }

  delete(id: string): boolean {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    this.products.splice(index, 1);
    return true;
  }
}
