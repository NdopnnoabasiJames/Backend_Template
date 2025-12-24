# Project Structure

## High-Level Architecture

This is a modular NestJS application following Domain-Driven Design principles. Each feature is encapsulated in its own module with clear boundaries.

```
src/
├── auth/              # Authentication & authorization
├── user/              # User management
├── prisma/            # Database access layer
├── mail/              # Email notifications
├── sms/               # SMS notifications
├── notification/      # Marketing notifications
├── stripe/            # Payment processing (optional)
├── main.ts            # Application bootstrap
└── app.module.ts      # Root module
```

## Module Breakdown

### Auth Module (`src/auth/`)

Handles all authentication and authorization logic.

```
auth/
├── auth.service.ts         # Auth business logic
├── auth.controller.ts      # Auth HTTP endpoints
├── auth.module.ts          # Module definition
├── decorators/
│   └── roles.decorator.ts  # Role-based auth decorator
├── guards/
│   ├── jwt-auth.guard.ts   # JWT validation guard
│   └── roles.guard.ts      # Role check guard
└── strategies/
    └── jwt.strategy.ts     # Passport JWT strategy
```

**Responsibilities:**
- User signup and login
- JWT token generation
- Phone/email verification
- Password reset
- OTP management

**Key Dependencies:**
- `PrismaService` for database access
- `JwtService` for token operations
- `MailService` for email OTPs
- `SmsService` for phone OTPs

### User Module (`src/user/`)

Manages user CRUD operations and profile management.

```
user/
├── user.service.ts       # User business logic
├── user.controller.ts    # User HTTP endpoints
├── user.module.ts        # Module definition
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
├── entities/
│   └── user.entity.ts    # User type definition
└── enums/
    └── role.enum.ts      # User roles (re-exported from Prisma)
```

**Responsibilities:**
- Create, read, update, delete users
- User profile management
- Role assignment

**Key Dependencies:**
- `PrismaService` for database access

### Prisma Module (`src/prisma/`)

Provides database access throughout the application.

```
prisma/
├── prisma.service.ts    # Prisma client wrapper
└── prisma.module.ts     # Global module definition
```

**Why Global?**
- Almost every module needs database access
- Avoids repetitive imports
- Follows NestJS best practices

**Key Features:**
- Connection lifecycle management
- Automatic reconnection
- Clean shutdown handling
- Development query logging

### Mail Module (`src/mail/`)

Email notification service using Nodemailer.

```
mail/
├── mail.service.ts     # Email sending logic
└── mail.module.ts      # Module definition
```

**Capabilities:**
- Password reset emails
- Email verification OTPs
- Marketing emails
- Transactional notifications

**Configuration:**
- SMTP settings via environment variables
- Supports Gmail, SendGrid, custom SMTP

### SMS Module (`src/sms/`)

SMS notification service using Termii API.

```
sms/
├── sms.service.ts      # SMS sending logic
├── sms.module.ts       # Module definition
└── dto/
    └── sms.dto.ts      # SMS data transfer objects
```

**Capabilities:**
- Phone verification OTPs
- Password reset OTPs
- Bulk SMS
- Phone number validation

**Supported Regions:**
- Nigeria (+234)
- USA/Canada (+1)
- UK (+44)
- India (+91)
- Custom regex patterns via config

### Notification Module (`src/notification/`)

Marketing campaign and notification preferences management.

```
notification/
├── notification.service.ts       # Campaign logic
├── notification.controller.ts    # Campaign endpoints
├── notification.module.ts        # Module definition
└── dto/
    └── marketing.dto.ts          # Campaign DTOs
```

**Responsibilities:**
- Create marketing campaigns
- Send bulk notifications
- Manage user preferences
- Schedule notifications
- Track campaign metrics

### Stripe Module (`src/stripe/`) - Optional

Payment processing integration.

```
stripe/
├── stripe.service.ts        # Payment logic
├── stripe.controller.ts     # Payment endpoints
└── stripe.module.ts         # Module definition
```

**Scope:**
- One-time payment intents only
- Webhook handling
- Basic payment tracking

**NOT Included:**
- Subscriptions
- Invoicing
- Customer management
- Complex pricing

See [stripe-payments.md](./stripe-payments.md) for details.

## Core Files

### `main.ts`

Application entry point. Bootstraps NestJS, configures middleware, and starts the server.

**Key Configurations:**
- CORS enabled
- Global validation pipes
- API versioning (`/api/v1/`)
- Port from environment

### `app.module.ts`

Root module that imports all feature modules.

**Module Order:**
1. ConfigModule (global)
2. PrismaModule (global)
3. Feature modules (Auth, User, etc.)

## Database Layer

### Schema (`prisma/schema.prisma`)

Defines the database structure:
- Models (User, MarketingNotification, etc.)
- Relationships
- Indexes
- Enums

### Migrations (`prisma/migrations/`)

Version-controlled database schema changes. Each migration is timestamped and immutable.

## Data Flow

### Typical Request Flow

1. **HTTP Request** → Controller endpoint
2. **Guards** → JWT validation, role checks
3. **Pipes** → Input validation and transformation
4. **Controller** → Routes to service method
5. **Service** → Business logic
6. **Prisma** → Database query
7. **Response** → Serialized data

### Example: User Login

```
POST /api/v1/auth/login
  ↓
AuthController.logIn()
  ↓
AuthService.logIn()
  ├→ PrismaService.user.findUnique()  # Check credentials
  └→ JwtService.sign()                 # Generate token
  ↓
Return { access_token, user }
```

## Module Dependencies

```
AppModule
├── ConfigModule (global)
├── PrismaModule (global)
│
├── AuthModule
│   ├── JwtModule
│   ├── PassportModule
│   ├── MailModule
│   └── SmsModule
│
├── UserModule
│   └── (uses PrismaService)
│
├── NotificationModule
│   └── MailModule
│
└── StripeModule (optional)
```

## Adding New Features

### Creating a New Module

1. Generate module: `nest g module feature-name`
2. Generate service: `nest g service feature-name`
3. Generate controller: `nest g controller feature-name`
4. Create DTOs in `dto/` folder
5. Add Prisma models if needed
6. Import module in `app.module.ts`

### Best Practices

- **One responsibility per module**
- **DTOs for all inputs/outputs**
- **Service for business logic**
- **Controller for routing only**
- **Inject dependencies, don't create**
- **Use Prisma for all database access**

## Environment Configuration

All modules use `ConfigService` for environment variables. No hardcoded secrets.

**Required Variables:**
- `DATABASE_URL`
- `JWT_SECRET`
- `EMAIL_USER` / `EMAIL_PASSWORD`

**Optional Variables:**
- `TERMII_API_KEY`
- `STRIPE_SECRET_KEY`
- `OTP_EXPIRY_MINUTES`

See `.env.example` for complete list.

## Testing Structure

```
test/
├── app.e2e-spec.ts        # End-to-end tests
└── jest-e2e.json          # E2E test configuration

src/**/*.spec.ts            # Unit tests (co-located)
```

## Build Output

```
dist/                       # Compiled JavaScript
├── main.js                # Application entry
└── [modules]/             # Compiled modules
```

## Next Steps

- [Database & Prisma Guide](./database-prisma.md)
- [Authentication Flow](./auth-flow.md)
- [API Documentation](./ONBOARDING.md#api-endpoints-reference)
