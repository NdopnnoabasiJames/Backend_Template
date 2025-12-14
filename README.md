# NestJS Authentication & Notification Starter Template

![NestJS](https://img.shields.io/badge/NestJS-v10-E0234E?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-v5-3178C6?logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-v8-47A248?logo=mongodb)
![License](https://img.shields.io/badge/license-MIT-green)

A production-ready NestJS starter template with authentication, authorization, email/SMS notifications, and marketing capabilities built-in. Perfect for jumpstarting SaaS applications, service marketplaces, or any project requiring robust user management.

## Features

- **Complete Authentication System**
  - JWT-based authentication with configurable expiration
  - Phone-based signup and login (with SMS OTP verification)
  - Email-based authentication (optional)
  - Password reset via OTP or email token
  - Rate-limited OTP requests to prevent abuse

- **Role-Based Access Control (RBAC)**
  - Built-in roles: USER and ADMIN
  - Custom guard and decorator patterns
  - Easy to extend with additional roles

- **Email Integration**
  - Nodemailer with Gmail SMTP
  - Email templates for verification and password reset
  - Marketing email campaigns

- **SMS Integration**
  - Termii API integration (configurable for multiple countries)
  - Phone number validation and formatting
  - Bulk SMS capabilities

- **Marketing & Notifications**
  - User preference management (opt-in/opt-out)
  - Category-based subscriptions
  - Scheduled vs immediate notifications
  - Campaign success tracking

- **Data Validation**
  - Global validation pipes
  - DTO validation with class-validator
  - Type-safe schemas with Mongoose

- **Best Practices**
  - Modular architecture
  - Environment-based configuration
  - Comprehensive error handling
  - Security-first design

## Who This Is For

**Perfect for:**
- SaaS applications with user accounts
- Service marketplaces (delivery, booking, on-demand services)
- Mobile app backends requiring phone authentication
- Projects needing marketing/notification features
- Teams wanting a production-ready auth foundation

**Not ideal for:**
- Simple REST APIs without user accounts
- Real-time applications (no WebSocket support included)
- Projects requiring payment processing out-of-the-box
- Content management systems
- Static websites

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **MongoDB** 6+ (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **npm** or **yarn**

### Optional (for full features):
- **Termii Account** - For SMS functionality ([sign up](https://termii.com))
- **Gmail Account** - For email notifications

## Quick Start (5 Minutes)

1. **Clone and install:**
   ```bash
   git clone <repository-url> my-project
   cd my-project
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env - minimum required: DATABASE_URI, JWT_SECRET
   ```

3. **Start MongoDB:**
   ```bash
   # Using Docker:
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or use MongoDB Atlas (cloud) - update DATABASE_URI in .env
   ```

4. **Run the application:**
   ```bash
   npm run start:dev
   ```

5. **Test the API:**
   ```bash
   # Register a new user
   curl -X POST http://localhost:3000/api/v1/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "John",
       "lastName": "Doe",
       "email": "john@example.com",
       "password": "password123",
       "phone": "08012345678",
       "role": "user"
     }'
   ```

## Configuration

### Required Environment Variables

```env
# Application
APP_NAME=My Application
DATABASE_URI=mongodb://localhost:27017/my-app
JWT_SECRET=your-super-secret-jwt-key-change-this

# Email (for Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
```

### Optional Environment Variables

```env
# JWT Configuration
JWT_EXPIRY=30m  # 30 minutes, 1h, 7d, etc.

# SMS Configuration (Termii)
TERMII_API_KEY=your-api-key
TERMII_SENDER_ID=YourAppName
SMS_COUNTRY_CODE=+234  # Nigeria default, supports +1, +44, +91, etc.

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_DAILY_LIMIT=3
OTP_MIN_INTERVAL_MINUTES=5

# Frontend
FRONTEND_URL=http://localhost:3001
```

See [.env.example](.env.example) for complete configuration options.

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `POST /api/v1/auth/verify-phone` - Verify phone with OTP
- `POST /api/v1/auth/forgot-password` - Request password reset OTP
- `POST /api/v1/auth/reset-password` - Reset password with OTP

### User Management (Protected)
- `GET /api/v1/user` - Get all users
- `GET /api/v1/user/profile` - Get current user profile
- `GET /api/v1/user/:id` - Get user by ID
- `PATCH /api/v1/user/:id` - Update user
- `DELETE /api/v1/user/:id` - Delete user

### Admin Only (ADMIN role required)
- `GET /api/v1/user/admin` - Get admin data
- `POST /api/v1/notifications/marketing` - Create marketing campaign
- `POST /api/v1/notifications/marketing/:id/send` - Send campaign

For complete API documentation, see [ONBOARDING.md](ONBOARDING.md#api-endpoints-reference).

## Authentication Flow

All protected routes require JWT token in Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X GET http://localhost:3000/api/v1/user/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Project Structure

```
src/
├── auth/           # Authentication logic, guards, strategies
├── user/           # User CRUD operations
├── database/       # MongoDB connection
├── mail/           # Email service (Nodemailer)
├── sms/            # SMS service (Termii)
├── notification/   # Marketing campaigns
├── main.ts         # Application entry point
└── app.module.ts   # Root module
```

## Available Scripts

```bash
# Development
npm run start:dev      # Run with hot reload

# Production
npm run build          # Build for production
npm run start:prod     # Run production build

# Testing
npm run test           # Run unit tests
npm run test:e2e       # Run end-to-end tests
npm run test:cov       # Generate coverage report

# Code Quality
npm run lint           # Run ESLint
npm run format         # Format with Prettier
```

## Customization

### Adding New Roles

1. Update `src/user/enums/role.enum.ts`:
   ```typescript
   export enum UserRole {
     USER = 'user',
     ADMIN = 'admin',
     MODERATOR = 'moderator',  // Add new role
   }
   ```

2. Use in controllers:
   ```typescript
   @Roles(UserRole.MODERATOR)
   ```

### Changing Phone Number Region

Update `.env`:
```env
SMS_COUNTRY_CODE=+1  # USA/Canada
SMS_PHONE_REGEX=^\+1[0-9]{10}$
```

Supported countries: Nigeria (+234), USA/Canada (+1), UK (+44), India (+91)

### Switching Email Provider

Update `src/mail/mail.service.ts` transporter configuration:

```typescript
// Example: SendGrid
this.transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});
```

### Making Features Optional

Remove unwanted modules from `src/app.module.ts`:

```typescript
@Module({
  imports: [
    // Remove SmsModule if you don't need SMS
    // Remove NotificationModule if you don't need marketing
  ],
})
```

For detailed customization guide, see [ONBOARDING.md](ONBOARDING.md).

## Troubleshooting

### Cannot connect to MongoDB
- Ensure MongoDB is running: `mongosh` or check service status
- Verify `DATABASE_URI` in `.env`
- Check firewall/network settings

### SMS not sending
- Verify `TERMII_API_KEY` is correct
- Check Termii account credits
- Ensure phone number matches configured country code
- Review SMS service logs in console

### Email not sending
- Use Gmail app password, not regular password
- Enable 2FA and generate app password at: https://myaccount.google.com/apppasswords
- Check Gmail sending limits (500 emails/day for free accounts)

### JWT token invalid
- Verify `JWT_SECRET` is set and consistent
- Check token expiration (default 30 minutes)
- Ensure correct format: `Bearer <token>`

## Documentation

- [ONBOARDING.md](ONBOARDING.md) - Complete technical documentation
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [LICENSE](LICENSE) - MIT License

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Authentication powered by [Passport](http://www.passportjs.org/)
- Email by [Nodemailer](https://nodemailer.com/)
- SMS by [Termii](https://termii.com/)

---

**Ready to build something awesome?** Star this repo and start customizing!
