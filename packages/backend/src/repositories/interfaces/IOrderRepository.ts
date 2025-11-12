import { Order, CreateOrderRequest } from '../../schemas/order';

export interface IOrderRepository {
  findAll(): Order[];
  findById(id: string): Order | undefined;
  create(data: CreateOrderRequest): Order;
  update(id: string, data: Partial<Order>): Order | undefined;
  delete(id: string): boolean;
}
