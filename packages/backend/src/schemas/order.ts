import { z } from 'zod';

export const OrderSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  productId: z.string(),
  quantity: z.number(),
  total: z.number(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).optional(),
});

export const CreateOrderSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().positive(),
});

export type Order = z.infer<typeof OrderSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;
