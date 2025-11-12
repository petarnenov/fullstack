import { Order, CreateOrderRequest } from '../../schemas/order';
import { IOrderRepository } from '../interfaces/IOrderRepository';

export class InMemoryOrderRepository implements IOrderRepository {
  private orders: Order[] = [
    { id: '1', customerId: '1', productId: '1', quantity: 1, total: 2500, status: 'completed' },
    { id: '2', customerId: '2', productId: '2', quantity: 2, total: 300, status: 'pending' },
  ];
  private nextId = 3;

  findAll(): Order[] {
    return [...this.orders];
  }

  findById(id: string): Order | undefined {
    return this.orders.find(o => o.id === id);
  }

  create(data: CreateOrderRequest): Order {
    const newOrder: Order = {
      id: String(this.nextId++),
      ...data,
      total: data.quantity * 100, // Example price calculation
      status: 'pending',
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  update(id: string, data: Partial<Order>): Order | undefined {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return undefined;
    
    this.orders[index] = { ...this.orders[index], ...data };
    return this.orders[index];
  }

  delete(id: string): boolean {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return false;
    
    this.orders.splice(index, 1);
    return true;
  }
}
