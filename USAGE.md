# Монорепо проект - React 19 + Express + TypeScript

## 🚀 Възможности на проекта

Този proof of concept демонстрира:

- ✅ **React 19.2.0** с най-новите функции
- ✅ **Vite** за бързо development
- ✅ **React Compiler 1.0.0** за автоматична оптимизация
- ✅ **React Router** v7 за навигация
- ✅ **TanStack Query** (React Query) за data fetching
- ✅ **Zod** за валидация
- ✅ **Express** backend с TypeScript
- ✅ **Swagger/OpenAPI** документация
- ✅ **Автоматично генериране на TypeScript типове** от Swagger
- ✅ **Монорепо структура** с npm workspaces
- ✅ **Пълна TypeScript интеграция** FE ↔ BE
- ✅ **Micro Frontend Architecture** с Module Federation
- ✅ **SQLite Database** с Repository Pattern

## 📁 Структура

```
fullstack/
├── package.json                 # Root workspace
├── packages/
│   ├── backend/                # Express API
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── swagger.ts      # Swagger definition
│   │   │   ├── routes/         # API routes
│   │   │   │   ├── users.ts
│   │   │   │   ├── products.ts
│   │   │   │   └── orders.ts
│   │   │   └── schemas/        # Zod schemas
│   │   │       ├── user.ts
│   │   │       ├── product.ts
│   │   │       └── order.ts
│   │   └── package.json
│   ├── frontend/               # React app (host)
│   │   ├── src/
│   │   │   ├── main.tsx        # Entry point
│   │   │   ├── App.tsx         # Main app
│   │   │   ├── api/            # API client
│   │   │   │   └── client.ts
│   │   │   └── pages/          # Page components
│   │   │       ├── UsersTab.tsx
│   │   │       ├── ProductsTab.tsx
│   │   │       ├── OrdersTab.tsx
│   │   │       └── TypeExamplesPage.tsx
│   │   └── package.json
│   └── micro-frontend/         # Micro frontend (remote)
│       ├── src/
│       │   ├── main.tsx        # Entry point
│       │   ├── App.tsx         # Standalone mode
│       │   └── pages/
│       │       └── MicroPage.tsx  # Exported component
│       └── package.json
```

## 🎯 Landing Page Features

Landing page-ът съдържа **5 таба**:

1. **👥 Потребители** - CRUD операции с потребители
   - Изглед на всички потребители
   - Добавяне на нов потребител
   - Роли (admin/user)
   - Валидация с Zod

2. **📦 Продукти** - Управление на продукти
   - Изглед на продукти с цени
   - Добавяне на нови продукти
   - Статус на наличност
   - Валидация на цени

3. **🛒 Поръчки** - Система за поръчки
   - Изглед на всички поръчки
   - Създаване на нова поръчка
   - Статус на поръчката (pending, processing, completed, cancelled)
   - Автоматично изчисление на цени

4. **🎯 Type Examples** - TypeScript типове и utilities
   - Демонстрация на напреднали TypeScript техники
   - Custom hooks и utilities
   - Type-safe компоненти

5. **🎨 Micro Frontend** - Module Federation демонстрация
   - Зареждане на компонент от отделен micro frontend
   - Runtime code sharing с Module Federation
   - Shared React 19 singleton
   - Независимо deployment

## 🚀 Стартиране

### Инсталация
```bash
npm install
```

### Development (едновременно FE + BE)
```bash
npm run dev
```

Това стартира:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **Micro Frontend**: http://localhost:5174 (preview mode)
- **Swagger UI**: http://localhost:3000/api-docs

### Отделно стартиране

Backend:
```bash
npm run dev:backend
```

Frontend:
```bash
npm run dev:frontend
```

Micro Frontend:
```bash
npm run dev:micro  # Стартира в preview mode
```

### Build

Всички пакети:
```bash
npm run build
```

Отделен пакет:
```bash
npm run build:backend
npm run build:frontend
npm run build:micro
```

## 🔄 TypeScript интеграция от Swagger

Backend генерира Swagger документация, която може да се използва за автоматично генериране на TypeScript типове за Frontend:

```bash
npm run generate:types
```

Това извършва:
1. Генерира `swagger.json` от TypeScript дефиницията
2. Използва `swagger-typescript-api` за създаване на типизиран API клиент
3. Споделя типовете между backend и frontend

## 🎨 UI/UX Features

- Градиентен фон с красиви цветове
- Анимации при превключване на табовете
- Responsive карти за данните
- Цветни badges за статуси
- Формуляри за добавяне на нови записи
- Real-time обновяване след мутации чрез React Query
- Loading states и error handling

## 🛠️ Технологии

### Frontend (Host App)
- **React 19.2.0** - Най-новата версия на React
- **Vite 6** - Модерен build tool
- **React Compiler 1.0.0** - Официален компилатор за автоматична оптимизация
- **React Router 7** - Client-side routing
- **TanStack Query 5** - Powerful data synchronization
- **Axios** - HTTP клиент
- **Zod** - TypeScript-first schema validation
- **TypeScript 5.6** - Static type checking
- **Module Federation** - @originjs/vite-plugin-federation

### Micro Frontend (Remote App)
- **React 19.2.0** - Споделен като singleton с host app
- **Vite 6** - Build tool
- **TypeScript 5.6** - Static type checking
- **Module Federation** - @originjs/vite-plugin-federation
- **Lazy Loading** - Компонентът се зарежда динамично

### Backend
- **Express 4** - Web framework
- **Swagger/OpenAPI 3** - API документация
- **Swagger UI Express** - Интерактивна документация
- **Zod** - Schema validation
- **TypeScript 5.6** - Static type checking
- **tsx** - TypeScript execution engine

## 📝 API Endpoints

### Users
- `GET /api/users` - Списък с всички потребители
- `GET /api/users/:id` - Потребител по ID
- `POST /api/users` - Създаване на потребител

### Products
- `GET /api/products` - Списък с всички продукти
- `GET /api/products/:id` - Продукт по ID
- `POST /api/products` - Създаване на продукт

### Orders
- `GET /api/orders` - Списък с всички поръчки
- `GET /api/orders/:id` - Поръчка по ID
- `POST /api/orders` - Създаване на поръчка

## 🔥 React 19 Features

Проектът използва React 19.2 с:
- **React Compiler 1.0.0** - автоматична оптимизация без memo/useCallback
- **Новия JSX Transform** - подобрена производителност
- **Подобрен TypeScript support** - по-добри типове

## 🎓 Proof of Concept цели

1. ✅ **Монорепо setup** с npm workspaces
2. ✅ **Съвременен React stack** с React 19
3. ✅ **TypeScript навсякъде** - пълна типова сигурност
4. ✅ **Auto-generated types** от Swagger → Frontend
5. ✅ **Zod validation** на FE и BE
6. ✅ **React Query** за state management
7. ✅ **Express API** с Swagger документация
8. ✅ **Vite** за development experience
9. ✅ **React Compiler** интеграция
10. ✅ **Micro Frontend Architecture** с Module Federation
11. ✅ **SQLite Database** с Repository Pattern

## 🎨 Module Federation & Micro Frontend

Проектът включва micro frontend архитектура:

### Какво е Module Federation?

Module Federation позволява различни приложения да споделят код **по време на изпълнение**, а не по време на build. Това означава:

- **Независимо deployment** - Micro frontend може да се деплойва отделно
- **Споделени зависимости** - React се зарежда само веднъж (singleton)
- **Lazy loading** - Кодът се зарежда само когато е нужен
- **Изолация** - Всяко приложение може да работи самостоятелно

### Архитектура

- **Host App** (frontend:5173) - Главното приложение
- **Remote App** (micro-frontend:5174) - Micro frontend приложението

### Конфигурация

**Micro Frontend** експортва компонент:
```typescript
// vite.config.ts
federation({
  name: 'microFrontend',
  filename: 'remoteEntry.js',
  exposes: {
    './MicroPage': './src/pages/MicroPage',
  },
  shared: ['react', 'react-dom'],
})
```

**Host App** консумира компонента:
```typescript
// vite.config.ts
federation({
  name: 'hostApp',
  remotes: {
    microFrontend: 'http://localhost:5174/assets/remoteEntry.js',
  },
  shared: ['react', 'react-dom'],
})
```

### Особености

- **Micro frontend работи в preview mode** - Използва build версията
- **React Compiler е disabled** в micro-frontend за съвместимост
- **React 19 singleton** - И двете приложения споделят един React instance
- **TypeScript declarations** - Типове за remote модулите

### Standalone Mode

Micro frontend може да работи самостоятелно:
```bash
cd packages/micro-frontend
npm run dev  # Стартира на port 5174 в standalone режим
```

### Production Build

```bash
npm run build:micro  # Build на micro frontend
npm run build:frontend  # Build на host app с референции към remote
```

## 📚 Swagger Documentation

Swagger UI е достъпен на http://localhost:3000/api-docs

Там може да:
- Преглеждате всички endpoints
- Тествате API заявки директно
- Виждате схемите на данните
- Експортирате OpenAPI спецификацията

## 🔧 Development Tips

1. **Hot Module Replacement** - И двата сървъра поддържат HMR
2. **TypeScript strict mode** - Максимална типова сигурност
3. **ESLint ready** - Можете да добавите ESLint конфигурация
4. **Git готов** - `.gitignore` вече е настроен

## 📦 Build за Production

```bash
npm run build
```

Това ще build-не и двата пакета.

---

**Готово!** Вашият fullstack monorepo проект е готов за разработка! 🎉
