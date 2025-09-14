# ServiceCall API

A NestJS API for service management with authentication and role-based access control.

## Features

- User authentication (signup, login)
- Password reset functionality
- Role-based access control (User, Artisan)
- JWT authentication
- MongoDB integration
- Email notifications

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd servicall

# Install dependencies
npm install
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database Configuration
DATABASE_URI=mongodb://localhost:27017/servicall

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Email Configuration
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password

# Server Configuration
PORT=3000
```

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/signup` - Register a new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password/:token` - Reset password with token

### User Management

- `GET /api/v1/user` - Get all users (protected)
- `GET /api/v1/user/profile` - Get current user profile (protected)
- `GET /api/v1/user/:id` - Get user by ID (protected)
- `PATCH /api/v1/user/:id` - Update user (protected)
- `DELETE /api/v1/user/:id` - Delete user (protected)
- `GET /api/v1/user/admin` - Get admin data (protected, artisan role required)

## Authentication

For protected routes, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## License

This project is licensed under the MIT License.
