# Fullstack Monorepo - Proof of Concept

Монорепо проект с React 19 фронтенд и Express бекенд с **автоматична TypeScript генерация от Swagger**.

## 🚀 Quick Start

Проектът е **вече стартиран** и работи:

- **Frontend**: <http://localhost:5173>
- **Backend**: <http://localhost:3000>
- **Swagger UI**: <http://localhost:3000/api-docs>

### Стартиране

```bash
npm run dev  # Генерира типове и стартира backend + frontend
```

TypeScript типовете се генерират **автоматично** при всеки dev старт от Swagger спецификацията.

### Ръчно генериране на типове

```bash
npm run generate:types
```

За повече информация вижте [QUICKSTART.md](./QUICKSTART.md) и [TYPE_GENERATION.md](./TYPE_GENERATION.md)

## 📋 Документация

### Стартиране и Setup
- **[QUICKSTART.md](./QUICKSTART.md)** - Бързи инструкции за стартиране
- **[USAGE.md](./USAGE.md)** - Пълна документация за употреба
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Технически детайли

### Type Generation (⭐ Важно)
- **[AUTO_TYPE_GENERATION.md](./AUTO_TYPE_GENERATION.md)** - Автоматична генерация при dev старт
- **[TYPE_GENERATION.md](./TYPE_GENERATION.md)** - Пълно ръководство за типове
- **[PROP_RENAME_GUIDE.md](./PROP_RENAME_GUIDE.md)** - 🔧 Как да променяш property имена
- **[SWAGGER_INTEGRATION.md](./SWAGGER_INTEGRATION.md)** - Swagger интеграция

## 🎯 Features

### Landing Page с 3 таба

1. **👥 Потребители** - CRUD операции
2. **📦 Продукти** - Управление на продукти
3. **🛒 Поръчки** - Система за поръчки

## 💻 Технологии

### Frontend

- React 19.2.0
- Vite 6
- React Compiler 1.0.0
- React Router 7
- TanStack Query (React Query)
- Zod
- TypeScript

### Backend

- Express
- Swagger/OpenAPI
- Zod
- TypeScript

## Структура

```
fullstack/
├── packages/
│   ├── backend/     # Express API сървър
│   └── frontend/    # React приложение
└── package.json     # Root workspace конфигурация
```

## Инсталация

```bash
npm install
```

## Стартиране

### Развойна среда
```bash
npm run dev
```

Това ще стартира едновременно:
- Backend на http://localhost:3000
- Frontend на http://localhost:5173
- Swagger UI на http://localhost:3000/api-docs

### Отделно стартиране

Backend:
```bash
npm run dev:backend
```

Frontend:
```bash
npm run dev:frontend
```

## Генериране на типове от Swagger

```bash
npm run generate:types
```

Това автоматично генерира TypeScript типове от Swagger дефинициите и ги споделя между frontend и backend.
