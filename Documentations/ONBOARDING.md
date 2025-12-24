# Complete API Reference & Setup Guide

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
git clone <repo-url>
cd project
npm install
cp .env.example .env
# Configure .env (see below)
npm run prisma:migrate
npm run start:dev
```

Server: `http://localhost:3000`

---

## Environment Configuration

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# JWT
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRY=30m

# Email (Gmail)
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# Frontend
FRONTEND_URL=http://localhost:3001
```

### Optional Variables

```env
# SMS (Termii)
TERMII_API_KEY=your-termii-key
TERMII_SENDER_ID=YourAppName
SMS_COUNTRY_CODE=+234

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_DAILY_LIMIT=3
OTP_MIN_INTERVAL_MINUTES=5

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret
```

---

## API Endpoints

### Authentication

#### Register User
```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "08012345678",
  "password": "StrongPass123!",
  "role": "user"
}
```

**Response:**
```json
{
  "id": "uuid",
  "firstName": "John",
  "email": "john@example.com",
  "phone": "+2348012345678",
  "message": "OTP sent to phone"
}
```

#### Verify Phone
```http
POST /api/v1/auth/verify-phone

{
  "phone": "+2348012345678",
  "otp": "123456"
}
```

#### Login
```http
POST /api/v1/auth/login

{
  "login": "08012345678",  // or email
  "password": "StrongPass123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "role": "user"
  }
}
```

#### Request Password Reset OTP
```http
POST /api/v1/auth/forgot-password

{
  "phone": "+2348012345678"
}
```

#### Reset Password with OTP
```http
POST /api/v1/auth/reset-password

{
  "phone": "+2348012345678",
  "otp": "123456",
  "newPassword": "NewPass123!"
}
```

#### Request Email Reset Token
```http
POST /api/v1/auth/generate-reset-token

{
  "email": "john@example.com"
}
```

#### Reset Password with Token
```http
POST /api/v1/auth/reset-password-token

{
  "token": "reset-token-from-email",
  "newPassword": "NewPass123!"
}
```

---

### User Management

**All user endpoints require authentication:**
```http
Authorization: Bearer <access_token>
```

#### Get Current User Profile
```http
GET /api/v1/user/profile
```

#### Get All Users
```http
GET /api/v1/user
```

#### Get User by ID
```http
GET /api/v1/user/:id
```

#### Update User
```http
PATCH /api/v1/user/:id

{
  "firstName": "Jane",
  "phone": "08087654321"
}
```

#### Delete User
```http
DELETE /api/v1/user/:id
```

#### Admin Endpoint (requires ADMIN role)
```http
GET /api/v1/user/admin
```

---

### Marketing Notifications

**All marketing endpoints require ADMIN role.**

#### Create Campaign
```http
POST /api/v1/notifications/marketing
Authorization: Bearer <admin_token>

{
  "title": "Summer Sale",
  "content": "<h1>50% Off!</h1>",
  "category": "PROMOTIONAL",
  "timing": "IMMEDIATE",
  "recipients": []
}
```

**Categories:** `PROMOTIONAL`, `NEWSLETTER`, `PRODUCT_UPDATES`, `EVENTS`

**Timing:** `IMMEDIATE`, `SCHEDULED`, `RECURRING`

#### Get All Campaigns
```http
GET /api/v1/notifications/marketing?page=1&limit=10
```

#### Get Campaign by ID
```http
GET /api/v1/notifications/marketing/:id
```

#### Send Campaign
```http
POST /api/v1/notifications/marketing/:id/send
```

#### Schedule Campaign
```http
PUT /api/v1/notifications/marketing/:id/schedule

{
  "scheduledDate": "2024-12-31T10:00:00Z"
}
```

#### Get User Preferences
```http
GET /api/v1/notifications/preferences/:userId
```

#### Update User Preferences
```http
PUT /api/v1/notifications/preferences/:userId

{
  "email": "user@example.com",
  "subscribedToPromotional": false,
  "subscribedToNewsletter": true,
  "preferEmail": true,
  "preferSMS": false
}
```

---

### Stripe Payments (Optional)

**Requires Stripe module enabled in app.module.ts**

#### Create Payment Intent
```http
POST /stripe/create-payment-intent
Authorization: Bearer <token>

{
  "amount": 5000,  // cents ($50.00)
  "currency": "usd",
  "description": "Product purchase"
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

#### Webhook Endpoint
```http
POST /stripe/webhook
Stripe-Signature: <signature>

// Handled automatically by Stripe
```

---

## Error Responses

### Standard Error Format
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate email/phone)
- `500` - Internal Server Error

---

## Authentication Details

### JWT Token Structure

**Payload:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "user",
  "iat": 1234567890,
  "exp": 1234569690
}
```

**Usage:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Protected Routes

**Authentication Only:**
- `@UseGuards(JwtAuthGuard)`
- Requires valid JWT token

**Role-Based:**
- `@UseGuards(JwtAuthGuard, RolesGuard)`
- `@Roles(UserRole.ADMIN)`
- Requires valid token + admin role

---

## Database Models

### User
- `id` (UUID)
- `email` (unique)
- `phone` (unique)
- `password` (bcrypt hashed)
- `firstName`, `lastName`
- `role` (USER | ADMIN)
- `isPhoneVerified`, `isEmailVerified`
- `isActive`
- OTP fields for verification/reset

### MarketingNotification
- `id` (UUID)
- `title`, `content`
- `category`, `type`, `timing`
- `scheduledDate`
- `sent`, `sentAt`
- `successCount`, `failureCount`
- `metadata` (JSON)

### UserMarketingPreference
- `id` (UUID)
- `userId` (foreign key)
- `email`
- Subscription booleans per category
- Channel preferences (email, SMS, push)

---

## Scripts

```bash
# Development
npm run start:dev       # Run with hot reload
npm run build           # Build for production
npm run start:prod      # Run production build

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open database GUI

# Testing
npm run test            # Unit tests
npm run test:e2e        # E2E tests
npm run test:cov        # Coverage report

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format with Prettier
```

---

## Troubleshooting

### Cannot Connect to Database
```bash
# Test connection
psql $DATABASE_URL

# Check if PostgreSQL is running
pg_isready
```

### JWT Token Invalid
- Verify `JWT_SECRET` is set
- Check token hasn't expired
- Ensure correct `Authorization: Bearer <token>` format

### SMS Not Sending
- Verify `TERMII_API_KEY` is correct
- Check Termii account credits
- Ensure phone number format matches country code

### Email Not Sending
- Use Gmail app password (not account password)
- Enable 2FA in Gmail
- Generate app password at: https://myaccount.google.com/apppasswords

---

## Further Documentation

- **[auth-flow.md](./auth-flow.md)** - Detailed authentication flows
- **[project-structure.md](./project-structure.md)** - Code organization
- **[POSTGRESQL_PRISMA.md](./POSTGRESQL_PRISMA.md)** - Database guide
- **[STRIPE.md](./STRIPE.md)** - Payment integration
- **[README.md](../README.md)** - Quick start and overview

## Support

- GitHub Issues: Report bugs and request features
- Check documentation files in `/Documentations` folder
