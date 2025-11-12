# 📁 Структура на проекта

## Root Level

```
fullstack/
├── package.json              # Root workspace конфигурация
├── package-lock.json         # Lock file за dependencies
├── .gitignore               # Git ignore правила
├── README.md                # Основна документация
├── QUICKSTART.md            # Бързи инструкции
├── USAGE.md                 # Пълна документация
├── PROJECT_SUMMARY.md       # Технически детайли
└── packages/                # Монорепо пакети
    ├── backend/             # Express API
    └── frontend/            # React App
```

## Backend Package (`packages/backend/`)

```
backend/
├── package.json             # Backend зависимости
├── tsconfig.json           # TypeScript конфигурация
└── src/
    ├── index.ts            # Entry point - Express сървър
    ├── swagger.ts          # OpenAPI/Swagger дефиниция
    ├── generateSwagger.ts  # Генератор на swagger.json
    ├── schemas/            # Zod валидационни схеми
    │   ├── user.ts        # User schema
    │   ├── product.ts     # Product schema
    │   └── order.ts       # Order schema
    └── routes/             # API endpoints
        ├── users.ts       # Users CRUD
        ├── products.ts    # Products CRUD
        └── orders.ts      # Orders CRUD
```

### Backend файлове - описание

**index.ts** - Главният файл на backend
- Създава Express app
- Настройва middleware (CORS, JSON)
- Регистрира routes
- Настройва Swagger UI
- Стартира сървъра на порт 3000

**swagger.ts** - OpenAPI 3.0 спецификация
- Дефинира всички API endpoints
- Описва request/response схеми
- Документира параметри
- Използва се от Swagger UI

**generateSwagger.ts** - Utility скрипт
- Генерира `swagger.json` файл
- Използва се за автоматично генериране на TypeScript типове

**schemas/** - Zod валидационни схеми
- `user.ts` - User и CreateUserRequest схеми
- `product.ts` - Product и CreateProductRequest схеми
- `order.ts` - Order и CreateOrderRequest схеми
- Осигуряват runtime валидация
- Експортират TypeScript типове

**routes/** - API route handlers
- `users.ts` - GET /api/users, POST /api/users, GET /api/users/:id
- `products.ts` - GET /api/products, POST /api/products, GET /api/products/:id
- `orders.ts` - GET /api/orders, POST /api/orders, GET /api/orders/:id
- Използват in-memory масиви за данни (POC)
- Валидират с Zod схеми

## Frontend Package (`packages/frontend/`)

```
frontend/
├── package.json            # Frontend зависимости
├── tsconfig.json          # TypeScript конфигурация
├── vite.config.ts         # Vite + React Compiler setup
├── index.html             # HTML entry point
└── src/
    ├── main.tsx           # React entry point
    ├── App.tsx            # Main component с routing
    ├── App.css            # Global styles
    ├── index.css          # Base styles
    ├── api/               # API комуникация
    │   └── client.ts      # Axios клиент + API methods
    └── components/        # React компоненти
        ├── UsersTab.tsx   # Users таб компонент
        ├── ProductsTab.tsx # Products таб компонент
        └── OrdersTab.tsx  # Orders таб компонент
```

### Frontend файлове - описание

**index.html** - HTML shell
- Зарежда React приложението
- Minimal setup за SPA

**main.tsx** - React bootstrap
- Създава React root
- Настройва QueryClient
- Настройва BrowserRouter
- Render-ва App компонента

**App.tsx** - Главен компонент
- Header с gradient
- Navigation tabs (3 tabs)
- React Router setup
- Routes към табовете

**App.css** - Стилове
- Tab navigation
- Card layouts
- Forms
- Buttons
- Badges
- Animations
- Responsive design

**index.css** - Base стилове
- CSS reset
- Global styles
- Gradient background
- Typography

**api/client.ts** - API комуникация
- Axios instance
- API methods за Users, Products, Orders
- Base URL конфигурация
- Готово за типизиране от Swagger

**components/UsersTab.tsx**
- Показва списък с потребители
- Форма за създаване на нов user
- Използва React Query за fetching
- Използва mutation за POST
- Real-time обновяване

**components/ProductsTab.tsx**
- Показва списък с продукти
- Форма за нов продукт
- Показва цени и наличност
- React Query integration

**components/OrdersTab.tsx**
- Показва списък с поръчки
- Форма за нова поръчка
- Статус badges (pending, completed, etc.)
- React Query integration

## Конфигурационни файлове

### `package.json` (root)

```json
{
  "workspaces": ["packages/*"],  // Монорепо setup
  "scripts": {
    "dev": "concurrently ..."    // Стартира FE + BE
  }
}
```

### `tsconfig.json` (backend)

- Target: ES2022
- Module: CommonJS
- Strict mode enabled
- Output: dist/

### `tsconfig.json` (frontend)

- Target: ES2020
- Module: ESNext
- Bundler mode resolution
- JSX: react-jsx
- Strict mode enabled

### `vite.config.ts`

- React plugin
- React Compiler integration
- Dev server на порт 5173
- Proxy `/api` към backend (3000)

## Data Flow

```
Browser → Frontend (5173)
           ↓
       API call (/api/*)
           ↓
       Proxy → Backend (3000)
           ↓
       Route handler
           ↓
       Zod validation
           ↓
       Business logic
           ↓
       Response → Frontend
           ↓
       React Query cache
           ↓
       UI update
```

## TypeScript Type Sharing (планирано)

```
Backend Swagger
      ↓
  swagger.json
      ↓
swagger-typescript-api
      ↓
frontend/src/api/api.ts (generated types)
      ↓
Frontend components (type-safe!)
```

## Build Output

При `npm run build`:

- **Backend**: `packages/backend/dist/` - Compiled JavaScript
- **Frontend**: `packages/frontend/dist/` - Optimized bundle

## Development Files

Това са файлове които се генерират по време на development:

- `node_modules/` - Dependencies (gitignored)
- `dist/` - Build output (gitignored)
- `swagger.json` - Генериран Swagger документ (може да е gitignored)

## Общо файлове в проекта

- **Backend source**: 9 TypeScript файла
- **Frontend source**: 8 TypeScript/TSX/CSS файла
- **Config files**: 5 (tsconfig, vite.config, package.json)
- **Documentation**: 4 Markdown файла
- **Total source files**: ~26 файла (без node_modules)

---

Проектът е организиран за:
- ✅ Ясна сепарация FE/BE
- ✅ Лесно добавяне на нови features
- ✅ Споделяне на типове
- ✅ Монорепо benefits
- ✅ Type safety
