export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Asset Management Platform API",
    version: "1.0.0",
    description:
      "Domain-oriented API for the Asset Management Platform POC. Three domains: auth (Platform Core), billing (Billing team), accounts (Open Account team).",
  },
  servers: [{ url: "http://localhost:3000", description: "Development" }],
  tags: [
    { name: "Auth", description: "Owned by Platform Core team" },
    { name: "Billing", description: "Owned by Billing team (requires auth)" },
    { name: "Accounts", description: "Owned by Open Account team (requires auth)" },
    { name: "Trading", description: "Owned by Trading team (requires auth)" },
  ],
  security: [{ BearerAuth: [] }],
  paths: {
    "/api/auth/login": {
      post: {
        summary: "Exchange credentials for a session token",
        tags: ["Auth"],
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        summary: "Revoke the current session",
        tags: ["Auth"],
        responses: { "204": { description: "Logged out" } },
      },
    },
    "/api/auth/me": {
      get: {
        summary: "Get the current user (token validation)",
        tags: ["Auth"],
        responses: {
          "200": {
            description: "User",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthenticatedUser" },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/api/auth/demo-credentials": {
      get: {
        summary: "Demo-only: list hardcoded credentials for the login page",
        tags: ["Auth"],
        security: [],
        responses: {
          "200": {
            description: "List of demo credentials",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/DemoCredential",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/billing/invoices": {
      get: {
        summary: "List invoices",
        tags: ["Billing"],
        responses: {
          "200": {
            description: "Invoices",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Invoice" },
                },
              },
            },
          },
        },
      },
    },
    "/api/billing/invoices/{id}": {
      get: {
        summary: "Get invoice",
        tags: ["Billing"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Invoice",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Invoice" },
              },
            },
          },
          "404": { description: "Not found" },
        },
      },
    },
    "/api/billing/invoices/{id}/pay": {
      post: {
        summary: "Pay invoice",
        tags: ["Billing"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PayInvoiceRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated invoice",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Invoice" },
              },
            },
          },
          "404": { description: "Not found" },
        },
      },
    },
    "/api/billing/transactions": {
      get: {
        summary: "List transactions",
        tags: ["Billing"],
        responses: {
          "200": {
            description: "Transactions",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Transaction" },
                },
              },
            },
          },
        },
      },
    },
    "/api/billing/summary": {
      get: {
        summary: "Billing summary (used by OutstandingBalanceWidget)",
        tags: ["Billing"],
        responses: {
          "200": {
            description: "Summary",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BillingSummary" },
              },
            },
          },
        },
      },
    },
    "/api/accounts": {
      get: {
        summary: "List accounts",
        tags: ["Accounts"],
        responses: {
          "200": {
            description: "Accounts",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Account" },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Start new account onboarding",
        tags: ["Accounts"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAccountRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Account" },
              },
            },
          },
          "400": { description: "Invalid" },
        },
      },
    },
    "/api/accounts/progress": {
      get: {
        summary: "Onboarding progress (used by OnboardingProgressWidget)",
        tags: ["Accounts"],
        responses: {
          "200": {
            description: "Progress",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OnboardingProgress" },
              },
            },
          },
        },
      },
    },
    "/api/accounts/{id}": {
      get: {
        summary: "Get account",
        tags: ["Accounts"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Account",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Account" },
              },
            },
          },
          "404": { description: "Not found" },
        },
      },
    },
    "/api/accounts/{id}/advance": {
      post: {
        summary: "Advance onboarding to next step",
        tags: ["Accounts"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdvanceStepRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated account",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Account" },
              },
            },
          },
          "404": { description: "Not found" },
          "409": { description: "Invalid step order" },
        },
      },
    },
    "/api/trading/symbols": {
      get: {
        summary: "List tradable instruments with last price",
        tags: ["Trading"],
        responses: {
          "200": {
            description: "Symbols",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/TradingSymbol" },
                },
              },
            },
          },
        },
      },
    },
    "/api/trading/accounts": {
      get: {
        summary:
          "List trading accounts with cash balance (Trading view, NOT the Accounts domain)",
        tags: ["Trading"],
        responses: {
          "200": {
            description: "Trading accounts",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/TradingAccountView" },
                },
              },
            },
          },
        },
      },
    },
    "/api/trading/cash/{accountId}": {
      get: {
        summary: "Cash balance for a given account",
        tags: ["Trading"],
        parameters: [
          {
            name: "accountId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Cash balance",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CashBalance" },
              },
            },
          },
        },
      },
    },
    "/api/trading/cash/deposit": {
      post: {
        summary: "Deposit cash into an account",
        tags: ["Trading"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DepositRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Updated cash balance",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CashBalance" },
              },
            },
          },
          "400": { description: "Invalid payload" },
        },
      },
    },
    "/api/trading/positions": {
      get: {
        summary: "Positions, optionally filtered by account",
        tags: ["Trading"],
        parameters: [
          {
            name: "accountId",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Positions",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Position" },
                },
              },
            },
          },
        },
      },
    },
    "/api/trading/orders": {
      get: {
        summary:
          "Order history (most recent first), optionally filtered by account",
        tags: ["Trading"],
        parameters: [
          {
            name: "accountId",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Orders",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Order" },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Place a market order (instant fill in POC)",
        tags: ["Trading"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PlaceOrderRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Order filled",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "400": { description: "Invalid payload" },
          "404": { description: "Unknown ticker" },
          "409": {
            description:
              "Order rejected (insufficient position on sell or insufficient cash on buy)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
        },
      },
    },
    "/api/trading/portfolio": {
      get: {
        summary:
          "Portfolio summary for one account (used by PortfolioWidget)",
        tags: ["Trading"],
        parameters: [
          {
            name: "accountId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Portfolio",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PortfolioSummary" },
              },
            },
          },
          "400": { description: "Missing accountId" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
      },
    },
    schemas: {
      UserRole: { type: "string", enum: ["admin", "operator", "analyst"] },
      AuthenticatedUser: {
        type: "object",
        required: ["id", "email", "fullName", "role", "tenantId"],
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          fullName: { type: "string" },
          role: { $ref: "#/components/schemas/UserRole" },
          tenantId: { type: "string" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      LoginResponse: {
        type: "object",
        required: ["token", "user"],
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/AuthenticatedUser" },
        },
      },
      DemoCredential: {
        type: "object",
        required: ["email", "password", "role"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
          role: { type: "string" },
        },
      },
      Currency: { type: "string", enum: ["USD", "EUR", "GBP"] },
      InvoiceStatus: {
        type: "string",
        enum: ["pending", "paid", "overdue"],
      },
      TransactionType: {
        type: "string",
        enum: ["charge", "refund", "fee"],
      },
      Invoice: {
        type: "object",
        required: [
          "id",
          "accountId",
          "amount",
          "currency",
          "status",
          "description",
          "issuedAt",
          "dueAt",
          "paidAt",
        ],
        properties: {
          id: { type: "string" },
          accountId: { type: "string" },
          amount: { type: "number", format: "float" },
          currency: { $ref: "#/components/schemas/Currency" },
          status: { $ref: "#/components/schemas/InvoiceStatus" },
          description: { type: "string" },
          issuedAt: { type: "string", format: "date-time" },
          dueAt: { type: "string", format: "date-time" },
          paidAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Transaction: {
        type: "object",
        required: [
          "id",
          "invoiceId",
          "accountId",
          "amount",
          "currency",
          "type",
          "description",
          "timestamp",
        ],
        properties: {
          id: { type: "string" },
          invoiceId: { type: "string" },
          accountId: { type: "string" },
          amount: { type: "number", format: "float" },
          currency: { $ref: "#/components/schemas/Currency" },
          type: { $ref: "#/components/schemas/TransactionType" },
          description: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      BillingSummary: {
        type: "object",
        required: [
          "outstandingBalance",
          "currency",
          "overdueCount",
          "pendingCount",
          "paidThisMonth",
        ],
        properties: {
          outstandingBalance: { type: "number" },
          currency: { $ref: "#/components/schemas/Currency" },
          overdueCount: { type: "number" },
          pendingCount: { type: "number" },
          paidThisMonth: { type: "number" },
        },
      },
      PayInvoiceRequest: {
        type: "object",
        required: ["paymentMethodId"],
        properties: {
          paymentMethodId: { type: "string" },
        },
      },
      AccountStatus: {
        type: "string",
        enum: ["draft", "kyc_pending", "verified", "rejected"],
      },
      ProductType: {
        type: "string",
        enum: ["trading", "savings", "retirement"],
      },
      OnboardingStep: {
        type: "string",
        enum: [
          "personal_info",
          "identity_verification",
          "funding",
          "review",
        ],
      },
      Account: {
        type: "object",
        required: [
          "id",
          "holderName",
          "email",
          "productType",
          "status",
          "completedSteps",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id: { type: "string" },
          holderName: { type: "string" },
          email: { type: "string", format: "email" },
          productType: { $ref: "#/components/schemas/ProductType" },
          status: { $ref: "#/components/schemas/AccountStatus" },
          completedSteps: {
            type: "array",
            items: { $ref: "#/components/schemas/OnboardingStep" },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      OnboardingProgress: {
        type: "object",
        required: [
          "totalAccounts",
          "draft",
          "kycPending",
          "verified",
          "rejected",
          "averageCompletion",
        ],
        properties: {
          totalAccounts: { type: "number" },
          draft: { type: "number" },
          kycPending: { type: "number" },
          verified: { type: "number" },
          rejected: { type: "number" },
          averageCompletion: { type: "number" },
        },
      },
      CreateAccountRequest: {
        type: "object",
        required: ["holderName", "email", "productType"],
        properties: {
          holderName: { type: "string" },
          email: { type: "string", format: "email" },
          productType: { $ref: "#/components/schemas/ProductType" },
        },
      },
      AdvanceStepRequest: {
        type: "object",
        required: ["step"],
        properties: {
          step: { $ref: "#/components/schemas/OnboardingStep" },
        },
      },
      OrderSide: { type: "string", enum: ["buy", "sell"] },
      OrderStatus: { type: "string", enum: ["filled", "rejected"] },
      TradingSymbol: {
        type: "object",
        required: ["ticker", "name", "sector", "lastPrice", "change24h"],
        properties: {
          ticker: { type: "string" },
          name: { type: "string" },
          sector: { type: "string" },
          lastPrice: { type: "number", format: "float" },
          change24h: { type: "number", format: "float" },
        },
      },
      Position: {
        type: "object",
        required: [
          "accountId",
          "ticker",
          "name",
          "quantity",
          "averageCost",
          "marketValue",
          "unrealizedPnL",
          "unrealizedPnLPercent",
        ],
        properties: {
          accountId: { type: "string" },
          ticker: { type: "string" },
          name: { type: "string" },
          quantity: { type: "number" },
          averageCost: { type: "number" },
          marketValue: { type: "number" },
          unrealizedPnL: { type: "number" },
          unrealizedPnLPercent: { type: "number" },
        },
      },
      Order: {
        type: "object",
        required: [
          "id",
          "accountId",
          "ticker",
          "side",
          "quantity",
          "fillPrice",
          "total",
          "status",
          "rejectionReason",
          "placedAt",
        ],
        properties: {
          id: { type: "string" },
          accountId: { type: "string" },
          ticker: { type: "string" },
          side: { $ref: "#/components/schemas/OrderSide" },
          quantity: { type: "number" },
          fillPrice: { type: "number" },
          total: { type: "number" },
          status: { $ref: "#/components/schemas/OrderStatus" },
          rejectionReason: { type: "string", nullable: true },
          placedAt: { type: "string", format: "date-time" },
        },
      },
      PlaceOrderRequest: {
        type: "object",
        required: ["accountId", "ticker", "side", "quantity"],
        properties: {
          accountId: { type: "string" },
          ticker: { type: "string" },
          side: { $ref: "#/components/schemas/OrderSide" },
          quantity: { type: "number" },
        },
      },
      PortfolioSummary: {
        type: "object",
        required: [
          "accountId",
          "cashAvailable",
          "totalMarketValue",
          "totalCostBasis",
          "totalUnrealizedPnL",
          "totalUnrealizedPnLPercent",
          "totalEquity",
          "positionsCount",
          "topHoldingTicker",
        ],
        properties: {
          accountId: { type: "string", nullable: true },
          cashAvailable: { type: "number" },
          totalMarketValue: { type: "number" },
          totalCostBasis: { type: "number" },
          totalUnrealizedPnL: { type: "number" },
          totalUnrealizedPnLPercent: { type: "number" },
          totalEquity: { type: "number" },
          positionsCount: { type: "number" },
          topHoldingTicker: { type: "string", nullable: true },
        },
      },
      CashBalance: {
        type: "object",
        required: ["accountId", "cashAvailable", "currency"],
        properties: {
          accountId: { type: "string" },
          cashAvailable: { type: "number" },
          currency: { type: "string", enum: ["USD"] },
        },
      },
      TradingAccountView: {
        type: "object",
        required: ["accountId", "cashAvailable", "currency"],
        properties: {
          accountId: { type: "string" },
          cashAvailable: { type: "number" },
          currency: { type: "string", enum: ["USD"] },
        },
      },
      DepositRequest: {
        type: "object",
        required: ["accountId", "amount"],
        properties: {
          accountId: { type: "string" },
          amount: { type: "number", minimum: 0.01 },
        },
      },
    },
  },
};
