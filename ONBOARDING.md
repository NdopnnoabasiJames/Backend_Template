# **NestJS Authentication & Notification Starter Template - Complete Documentation**

## **Overview**

This is a production-ready NestJS starter template that provides a complete foundation for building modern web applications. It includes authentication, authorization, user management, email/SMS notifications, and marketing capabilities out of the box.

**Note:** This template is designed to be forked and customized for your specific needs. All product-specific elements are configurable via environment variables.

---

## **1. Major Features Implemented**

### **Authentication & Security**
- **User Registration (Signup)** with phone number validation and OTP verification
- **Login** using phone number and password with JWT token generation
- **Password Reset** via OTP sent to phone (primary) or email token (legacy support)
- **Phone Verification** using 4-digit OTP sent via SMS
- **Email Verification** (backward compatibility, defaults to verified)
- **JWT-based Authentication** with 30-minute token expiration
- **Password Hashing** using bcrypt with salt rounds

### **Authorization & Access Control**
- **Role-Based Access Control (RBAC)** with two roles:
  - `USER` - Standard user role
  - `ADMIN` - Admin/privileged role (easily extensible)
- **Custom Guards** for route protection:
  - `JwtAuthGuard` - Validates JWT tokens
  - `RolesGuard` - Enforces role-based permissions
- **Custom Decorators** (`@Roles()`) for declaring required roles

### **User Management**
- Full CRUD operations for users
- Profile retrieval for authenticated users
- Secure password storage (never returned in responses)
- User activation/deactivation status
- Phone number uniqueness validation

### **Email System**
- **Nodemailer** integration with Gmail
- Password reset emails with clickable links
- Email verification with OTP
- Marketing email campaigns with HTML templates
- Configurable sender credentials

### **SMS System**
- **Termii API** integration for multiple countries
- Phone number validation and formatting (configurable)
- Supports Nigeria (+234), USA/Canada (+1), UK (+44), India (+91)
- OTP delivery for phone verification
- OTP delivery for password resets
- Bulk SMS capabilities
- Rate limiting (3 OTP requests per day, 5-minute intervals)

### **Marketing & Notifications**
- Marketing notification creation and management
- User marketing preference management (opt-in/opt-out)
- Category-based subscriptions:
  - Promotional
  - Newsletter
  - Product Updates
  - Events
- Scheduled vs immediate notifications
- Success/failure tracking for campaigns
- Protected routes (ADMIN role required)

### **Database**
- **MongoDB** with Mongoose ODM
- Automatic timestamp management (`createdAt`, `updatedAt`)
- Schema validation
- Unique constraints on email and phone
- Indexed fields for performance

### **Data Validation**
- **class-validator** for DTO validation
- **class-transformer** for data transformation
- Global validation pipe with:
  - Whitelist mode (strips unknown properties)
  - Forbidden non-whitelisted mode
  - Auto-transformation enabled

### **API Configuration**
- Global prefix: `/api/v1`
- CORS enabled for all origins
- Standardized error responses
- Environment-based configuration

---

## **2. Project Structure & Module Roles**

### **Root Configuration Files**
- `nest-cli.json` - NestJS CLI configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript compiler options
- `tsconfig.build.json` - Build-specific TypeScript config

### **Core Entry Points**
- `src/main.ts` - Application bootstrap, global pipes, CORS, API prefix
- `src/app.module.ts` - Root module that imports all feature modules

### **Feature Modules**

#### **Authentication Module** (`src/auth/`)
- **Purpose**: Handles all authentication flows
- **Key Files**:
  - `auth.service.ts` - Core authentication logic (440 lines)
  - `auth.controller.ts` - Authentication endpoints
  - `auth.module.ts` - Module configuration with JWT setup
- **Sub-components**:
  - `strategies/jwt.strategy.ts` - Passport JWT strategy for token validation
  - `guards/jwt-auth.guard.ts` - Protects routes requiring authentication
  - `guards/roles.guard.ts` - Enforces role-based access
  - `decorators/roles.decorator.ts` - Metadata decorator for roles
  - `dto/verify-email.dto.ts` - DTOs for verification flows

#### **User Module** (`src/user/`)
- **Purpose**: User CRUD operations and profile management
- **Key Files**:
  - `user.service.ts` - User business logic
  - `user.controller.ts` - User endpoints with guards
  - `user.module.ts` - Module configuration
  - `schema/user.schema.ts` - MongoDB user schema with OTP fields
  - `enums/role.enum.ts` - User role definitions
  - `dto/create-user.dto.ts` - DTOs with validation rules

#### **Database Module** (`src/database/`)
- **Purpose**: MongoDB connection setup
- **Key Files**:
  - `database.module.ts` - Async Mongoose configuration using ConfigService

#### **Mail Module** (`src/mail/`)
- **Purpose**: Email sending capabilities
- **Key Files**:
  - `mail.service.ts` - Nodemailer wrapper with template methods
  - `mail.module.ts` - Exports MailService for use in other modules

#### **SMS Module** (`src/sms/`)
- **Purpose**: SMS delivery via Termii API
- **Key Files**:
  - `sms.service.ts` - Termii integration with phone validation
  - `sms.module.ts` - Exports SmsService
  - `dto/sms.dto.ts` - SMS DTOs

#### **Notification Module** (`src/notification/`)
- **Purpose**: Marketing campaigns and user preferences
- **Key Files**:
  - `notification.service.ts` - Campaign logic
  - `notification.controller.ts` - Protected endpoints
  - `schemas/marketing.schema.ts` - Marketing notification & preference schemas
  - `dto/marketing.dto.ts` - Marketing DTOs

#### **Shared Schemas** (`src/schemas/`)
- `notification.schema.ts` - Enums for notification types, timing, and categories

---

## **3. Authentication & Authorization Flow (End-to-End)**

### **Registration Flow**
1. **Client sends POST to** `/api/v1/auth/signup`
   - Payload: `{ firstName, lastName, email, password, phone, role }`
2. **Validation** via `CreateUserDto` with class-validator
3. **Phone number formatting** via `SmsService.validatePhoneNumber()`
4. **Duplicate checks** for email and phone
5. **Password hashing** with bcrypt (10 salt rounds)
6. **User creation** in MongoDB with `isPhoneVerified: false`
7. **4-digit OTP generation** and SMS delivery via Termii
8. **Response** returns user data with verification message

### **Phone Verification Flow**
1. **Client sends POST to** `/api/v1/auth/verify-phone`
   - Payload: `{ phone, otp }`
2. **Phone number validation** and formatting
3. **OTP validation** against database (4-digit, 10-minute expiry)
4. **User update**: `isPhoneVerified: true`, OTP fields cleared

### **Login Flow**
1. **Client sends POST to** `/api/v1/auth/login`
   - Payload: `{ phone, password }`
2. **Phone formatting** and user lookup
3. **Password verification** via bcrypt.compare()
4. **Phone verification check** (must be verified)
5. **JWT token generation** with payload: `{ id, role, phone, email }`
6. **Response** returns `access_token` (expires in 30 minutes)

### **Password Reset Flow**
1. **Client sends POST to** `/api/v1/auth/forgot-password`
   - Payload: `{ phone }`
2. **Rate limiting checks**:
   - Max 3 requests per day
   - Min 5-minute interval between requests
3. **4-digit OTP generation** and SMS delivery
4. **OTP storage** with 10-minute expiry
5. **Client sends POST to** `/api/v1/auth/reset-password`
   - Payload: `{ phone, otp, newPassword }`
6. **OTP validation** and password update

### **Protected Route Access**
1. **Client includes JWT in Authorization header**: `Bearer <token>`
2. **JwtAuthGuard** intercepts request
3. **JwtStrategy.validate()** extracts payload and fetches user from DB
4. **User object attached** to request: `req.user`
5. **(Optional) RolesGuard** checks if user role matches `@Roles()` decorator
6. **Request proceeds** if authenticated and authorized

### **Authorization Pattern Example**
```typescript
@Get('admin')
@UseGuards(JwtAuthGuard, RolesGuard)  // Apply guards
@Roles(UserRole.ADMIN)                 // Require ADMIN role
getAdminData() {
  return { message: 'This is protected data for admins only' };
}
```

---

## **4. External Services & Integrations**

### **MongoDB Database**
- **Connection**: Configured via `DATABASE_URI` environment variable
- **Driver**: Mongoose ODM
- **Setup**: `src/Database/database.module.ts` uses `MongooseModule.forRootAsync()`
- **Schemas**: User, MarketingNotification, UserMarketingPreference
- **Features**: Timestamps, unique constraints, validation

### **Nodemailer (Email)**
- **Service**: Gmail SMTP
- **Configuration**: Requires `EMAIL_USER` and `EMAIL_PASSWORD`
- **Transporter**: Configured in `mail.service.ts` constructor
- **Usage**: Password reset links, verification OTPs, marketing campaigns
- **Templates**: HTML email templates with dynamic content

### **Termii SMS API**
- **Provider**: Termii (supports multiple countries)
- **Configuration**: Requires `TERMII_API_KEY` and `TERMII_SENDER_ID`
- **Endpoint**: `https://api.ng.termii.com/api/sms/send`
- **Phone Format**: Configurable via `SMS_COUNTRY_CODE` (default +234)
- **Supported Regions**: Nigeria, USA/Canada, UK, India, and more
- **Features**:
  - Phone number validation and formatting
  - Single and bulk SMS sending
  - Success/failure tracking
  - Graceful error handling

### **JWT Authentication**
- **Library**: `@nestjs/jwt` + `passport-jwt`
- **Secret**: Configured via `JWT_SECRET` environment variable
- **Token Expiry**: 30 minutes (`signOptions: { expiresIn: '30m' }`)
- **Strategy**: Bearer token in Authorization header
- **Global**: JWT module configured globally in `auth.module.ts`

### **ConfigService Integration**
- **Module**: `@nestjs/config` (global)
- **Usage**: All services use `ConfigService` to access environment variables
- **Methods**: 
  - `configService.get()` - Get optional value
  - `configService.getOrThrow()` - Get required value (throws if missing)

---

## **5. Reusable Patterns & Abstractions**

### **Guard Pattern**
- **JwtAuthGuard**: Reusable authentication guard using Passport
- **RolesGuard**: Reusable authorization guard using Reflector
- **Usage**: Apply with `@UseGuards()` decorator on controllers/routes

### **Decorator Pattern**
- **@Roles(...roles)**: Custom metadata decorator for role requirements
- **Reflector**: Used in RolesGuard to read metadata

### **DTO Validation Pattern**
- **class-validator decorators**: `@IsNotEmpty()`, `@IsEmail()`, `@MinLength()`, etc.
- **Global ValidationPipe**: Automatically validates all incoming requests
- **Reusable DTOs**: Create, Update, Login DTOs follow consistent patterns

### **Service Injection Pattern**
- All modules export their services
- Services injected via constructor injection
- Example: AuthService injects UserModel, JwtService, MailService, SmsService

### **Error Handling Pattern**
- **HTTP Exceptions**: `BadRequestException`, `UnauthorizedException`, `NotFoundException`, etc.
- **Try-Catch Blocks**: In controllers with `InternalServerErrorException` fallback
- **Consistent Messages**: User-friendly error messages

### **Schema Pattern**
- **Mongoose Decorators**: `@Schema()`, `@Prop()` for clean schema definitions
- **Timestamps**: `{ timestamps: true }` for automatic `createdAt`/`updatedAt`
- **Enums**: Type-safe role and status fields

### **OTP Management Pattern**
- **Reusable OTP generation**: 4-digit random numbers
- **Expiry handling**: 10-minute validity
- **Rate limiting**: Daily limits and time intervals
- **Multi-purpose**: Same pattern for phone verification and password reset

### **Modular Architecture**
- Each feature is a self-contained module
- Modules import what they need
- Services are exported for cross-module usage
- Clear separation of concerns

---

## **6. Assumptions & Requirements**

### **Environment Variables Required**
```env
# Database
DATABASE_URI=mongodb://localhost:27017/servicall

# JWT
JWT_SECRET=your_secure_jwt_secret_key

# Email (Gmail)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# SMS (Termii - Nigerian SMS provider)
TERMII_API_KEY=your_termii_api_key
TERMII_SENDER_ID=YourAppName  # Optional, defaults to 'N-Alert'

# Frontend (for email reset links)
FRONTEND_URL=http://localhost:3001

# Server
PORT=3000  # Optional, defaults to 3000
```

### **Database Assumptions**
- **MongoDB** is the only supported database
- **Mongoose** schemas are tightly coupled to MongoDB
- Collections: `users`, `marketingnotifications`, `usermarketingpreferences`

### **Phone Number Configuration**
- **Default**: Nigeria (+234 country code)
- **Configurable**: Set `SMS_COUNTRY_CODE` to change region
- **Supported**: +234 (Nigeria), +1 (USA/Canada), +44 (UK), +91 (India)
- **Custom**: Use `SMS_PHONE_REGEX` for other countries
- **Validation**: Automatically formats and validates based on country code

### **Default Configurations**
- **JWT token expiry**: 30 minutes (configurable via `JWT_EXPIRY`)
- **OTP expiry**: 10 minutes (configurable via `OTP_EXPIRY_MINUTES`)
- **OTP rate limits**: 3 requests/day, 5-minute intervals (configurable)
- **Default role**: `USER`
- **Default active status**: `true`
- **Phone country code**: +234 Nigeria (configurable via `SMS_COUNTRY_CODE`)
- **Email verification**: Defaults to `true` (not actively enforced)

### **Role System**
- Two built-in roles: `USER` and `ADMIN`
- No hierarchical permissions or dynamic roles by default
- ADMIN role has access to admin/marketing features
- Easily extensible - see customization guide below

### **API Prefix**
- All routes prefixed with `/api/v1`
- Example: `/api/v1/auth/signup`, `/api/v1/user/profile`

---

## **7. What to Change When Forking**

### **Immediate Changes**
1. **Environment Variables**:
   - Create `.env` file with your MongoDB URI
   - Add your JWT secret (use a strong random string)
   - Configure email credentials (Gmail or another SMTP)
   - Add Termii API key if using SMS (or remove SMS module)

2. **Project Name**:
   - Update `"name"` in `package.json` from `"nestjs-auth-starter"`
   - Update `APP_NAME` in `.env`
   - Update project references in `README.md`

3. **Database Name**:
   - Change database name in `DATABASE_URI` to your project name

4. **Email Sender**:
   - Update email templates in `mail.service.ts` to match your branding
   - Update `FRONTEND_URL` for password reset links

### **Common Customizations**

#### **Adding New Roles**
1. Update `src/user/enums/role.enum.ts`:
   ```typescript
   export enum UserRole {
     USER = 'user',
     ADMIN = 'admin',
     MODERATOR = 'moderator',  // Add new role
   }
   ```
2. Use `@Roles(UserRole.MODERATOR)` on protected routes

#### **Changing Phone Number Region**
- Modify `formatPhoneNumber()` in `sms.service.ts`
- Update validation regex for your country code

#### **Extending User Schema**
- Add fields to `src/user/schema/user.schema.ts`
- Update DTOs in `src/user/dto/create-user.dto.ts`

#### **Changing JWT Expiry**
- Modify `signOptions` in `src/auth/auth.module.ts`:
  ```typescript
  signOptions: { expiresIn: '7d' }  // Change to 7 days
  ```

#### **Removing SMS/Email Features**
- Remove imports from `src/app.module.ts`
- Remove dependencies from `package.json`
- Update `auth.service.ts` to remove OTP flows

#### **Adding New Features**
1. Generate module: `nest generate module feature-name`
2. Generate service: `nest generate service feature-name`
3. Generate controller: `nest generate controller feature-name`
4. Import in `app.module.ts`

#### **Switching Email Provider**
- Update transporter config in `mail.service.ts`
- Example for SendGrid, Mailgun, etc.

#### **Database Migration**
- This template doesn't include migration tools
- For production, consider adding:
  - `migrate-mongo` for MongoDB migrations
  - Seed scripts for initial data

### **Security Hardening for Production**
1. **Rate Limiting**: Add `@nestjs/throttler` globally
2. **Helmet**: Add security headers with `helmet` package
3. **CORS**: Restrict to specific domains in `main.ts`
4. **Logging**: Add proper logging (Winston, Pino)
5. **Input Sanitization**: Add MongoDB injection protection
6. **Environment Validation**: Validate env vars on startup

### **Deployment Checklist**
1. Set all environment variables in production
2. Use production MongoDB cluster
3. Enable SSL/TLS for database connections
4. Set `NODE_ENV=production`
5. Build with `npm run build`
6. Run with `npm run start:prod`
7. Set up process manager (PM2, Docker)
8. Configure reverse proxy (Nginx)
9. Set up monitoring and error tracking

---

## **API Endpoints Reference**

### **Authentication**
- `POST /api/v1/auth/signup` - Register a new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `POST /api/v1/auth/verify-phone` - Verify phone number with OTP
- `POST /api/v1/auth/resend-verification-otp` - Resend phone verification OTP
- `POST /api/v1/auth/forgot-password` - Request password reset OTP (phone)
- `POST /api/v1/auth/reset-password` - Reset password with OTP
- `POST /api/v1/auth/verify-email` - Verify email (legacy)
- `POST /api/v1/auth/forgot-password-email` - Request password reset (email, legacy)
- `POST /api/v1/auth/reset-password/:token` - Reset password with token (email, legacy)

### **User Management**
- `GET /api/v1/user` - Get all users (protected)
- `GET /api/v1/user/profile` - Get current user profile (protected)
- `GET /api/v1/user/admin` - Get admin data (protected, artisan role required)
- `GET /api/v1/user/:id` - Get user by ID (protected)
- `PATCH /api/v1/user/:id` - Update user (protected)
- `DELETE /api/v1/user/:id` - Delete user (protected)

### **Notifications**
- `POST /api/v1/notifications/marketing` - Create marketing notification (ADMIN only)
- `GET /api/v1/notifications/marketing` - Get all marketing notifications (ADMIN only)
- `POST /api/v1/notifications/marketing/:id/send` - Send marketing notification (ADMIN only)
- `PUT /api/v1/notifications/marketing/:id/schedule` - Schedule marketing notification (ADMIN only)
- `GET /api/v1/notifications/preferences/:userId` - Get user marketing preferences (protected)
- `PUT /api/v1/notifications/preferences/:userId` - Update marketing preferences (protected)

---

## **Quick Start Commands**

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run start:dev

# Production build
npm run build

# Production mode
npm run start:prod

# Run tests
npm run test
npm run test:e2e
npm run test:cov

# Linting & formatting
npm run lint
npm run format
```

---

## **Technology Stack**

### **Core Framework**
- **NestJS** v10 - Progressive Node.js framework
- **TypeScript** v5.1 - Type-safe JavaScript
- **Node.js** - JavaScript runtime

### **Database & ODM**
- **MongoDB** - NoSQL database
- **Mongoose** v8.17 - MongoDB object modeling

### **Authentication & Security**
- **Passport** - Authentication middleware
- **passport-jwt** - JWT authentication strategy
- **@nestjs/jwt** - JWT utilities for NestJS
- **bcrypt** v6 - Password hashing

### **Validation & Transformation**
- **class-validator** - Decorator-based validation
- **class-transformer** - Object transformation

### **Communication**
- **Nodemailer** v7 - Email sending
- **Termii API** - SMS delivery (via fetch)

### **Configuration**
- **@nestjs/config** - Environment configuration
- **dotenv** - Environment variable loading

### **Development Tools**
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **ts-node** - TypeScript execution

---

## **Summary**

This is a **feature-rich, production-ready NestJS template** designed for service-oriented applications requiring:
- ✅ Robust authentication with phone/email verification
- ✅ Role-based access control
- ✅ Email and SMS integration
- ✅ Marketing campaign management
- ✅ Clean, modular architecture
- ✅ Type safety with TypeScript
- ✅ Input validation and error handling
- ✅ MongoDB with Mongoose
- ✅ JWT-based stateless authentication

**Best For**: SaaS apps, service marketplaces, booking platforms, or any app needing user management with multi-channel communications.

**Not Included**: Payment processing, file uploads, real-time features (WebSockets), caching (Redis), or advanced queuing.

---

## **Support & Contribution**

For questions or issues with this template:
1. Review the code in the relevant module
2. Check environment variable configuration
3. Verify external service credentials (MongoDB, Termii, Gmail)
4. Consult NestJS documentation: https://docs.nestjs.com

When extending this template, maintain the established patterns for consistency and maintainability.
