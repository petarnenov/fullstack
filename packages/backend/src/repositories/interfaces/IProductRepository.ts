import { Product, CreateProductRequest } from '../../schemas/product';

export interface IProductRepository {
  findAll(): Product[];
  findById(id: string): Product | undefined;
  create(data: CreateProductRequest): Product;
  update(id: string, data: Partial<Product>): Product | undefined;
  delete(id: string): boolean;
}
