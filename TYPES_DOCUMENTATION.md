# TypeScript Types - Споделени между Frontend и Backend

## Структура

### Backend Types
Типовете се дефинират чрез Zod схеми в `packages/backend/src/schemas/`:
- `user.ts` - User, CreateUserRequest
- `product.ts` - Product, CreateProductRequest  
- `order.ts` - Order, CreateOrderRequest

### Frontend Types
Типовете са копирани като TypeScript интерфейси в `packages/frontend/src/types/index.ts`:
- User
- CreateUserRequest
- Product
- CreateProductRequest
- Order
- CreateOrderRequest

## Пълна Type Safety

### API Client (`packages/frontend/src/api/client.ts`)
Всички API методи са типизирани:

```typescript
// ✅ Типизирани параметри и връщани стойности
usersApi.getAll(): Promise<User[]>
usersApi.create(user: CreateUserRequest): Promise<User>

productsApi.getAll(): Promise<Product[]>
productsApi.create(product: CreateProductRequest): Promise<Product>

ordersApi.getAll(): Promise<Order[]>
ordersApi.create(order: CreateOrderRequest): Promise<Order>
```

### Components
Всички компоненти използват правилните типове:

**UsersTab.tsx**
```typescript
import type { User } from "../types";

users?.map((user: User) => (
  // user.id, user.name, user.email, user.role са типизирани
))
```

**ProductsTab.tsx**
```typescript
import type { Product } from "../types";

products?.map((product: Product) => (
  // product.id, product.name, product.price са типизирани
))
```

**OrdersTab.tsx**
```typescript
import type { Order } from "../types";

orders?.map((order: Order) => (
  // order.id, order.status са типизирани
))
```

## Няма `any` типове!

✅ Целият проект е **100% типизиран**
✅ Няма `any` типове никъде
✅ TypeScript strict mode активен
✅ Пълна type safety от Backend до Frontend

## Validation

Backend използва Zod за runtime validation:
- Валидира заявките преди обработка
- Типовете се генерират автоматично от схемите

Frontend използва TypeScript за compile-time validation:
- Типовете гарантират правилност на данните
- IntelliSense показва всички полета

## Бъдещи подобрения

За автоматично синхронизиране на типовете:
1. Използвайте `swagger-typescript-api` (вече е в dependencies)
2. Генерирайте типове от Swagger: `npm run generate:types`
3. Типовете ще бъдат автоматично генерирани в `frontend/src/api/`

Засега типовете се споделят чрез ръчно копиране, което е добре за малки проекти.
