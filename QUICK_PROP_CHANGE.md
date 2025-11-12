# 🚀 Quick Reference - Промяна на API Property

## TL;DR

```bash
# 1. Промени Zod schema
vim packages/backend/src/schemas/order.ts

# 2. Промени Swagger spec
vim packages/backend/src/swagger.ts

# 3. Промени backend routes
vim packages/backend/src/routes/orders.ts

# 4. Генерирай типове (или просто рестартирай dev)
npm run dev

# 5. Поправи грешките които TypeScript показва във frontend
# 6. Готово! ✅
```

## Пример: `userId` → `customerId`

### 1. Zod Schema
```typescript
// packages/backend/src/schemas/order.ts
export const OrderSchema = z.object({
  customerId: z.string(),  // ← Промяна
});
```

### 2. Swagger
```typescript
// packages/backend/src/swagger.ts
Order: {
  properties: {
    customerId: { type: 'string' }  // ← Промяна
  }
}
```

### 3. Routes
```typescript
// packages/backend/src/routes/orders.ts
const newOrder: Order = {
  customerId: result.data.customerId,  // ← Промяна
};
```

### 4. Generate
```bash
npm run dev  # Автоматично генерира типове
```

### 5. Frontend (TypeScript ще покаже грешки)
```typescript
// Компилаторът казва: Property 'userId' does not exist
// Поправи на:
order.customerId  // ← Промяна
```

## ⚡ Защо това работи?

- **Swagger** = Single Source of Truth
- **Auto-generation** = Frontend типовете се създават автоматично
- **TypeScript** = Показва всички места за промяна
- **Zero manual sync** = Невъзможна десинхронизация

## 📚 Пълно ръководство

Виж **[PROP_RENAME_GUIDE.md](./PROP_RENAME_GUIDE.md)** за детайли.
