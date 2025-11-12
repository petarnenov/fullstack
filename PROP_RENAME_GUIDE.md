# 📝 Ръководство за преименуване на Property в Response

## Процес стъпка по стъпка

### Пример: Преименуване `userId` → `customerId` в Order

## ✅ Правилен Workflow

### Стъпка 1: Обнови Zod Schema

**Файл:** `packages/backend/src/schemas/order.ts`

```typescript
export const OrderSchema = z.object({
  id: z.string(),
  customerId: z.string(),  // ← Промяна от userId
  productId: z.string(),
  quantity: z.number(),
  total: z.number(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).optional(),
});

export const CreateOrderSchema = z.object({
  customerId: z.string().min(1),  // ← Промяна от userId
  productId: z.string().min(1),
  quantity: z.number().positive(),
});
```

### Стъпка 2: Обнови Swagger Спецификация

**Файл:** `packages/backend/src/swagger.ts`

```typescript
Order: {
  type: 'object',
  required: ['id', 'customerId', 'productId', 'quantity', 'total'],  // ← customerId
  properties: {
    id: {
      type: 'string',
      description: 'Order ID',
    },
    customerId: {  // ← Промяна от userId
      type: 'string',
      description: 'Customer ID',  // ← Обнови описанието
    },
    productId: {
      type: 'string',
      description: 'Product ID',
    },
    // ... останалите props
  },
},
CreateOrderRequest: {
  type: 'object',
  required: ['customerId', 'productId', 'quantity'],  // ← customerId
  properties: {
    customerId: {  // ← Промяна от userId
      type: 'string',
      description: 'Customer ID',
    },
    // ... останалите props
  },
}
```

### Стъпка 3: Обнови Backend Routes/Controllers

**Файл:** `packages/backend/src/routes/orders.ts`

```typescript
// Обнови mock данните
let orders: Order[] = [
  {
    id: '1',
    customerId: 'user1',  // ← Промяна от userId
    productId: 'prod1',
    quantity: 2,
    total: 199.98,
    status: 'completed',
  },
];

// Обнови създаването
router.post('/', async (req, res) => {
  const result = CreateOrderSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const newOrder: Order = {
    id: Date.now().toString(),
    customerId: result.data.customerId,  // ← Използвай новото име
    productId: result.data.productId,
    quantity: result.data.quantity,
    total: result.data.quantity * 99.99,
    status: 'pending',
  };

  orders.push(newOrder);
  res.status(201).json(newOrder);
});
```

### Стъпка 4: Генерирай TypeScript Типове

```bash
npm run generate:types
```

**Или рестартирай dev:**
```bash
# Ctrl+C за спиране
npm run dev  # Автоматично генерира типовете
```

**Резултат:**
```
✅ Swagger document generated
✔ data-contracts.ts created
✔ Api.ts created
✔ http-client.ts created
```

### Стъпка 5: TypeScript ще покаже грешки във Frontend

TypeScript компилаторът автоматично ще покаже **всички места** където трябва да обновиш кода:

```
src/components/OrdersTab.tsx:45:10 - error TS2339: 
Property 'userId' does not exist on type 'Order'. Did you mean 'customerId'?
```

### Стъпка 6: Обнови Frontend Компонентите

**Файл:** `packages/frontend/src/components/OrdersTab.tsx`

```typescript
// Преди
<p>
  <span className="label">User ID:</span> {order.userId}
</p>

// След
<p>
  <span className="label">Customer ID:</span> {order.customerId}
</p>

// При създаване
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  createMutation.mutate({
    customerId: customerId,  // ← Промяна от userId
    productId: productId,
    quantity: parseInt(quantity),
  });
};
```

### Стъпка 7: Тествай

```bash
# Build трябва да мине без грешки
npm run build

# Рестартирай dev
npm run dev
```

## 🎯 Ключови Принципи

### 1. Single Source of Truth
**Swagger спецификацията** (`swagger.ts`) е главният източник на истина.
- Промени там се разпространяват автоматично до frontend
- TypeScript компилаторът показва къде да обновиш кода

### 2. TypeScript е твоя приятел
- Компилаторът показва **всички места** за обновяване
- Невъзможно е да пропуснеш някое място
- Compile-time грешки > Runtime грешки

### 3. Автоматична генерация
- Никога **не редактирай ръчно** `frontend/src/api/generated/*`
- Винаги използвай `npm run generate:types`
- При `npm run dev` типовете се генерират автоматично

## 📋 Checklist за Промяна на Prop

- [ ] 1. Обнови Zod schema (`backend/src/schemas/*.ts`)
- [ ] 2. Обнови Swagger spec (`backend/src/swagger.ts`)
- [ ] 3. Обнови backend routes/controllers
- [ ] 4. Генерирай типове: `npm run generate:types`
- [ ] 5. Поправи TypeScript грешки във frontend (компилаторът ще ги покаже)
- [ ] 6. Тествай: `npm run build`
- [ ] 7. Стартирай: `npm run dev`

## ⚠️ Често Срещани Грешки

### ❌ Грешно: Директно редактиране на генерирани типове
```typescript
// НЕ ПРАВЕТЕ ТОВА!
// packages/frontend/src/api/generated/data-contracts.ts
export interface Order {
  customerId: string;  // Това ще се презапише!
}
```

### ✅ Правилно: Промяна в Swagger
```typescript
// packages/backend/src/swagger.ts
Order: {
  properties: {
    customerId: { type: 'string' }  // Промени тук!
  }
}
```

### ❌ Грешно: Забравяне на генерация
```bash
# Променил swagger.ts, но не генерирал типове
# Frontend все още вижда старите типове!
```

### ✅ Правилно: Винаги генерирай
```bash
npm run generate:types
# Или просто рестартирай dev
npm run dev
```

## 🔄 Пълен Пример с Код

### Backend Changes

```typescript
// 1. packages/backend/src/schemas/order.ts
export const OrderSchema = z.object({
  id: z.string(),
  customerId: z.string(),           // ← userId → customerId
  productId: z.string(),
  quantity: z.number(),
  total: z.number(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).optional(),
});

// 2. packages/backend/src/swagger.ts
Order: {
  required: ['id', 'customerId', 'productId', 'quantity', 'total'],
  properties: {
    customerId: {                    // ← userId → customerId
      type: 'string',
      description: 'Customer ID',
    },
    // ...
  }
}

// 3. packages/backend/src/routes/orders.ts
const newOrder: Order = {
  id: Date.now().toString(),
  customerId: result.data.customerId,  // ← userId → customerId
  productId: result.data.productId,
  quantity: result.data.quantity,
  total: result.data.quantity * 99.99,
  status: 'pending',
};
```

### Generate Types

```bash
npm run generate:types
```

### Frontend Updates (TypeScript ще покаже грешки)

```typescript
// packages/frontend/src/components/OrdersTab.tsx

// State
const [customerId, setCustomerId] = useState("");  // ← userId → customerId

// Form
<input
  value={customerId}                    // ← userId → customerId
  onChange={(e) => setCustomerId(e.target.value)}
  placeholder="Customer ID"
/>

// Submit
createMutation.mutate({
  customerId: customerId,               // ← userId → customerId
  productId: productId,
  quantity: parseInt(quantity),
});

// Display
<p>
  <span className="label">Customer:</span> {order.customerId}
</p>
```

## 🚀 Защо този процес е най-добър?

1. ✅ **Type Safety** - Компилаторът гарантира пълна синхронизация
2. ✅ **Една истина** - Swagger е единственият източник
3. ✅ **Автоматизация** - Генерацията е автоматична при dev старт
4. ✅ **Видимост** - TypeScript показва всички места за промяна
5. ✅ **Безопасност** - Невъзможно е да забравиш нещо

## 📚 Допълнителни Ресурси

- **[AUTO_TYPE_GENERATION.md](./AUTO_TYPE_GENERATION.md)** - Автоматична генерация
- **[TYPE_GENERATION.md](./TYPE_GENERATION.md)** - Пълно ръководство
- **[SWAGGER_INTEGRATION.md](./SWAGGER_INTEGRATION.md)** - Swagger интеграция
