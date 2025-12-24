# Authentication & Authorization Flow

## Overview

This application uses JWT (JSON Web Tokens) for authentication and role-based access control (RBAC) for authorization.

## Authentication Flow

### 1. User Registration (Signup)

**Endpoint:** `POST /api/v1/auth/signup`

**Flow:**
```
1. User submits registration data
   ↓
2. Validate phone number format
   ↓
3. Check for duplicate email/phone
   ↓
4. Hash password with bcrypt
   ↓
5. Create user in database
   ↓
6. Generate phone verification OTP
   ↓
7. Send OTP via SMS
   ↓
8. Return user data (without password)
```

**Request:**
```json
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
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+2348012345678",
  "role": "user",
  "message": "User created successfully. OTP sent to phone."
}
```

### 2. Phone Verification

**Endpoint:** `POST /api/v1/auth/verify-phone`

**Flow:**
```
1. User receives OTP via SMS
   ↓
2. User submits phone + OTP
   ↓
3. Validate OTP (check code & expiry)
   ↓
4. Mark phone as verified
   ↓
5. Clear OTP from database
   ↓
6. Return success message
```

**Why Phone Verification?**
- Reduces fake accounts
- Enables password reset via SMS
- Required for login

### 3. User Login

**Endpoint:** `POST /api/v1/auth/login`

**Flow:**
```
1. User submits credentials
   ↓
2. Find user by phone or email
   ↓
3. Verify password with bcrypt
   ↓
4. Check if phone is verified
   ↓
5. Check if user is active
   ↓
6. Generate JWT token
   ↓
7. Return token + user data
```

**Request:**
```json
{
  "login": "08012345678",  // phone or email
  "password": "StrongPass123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

**JWT Payload:**
```json
{
  "sub": "user-uuid",      // Subject (user ID)
  "email": "john@example.com",
  "role": "user",
  "iat": 1234567890,       // Issued at
  "exp": 1234569690        // Expires at (30 min default)
}
```

### 4. Accessing Protected Routes

**Flow:**
```
1. Client includes JWT in Authorization header
   ↓
2. JwtAuthGuard intercepts request
   ↓
3. Extract and verify token
   ↓
4. JwtStrategy validates token signature
   ↓
5. Look up user in database
   ↓
6. Check if user is active
   ↓
7. Attach user to request object
   ↓
8. Controller handles request
```

**Request:**
```http
GET /api/v1/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**If Valid:**
- User object available in route handler
- Request proceeds normally

**If Invalid:**
- 401 Unauthorized response
- Error: "Login first to access this endpoint"

## Authorization (RBAC)

### Roles

Defined in `UserRole` enum:
- `USER` - Regular user
- `ADMIN` - Administrator

### Role-Based Access

**Using the `@Roles()` decorator:**

```typescript
@Get('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
async getAdminData() {
  // Only admins can access
}
```

**Flow:**
```
1. Request arrives
   ↓
2. JwtAuthGuard validates token
   ↓
3. RolesGuard checks user.role
   ↓
4. Compare with @Roles(UserRole.ADMIN)
   ↓
5. Allow if match, 403 Forbidden if not
```

### Permission Levels

**Public Routes:**
- No guards
- Anyone can access
- Example: signup, login

**Authenticated Routes:**
- `@UseGuards(JwtAuthGuard)`
- Must have valid JWT
- Example: user profile, update account

**Admin-Only Routes:**
- `@UseGuards(JwtAuthGuard, RolesGuard)`
- `@Roles(UserRole.ADMIN)`
- Only admin users
- Example: create marketing campaigns

## Password Reset

### Via SMS (OTP)

**Step 1:** Request OTP

**Endpoint:** `POST /api/v1/auth/forgot-password`

```
1. User submits phone number
   ↓
2. Generate 6-digit OTP
   ↓
3. Set expiry (default 10 minutes)
   ↓
4. Send OTP via SMS
   ↓
5. Store OTP in database (hashed)
```

**Rate Limiting:**
- Max 3 OTP requests per day
- Minimum 5 minutes between requests

**Step 2:** Reset Password

**Endpoint:** `POST /api/v1/auth/reset-password`

```
1. User submits phone + OTP + new password
   ↓
2. Validate OTP (code & expiry)
   ↓
3. Hash new password
   ↓
4. Update user password
   ↓
5. Clear OTP from database
```

### Via Email (Token)

**Step 1:** Request Reset Link

**Endpoint:** `POST /api/v1/auth/generate-reset-token`

```
1. User submits email
   ↓
2. Generate secure reset token (crypto.randomBytes)
   ↓
3. Set expiry (default 1 hour)
   ↓
4. Send email with reset link
   ↓
5. Store hashed token in database
```

**Step 2:** Reset Password

**Endpoint:** `POST /api/v1/auth/reset-password-token`

```
1. User clicks email link
   ↓
2. Submits token + new password
   ↓
3. Validate token (hash & expiry)
   ↓
4. Update password
   ↓
5. Clear token from database
```

## Security Features

### Password Hashing

**Algorithm:** bcrypt with salt rounds = 10

```typescript
const hashedPassword = await bcrypt.hash(password, 10);
```

**Why bcrypt?**
- Resistant to rainbow table attacks
- Adaptive (can increase rounds as hardware improves)
- Industry standard

### OTP Security

**Generation:**
```typescript
Math.floor(100000 + Math.random() * 900000).toString()
```

**Expiry:** 10 minutes (configurable)

**Storage:** Hashed in database

**Rate Limiting:**
- Daily limit (default 3 attempts)
- Minimum interval (default 5 minutes)

### JWT Security

**Secret:** Loaded from `JWT_SECRET` environment variable

**Expiry:** 30 minutes (configurable via `JWT_EXPIRY`)

**Best Practices:**
- Never expose `JWT_SECRET`
- Use strong, random secret (32+ characters)
- Rotate secrets periodically in production
- Use short expiry times
- Implement refresh tokens for longer sessions (not included)

### Token Validation

**On every protected request:**
1. Extract token from `Authorization` header
2. Verify signature with `JWT_SECRET`
3. Check expiration
4. Look up user in database
5. Verify user is active

**Why look up user?**
- Ensure user still exists
- Check if user is active/banned
- Get fresh role data
- Invalidate tokens for deleted users

## Guard Implementation

### JwtAuthGuard

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Uses Passport's JWT strategy. Automatically:
- Extracts token from header
- Verifies signature
- Calls JwtStrategy.validate()

### RolesGuard

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get('roles', context.getHandler());
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

Checks if user's role matches required roles from `@Roles()` decorator.

## Common Flows

### New User Journey

```
1. Signup → OTP sent to phone
2. Verify phone with OTP
3. Login → Receive JWT
4. Access protected routes with JWT
```

### Forgot Password Journey

```
1. Request OTP/token
2. Receive via SMS or email
3. Submit OTP/token + new password
4. Password updated
5. Login with new password
```

### Admin Action Journey

```
1. Admin logs in → JWT with role: ADMIN
2. Access admin endpoint
3. JwtAuthGuard validates token
4. RolesGuard checks role
5. Action performed
```

## Error Responses

**Invalid Credentials:**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials. Check phone/email and password."
}
```

**Phone Not Verified:**
```json
{
  "statusCode": 403,
  "message": "Phone number not verified. Please verify your phone first."
}
```

**Insufficient Permissions:**
```json
{
  "statusCode": 403,
  "message": "You do not have permission to access this resource"
}
```

**Token Expired:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

## Configuration

**Environment Variables:**
```env
JWT_SECRET=your-secret-key
JWT_EXPIRY=30m

OTP_EXPIRY_MINUTES=10
OTP_DAILY_LIMIT=3
OTP_MIN_INTERVAL_MINUTES=5
```

## Best Practices

**For Users:**
- Use strong passwords (8+ chars, mixed case, numbers, symbols)
- Never share JWT tokens
- Log out on shared devices

**For Developers:**
- Never commit `JWT_SECRET` to git
- Use environment variables
- Implement HTTPS in production
- Add rate limiting for auth endpoints
- Log failed login attempts
- Consider adding refresh tokens
- Implement 2FA for sensitive operations

## Extending Authentication

### Adding OAuth (Google, Facebook, etc.)

1. Install Passport strategy (e.g., `passport-google-oauth20`)
2. Create strategy file in `src/auth/strategies/`
3. Add OAuth endpoints in `auth.controller.ts`
4. Store OAuth provider ID in User model
5. Generate JWT after OAuth success

### Adding Refresh Tokens

1. Create RefreshToken model in Prisma
2. Generate both access + refresh tokens on login
3. Store refresh token in database
4. Create `/auth/refresh` endpoint
5. Validate refresh token, issue new access token
6. Rotate refresh tokens on use

### Adding 2FA

1. Add `twoFactorSecret` field to User model
2. Use library like `speakeasy` for TOTP
3. Create `/auth/2fa/enable` endpoint
4. Require 2FA code after password validation
5. Store backup codes for account recovery

## Further Reading

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://jwt.io/introduction)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
