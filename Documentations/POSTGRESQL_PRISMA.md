# PostgreSQL + Prisma Guide

This guide covers everything you need to know about using PostgreSQL with Prisma ORM in this NestJS template.

## Table of Contents

- [Why PostgreSQL + Prisma?](#why-postgresql--prisma)
- [Installation & Setup](#installation--setup)
- [Database Schema](#database-schema)
- [Common Operations](#common-operations)
- [Migrations](#migrations)
- [Prisma Studio](#prisma-studio)
- [Production Deployment](#production-deployment)
- [Migration from MongoDB](#migration-from-mongodb)

## Why PostgreSQL + Prisma?

### PostgreSQL Benefits

- **ACID Compliance**: Full transactional support with rollback capabilities
- **Advanced Data Types**: JSON, Arrays, Geographic data, Full-text search
- **Mature & Stable**: Battle-tested in production for decades
- **Free & Open Source**: No vendor lock-in, generous free tiers on cloud platforms
- **Strong Ecosystem**: Excellent tooling, extensions, and community support

### Prisma Benefits

- **Type Safety**: Auto-generated TypeScript types from your schema
- **Developer Experience**: Intuitive API, autocomplete, compile-time validation
- **Database Migrations**: Version-controlled schema changes
- **Prisma Studio**: Visual database browser and editor
- **Performance**: Optimized queries, connection pooling
- **Multi-Database**: Easy to switch between PostgreSQL, MySQL, SQLite

### When to Use This Stack

**Choose PostgreSQL + Prisma when:**
- You need relational data with foreign keys and joins
- ACID compliance and transactions are important
- You want strong type safety and compile-time checks
- Complex queries with aggregations are needed
- You're building SaaS, e-commerce, or enterprise apps
- You need advanced features like full-text search or geospatial data

**Choose MongoDB + Mongoose when:**
- Schema flexibility is critical (frequently changing data structure)
- You're storing JSON documents with variable fields
- Horizontal scalability is a priority
- You need embedded document relationships
- Real-time features are primary concern

## Installation & Setup

### 1. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)

**Docker (Recommended for Development):**
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=nestjs_starter \
  -p 5432:5432 \
  postgres:16
```

### 2. Create Database

```bash
# If using local PostgreSQL
createdb nestjs_starter

# Or using psql
psql -U postgres
CREATE DATABASE nestjs_starter;
\q
```

### 3. Configure Environment

Update `.env`:
```env
# Local development
DATABASE_URL="postgresql://postgres:password@localhost:5432/nestjs_starter?schema=public"

# Cloud options:
# Railway: Get from Railway dashboard
# Supabase: Get from Project Settings > Database > Connection String
# Heroku: Use DATABASE_URL from Heroku config vars
```

**Connection String Format:**
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

### 4. Run Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations to create tables
npm run prisma:migrate

# Optional: View database in Prisma Studio
npm run prisma:studio
```

## Database Schema

The schema is defined in [`prisma/schema.prisma`](../prisma/schema.prisma). Here's what's included:

### User Model

```prisma
model User {
  id                          String    @id @default(uuid())
  email                       String    @unique
  phone                       String    @unique
  password                    String
  firstName                   String
  lastName                    String
  isPhoneVerified             Boolean   @default(false)
  role                        UserRole  @default(USER)
  
  // Relations
  marketingPreferences        UserMarketingPreference?
  
  createdAt                   DateTime  @default(now())
  updatedAt                   DateTime  @updatedAt
}
```

**Key Features:**
- UUID primary keys (better for distributed systems than auto-increment)
- Email and phone uniqueness enforced at database level
- Timestamps automatically managed
- Enum for roles with compile-time validation

### Marketing Notification Model

```prisma
model MarketingNotification {
  id              String              @id @default(uuid())
  title           String
  content         String
  category        MarketingCategory
  timing          NotificationTiming
  scheduledDate   DateTime?
  sent            Boolean             @default(false)
  sentAt          DateTime?
  successCount    Int                 @default(0)
  failureCount    Int                 @default(0)
  metadata        Json?
  
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}
```

**Key Features:**
- JSON field for flexible metadata storage
- Enum-based category and timing for type safety
- Tracking fields for campaign analytics

### User Marketing Preference Model

```prisma
model UserMarketingPreference {
  id                        String            @id @default(uuid())
  userId                    String            @unique
  email                     String
  subscribedToPromotional   Boolean           @default(true)
  subscribedToNewsletter    Boolean           @default(true)
  subscribedToProductUpdates Boolean          @default(true)
  subscribedToEvents        Boolean           @default(true)
  preferEmail               Boolean           @default(true)
  preferSMS                 Boolean           @default(false)
  preferPush                Boolean           @default(false)
  
  // Foreign key relation
  user                      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt                 DateTime          @default(now())
  updatedAt                 DateTime          @updatedAt
}
```

**Key Features:**
- One-to-one relationship with User
- Cascade delete (preferences deleted when user is deleted)
- Granular opt-in/opt-out controls

## Common Operations

### Create

```typescript
// Create a user
const user = await this.prisma.user.create({
  data: {
    email: 'john@example.com',
    phone: '+2348012345678',
    password: hashedPassword,
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
  },
});

// Create with relations
const user = await this.prisma.user.create({
  data: {
    email: 'john@example.com',
    // ... other fields
    marketingPreferences: {
      create: {
        email: 'john@example.com',
        subscribedToPromotional: true,
      },
    },
  },
  include: {
    marketingPreferences: true,
  },
});
```

### Read

```typescript
// Find unique (by unique field)
const user = await this.prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    firstName: true,
    // Exclude password by not selecting it
  },
});

// Find many with filtering
const users = await this.prisma.user.findMany({
  where: {
    role: UserRole.USER,
    isPhoneVerified: true,
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 10,
  skip: 0,
});

// Count
const totalUsers = await this.prisma.user.count({
  where: { role: UserRole.USER },
});
```

### Update

```typescript
// Update single record
const user = await this.prisma.user.update({
  where: { id: userId },
  data: {
    isPhoneVerified: true,
    phoneVerificationOTP: null,
  },
});

// Update many
const result = await this.prisma.user.updateMany({
  where: {
    isPhoneVerified: false,
    createdAt: {
      lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
  },
  data: {
    phoneVerificationOTP: null,
  },
});
```

### Delete

```typescript
// Delete single record
await this.prisma.user.delete({
  where: { id: userId },
});

// Delete many
await this.prisma.marketingNotification.deleteMany({
  where: {
    sent: true,
    sentAt: {
      lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    },
  },
});
```

### Error Handling

```typescript
import { Prisma } from '@prisma/client';

try {
  await this.prisma.user.create({ data: userData });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      throw new ConflictException('User with this email already exists');
    }
    // Record not found
    if (error.code === 'P2025') {
      throw new NotFoundException('User not found');
    }
  }
  throw error;
}
```

**Common Prisma Error Codes:**
- `P2002`: Unique constraint violation
- `P2025`: Record not found
- `P2003`: Foreign key constraint violation
- `P2016`: Query interpretation error

## Migrations

Migrations are version-controlled changes to your database schema.

### Create a Migration

```bash
# After editing schema.prisma
npm run prisma:migrate

# This will:
# 1. Prompt you for a migration name
# 2. Generate SQL migration file
# 3. Apply migration to database
# 4. Update Prisma Client
```

**Example workflow:**
```bash
# Edit prisma/schema.prisma - add a new field
model User {
  // ... existing fields
  lastLogin DateTime?  // New field
}

# Create migration
npm run prisma:migrate
# Enter name: "add_last_login_field"

# Migration file created at:
# prisma/migrations/20240101120000_add_last_login_field/migration.sql
```

### Migration Best Practices

1. **Always review generated SQL** before applying to production
2. **Test migrations** in development/staging first
3. **Backup production database** before major schema changes
4. **Use descriptive names** for migrations
5. **Don't edit applied migrations** - create new ones instead

### Useful Migration Commands

```bash
# Check migration status
npx prisma migrate status

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Deploy migrations in production
npx prisma migrate deploy

# Create migration without applying
npx prisma migrate dev --create-only
```

### Production Migration Strategy

```bash
# 1. Create migration in development
npm run prisma:migrate

# 2. Commit migration files to git
git add prisma/migrations
git commit -m "Add user last login field"

# 3. In production, run:
npx prisma migrate deploy
```

## Prisma Studio

Prisma Studio is a visual database browser included with Prisma.

### Launch Prisma Studio

```bash
npm run prisma:studio
# Opens at http://localhost:5555
```

### What You Can Do

- **View all data** - Browse tables and records
- **Edit records** - Update data directly in the UI
- **Filter & search** - Find specific records quickly
- **Create records** - Add test data without SQL
- **View relations** - Navigate between related records

### Use Cases

- **Development**: Create test users and data
- **Debugging**: Inspect database state
- **Admin tasks**: Manual data corrections
- **Learning**: Understand your data model

**⚠️ Security Note:** Never expose Prisma Studio in production!

## Production Deployment

### Environment Variables

```env
# Production
DATABASE_URL="postgresql://user:password@production-host:5432/dbname?schema=public"

# Optional: Connection pooling (for serverless)
DATABASE_URL="postgresql://user:password@pooler-host:5432/dbname?pgbouncer=true"
```

### Deployment Steps

1. **Set environment variables** in your hosting platform
2. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```
3. **Generate Prisma Client** (usually done during build):
   ```bash
   npx prisma generate
   ```

### Cloud Providers

#### Railway

1. Create PostgreSQL database in Railway
2. Copy `DATABASE_URL` from Railway dashboard
3. Add to environment variables
4. Deploy - migrations run automatically

#### Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to Project Settings > Database
3. Copy connection string (use "Connection Pooling" for serverless)
4. Update `DATABASE_URL` in `.env`

#### Heroku

```bash
# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# DATABASE_URL is set automatically
# Run migrations
heroku run npx prisma migrate deploy
```

### Connection Pooling

For serverless/lambda deployments:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Enable pgBouncer connection pooling
}
```

Update connection string:
```env
DATABASE_URL="postgresql://user:password@host:5432/db?pgbouncer=true&connection_limit=1"
```

## Migration from MongoDB

If you're migrating from the MongoDB version of this template:

### Key Differences

| MongoDB | PostgreSQL + Prisma |
|---------|---------------------|
| `_id` | `id` (UUID) |
| ObjectId | String (UUID) |
| `save()` | `create()` / `update()` |
| `findById()` | `findUnique({ where: { id } })` |
| `findOne({ field })` | `findUnique({ where: { field } })` |
| `.select('-password')` | `select: { password: false }` |
| Schema in code | Schema in prisma/schema.prisma |

### Migration Steps

1. **Export data from MongoDB** (if needed):
   ```bash
   mongoexport --db=nestjs-starter --collection=users --out=users.json
   ```

2. **Set up PostgreSQL** (follow setup guide above)

3. **Transform and import data**:
   - Convert ObjectIds to UUIDs
   - Adjust date formats if needed
   - Update field names (`_id` → `id`)

4. **Update application code**:
   - Replace Mongoose imports with Prisma
   - Update service methods
   - Adjust error handling

### Example Code Changes

**Before (Mongoose):**
```typescript
const user = await this.userModel.findById(id).select('-password');
```

**After (Prisma):**
```typescript
const user = await this.prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    // password excluded by omission
  },
});
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql postgresql://user:password@host:5432/dbname

# Check if PostgreSQL is running
# macOS/Linux:
pg_isready

# Check logs
# macOS: /usr/local/var/log/postgres.log
# Linux: /var/log/postgresql/
```

### Schema Drift

If Prisma Client is out of sync with database:
```bash
# Pull current database schema
npx prisma db pull

# Regenerate client
npx prisma generate
```

### Reset Everything

```bash
# ⚠️ Deletes all data and resets migrations
npx prisma migrate reset
```

## Further Reading

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [NestJS Prisma Integration](https://docs.nestjs.com/recipes/prisma)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

**Need help?** Open an issue in the repository or check the main [ONBOARDING.md](../ONBOARDING.md) guide.
