# Stripe Payment Integration Guide

## Overview

This is a **minimal, beginner-friendly Stripe integration** for one-time payments using Payment Intents. It's designed as a learning resource and starting point, not a complete billing system.

### What This IS
- A working example of Stripe Payment Intents integration
- Simple, readable code following NestJS best practices
- Webhook handling for basic payment events
- Easy to understand for developers new to Stripe

### What This IS NOT
- A complete billing or subscription system
- Customer relationship management (CRM)
- Invoice generation system
- Product catalog or pricing management
- Complex payment flows (subscriptions, marketplace, etc.)

---

## Quick Start

### 1. Install Dependencies

The `stripe` package is already in `package.json`. Just run:

```bash
npm install
```

### 2. Get Your Stripe Keys

1. Sign up for a free Stripe account at [https://stripe.com](https://stripe.com)
2. Go to [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
3. Copy your **Secret Key** (starts with `sk_test_`)
4. Add it to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
```

### 3. Enable the Module

Uncomment the Stripe module in `src/app.module.ts`:

```typescript
import { StripeModule } from './stripe/stripe.module'; // Uncomment this line

@Module({
  imports: [
    // ... other modules
    StripeModule, // Uncomment this line
  ],
})
```

### 4. Start Your Server

```bash
npm run start:dev
```

You now have two new endpoints:
- `POST /stripe/create-payment-intent` (requires authentication)
- `POST /stripe/webhook` (public, for Stripe)

---

## How It Works (High-Level Flow)

### Payment Flow

```
┌─────────┐         ┌─────────────┐         ┌─────────┐
│ Client  │         │ Your Server │         │ Stripe  │
└────┬────┘         └──────┬──────┘         └────┬────┘
     │                     │                     │
     │  1. Request payment │                     │
     ├────────────────────>│                     │
     │                     │  2. Create Payment  │
     │                     │     Intent          │
     │                     ├────────────────────>│
     │                     │                     │
     │                     │  3. Return client   │
     │                     │     secret          │
     │                     │<────────────────────┤
     │  4. Return client   │                     │
     │     secret          │                     │
     │<────────────────────┤                     │
     │                     │                     │
     │  5. Confirm payment with Stripe.js        │
     ├──────────────────────────────────────────>│
     │                     │                     │
     │                     │  6. Webhook event   │
     │                     │     (async)         │
     │                     │<────────────────────┤
     │                     │                     │
     │  7. Payment result  │                     │
     │<───────────────────────────────────────────
```

### Step-by-Step

1. **Client requests payment**
   - Client sends amount and currency to your server
   - Endpoint: `POST /stripe/create-payment-intent`

2. **Server creates Payment Intent**
   - Your server calls Stripe API to create a Payment Intent
   - Stripe returns a `client_secret`

3. **Client confirms payment**
   - Client uses `client_secret` with Stripe.js or Stripe Elements
   - Client enters card details (Stripe handles this securely)

4. **Webhook notification**
   - Stripe sends webhook to `POST /stripe/webhook`
   - Your server processes the event (e.g., mark order as paid)

---

## Files Overview

### Start Reading Here (in order)

1. **`dto/create-payment-intent.dto.ts`** (20 lines)
   - Defines what data is needed to create a payment
   - Just amount, currency, and optional description

2. **`stripe.service.ts`** (150 lines)
   - Core logic for Stripe operations
   - `createPaymentIntent()` - Creates the payment
   - `handlePaymentSuccess()` - What to do when payment succeeds
   - Well-commented, explains the "why" behind each function

3. **`stripe.controller.ts`** (80 lines)
   - HTTP endpoints (routes)
   - `/create-payment-intent` - For authenticated users
   - `/webhook` - For Stripe to notify you

4. **`stripe.module.ts`** (30 lines)
   - NestJS module configuration
   - Ties everything together

---

## API Usage Examples

### Create a Payment Intent

**Request:**
```bash
POST http://localhost:3000/stripe/create-payment-intent
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "amount": 2000,        # $20.00 (amount in cents)
  "currency": "usd",     # Currency code
  "description": "Order #123"
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxxxx_secret_yyyyy",
  "paymentIntentId": "pi_xxxxx"
}
```

**Frontend Usage:**
```javascript
// On your frontend (React, Vue, etc.)
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_test_your_publishable_key');

// Get client secret from your server
const { clientSecret } = await fetch('/stripe/create-payment-intent', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({ amount: 2000, currency: 'usd' })
}).then(r => r.json());

// Confirm the payment
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement, // Stripe Elements card input
    billing_details: { name: 'Customer Name' }
  }
});

if (error) {
  console.error('Payment failed:', error.message);
} else {
  console.log('Payment successful!');
}
```

---

## Webhook Setup

### Local Development (Using Stripe CLI)

1. **Install Stripe CLI:**
   - Mac: `brew install stripe/stripe-cli/stripe`
   - Windows/Linux: [Download here](https://stripe.com/docs/stripe-cli)

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server:**
   ```bash
   stripe listen --forward-to localhost:3000/stripe/webhook
   ```

4. **Copy the webhook secret** (starts with `whsec_`) and add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

5. **Test with a payment:**
   ```bash
   stripe trigger payment_intent.succeeded
   ```

### Production Deployment

1. **Create webhook in Stripe Dashboard:**
   - Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/stripe/webhook`
   - Events to send: `payment_intent.succeeded`, `payment_intent.payment_failed`

2. **Copy the signing secret** and add to production `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### Supported Webhook Events

Currently implemented:
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed

To add more events, edit the `switch` statement in `stripe.controller.ts`.

---

## Implementing Your Business Logic

### Where to Add Your Code

Look for `TODO` comments in `stripe.service.ts`:

#### On Payment Success (`handlePaymentSuccess`)

```typescript
async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  // TODO: Add your business logic here
  
  // Example 1: Mark order as paid
  await this.orderService.markAsPaid(paymentIntent.metadata.orderId);
  
  // Example 2: Send confirmation email
  await this.mailService.sendPaymentConfirmation(
    paymentIntent.receipt_email,
    paymentIntent.amount
  );
  
  // Example 3: Grant access to digital product
  await this.userService.grantAccess(
    paymentIntent.metadata.userId,
    paymentIntent.metadata.productId
  );
}
```

#### On Payment Failure (`handlePaymentFailed`)

```typescript
async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // TODO: Add your failure handling
  
  // Example: Notify customer
  await this.mailService.sendPaymentFailureNotification(
    paymentIntent.receipt_email,
    paymentIntent.last_payment_error?.message
  );
}
```

### Passing Custom Data

Use `metadata` to pass custom data through Stripe:

```typescript
// In stripe.service.ts, modify createPaymentIntent:
const paymentIntent = await this.stripe.paymentIntents.create({
  amount,
  currency,
  description,
  metadata: {
    orderId: 'ORD-123',
    userId: 'user-456',
    productId: 'prod-789',
    // Add any custom data you need
  },
  automatic_payment_methods: { enabled: true },
});
```

Access it in webhooks:
```typescript
const orderId = paymentIntent.metadata.orderId;
```

---

## Currency Support

Stripe supports 135+ currencies. Common examples:

```typescript
// United States Dollar
{ amount: 2000, currency: 'usd' } // $20.00

// Euro
{ amount: 2000, currency: 'eur' } // €20.00

// British Pound
{ amount: 2000, currency: 'gbp' } // £20.00

// Japanese Yen (zero-decimal currency)
{ amount: 2000, currency: 'jpy' } // ¥2000 (not ¥20.00)
```

**Important:** Most currencies use cents (divide by 100), but some like JPY don't. Check [Stripe's currency docs](https://stripe.com/docs/currencies).

---

## Testing

### Test Card Numbers

Stripe provides test cards for development:

| Card Number         | Scenario                  |
|---------------------|---------------------------|
| 4242 4242 4242 4242 | Successful payment        |
| 4000 0000 0000 9995 | Decline - insufficient funds |
| 4000 0000 0000 0002 | Decline - generic error   |
| 4000 0025 0000 3155 | Requires authentication   |

- Use any future expiration date (e.g., 12/34)
- Use any 3-digit CVC (e.g., 123)
- Use any ZIP code

Full list: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

---

## Security Considerations

### What's Already Handled

- **Webhook signature verification** - Ensures webhooks are from Stripe  
- **HTTPS requirement** - Stripe only sends webhooks to HTTPS URLs in production  
- **Authentication on payment creation** - JWT guard protects the endpoint  
- **Input validation** - DTOs validate amount, currency, etc.

### What You Should Add (Production)

- **Amount validation** - Verify the amount matches your database before creating payment  
- **Idempotency** - Handle duplicate webhook events (same `paymentIntent.id`)  
- **Rate limiting** - Limit payment intent creation to prevent abuse  
- **Logging** - Log all payment events for audit trail

### Example: Idempotency Check

```typescript
async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  // Check if we've already processed this payment
  const existingPayment = await this.paymentRepo.findOne({
    stripePaymentIntentId: paymentIntent.id
  });
  
  if (existingPayment) {
    this.logger.warn(`Duplicate webhook for ${paymentIntent.id}`);
    return { received: true }; // Acknowledge but don't process again
  }
  
  // Process the payment...
}
```

---

## How to Remove This Module

If you don't need payments, follow these steps:

### 1. Delete Files
```bash
rm -rf src/stripe/
```

### 2. Remove from app.module.ts
```typescript
// Delete these lines:
import { StripeModule } from './stripe/stripe.module';

// Remove from imports array:
StripeModule,
```

### 3. Remove npm Package
```bash
npm uninstall stripe
```

### 4. Clean Environment Variables
Remove from `.env`:
```env
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

That's it! The template will work exactly as before.

---

## Extending This Integration

### Add Subscriptions

If you need recurring billing:

1. Create `subscription.service.ts`
2. Use `stripe.subscriptions.create()`
3. Handle `customer.subscription.created`, `customer.subscription.updated` webhooks
4. Reference: [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)

### Add Customer Management

To save customer payment methods:

1. Create `customer.service.ts`
2. Use `stripe.customers.create()`
3. Link customers to your User model
4. Reference: [Stripe Customers API](https://stripe.com/docs/api/customers)

### Add Refunds

1. Add endpoint: `POST /stripe/refund`
2. Use `stripe.refunds.create()`
3. Handle `charge.refunded` webhook
4. Reference: [Stripe Refunds](https://stripe.com/docs/refunds)

---

## Common Issues & Solutions

### Issue: "No signatures found matching the expected signature"

**Cause:** Webhook secret is wrong or body parsing is corrupting the raw body.

**Solution:**
1. Make sure `STRIPE_WEBHOOK_SECRET` in `.env` is correct
2. Check that raw body middleware is configured in `main.ts`
3. For local testing, use Stripe CLI: `stripe listen --forward-to localhost:3000/stripe/webhook`

### Issue: "Invalid API Key"

**Cause:** Wrong or missing `STRIPE_SECRET_KEY`.

**Solution:**
1. Check your `.env` file has `STRIPE_SECRET_KEY=sk_test_...`
2. Make sure you copied the full key from Stripe Dashboard
3. Use **Secret Key**, not Publishable Key

### Issue: "Amount must be at least 50 cents"

**Cause:** Stripe requires minimum amounts (varies by currency).

**Solution:**
- USD: minimum $0.50 (50 cents)
- EUR: minimum €0.50
- JPY: minimum ¥50

Adjust the `@Min()` validation in the DTO if needed.

---

## Resources

### Official Documentation
- [Stripe API Reference](https://stripe.com/docs/api)
- [Payment Intents Guide](https://stripe.com/docs/payments/payment-intents)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Testing Guide](https://stripe.com/docs/testing)

### NestJS + Stripe
- [NestJS Documentation](https://docs.nestjs.com/)
- [@golevelup/nestjs-stripe](https://github.com/golevelup/nestjs/tree/master/packages/stripe) - Advanced NestJS Stripe module

### Video Tutorials
- [Stripe Payment Intents Tutorial](https://www.youtube.com/results?search_query=stripe+payment+intents+tutorial)
- [Stripe Webhooks Explained](https://www.youtube.com/results?search_query=stripe+webhooks+tutorial)

---

## Summary

This Stripe integration provides:
- Simple Payment Intent creation
- Webhook handling for payment events
- Clean, documented code
- Easy to understand and extend
- Ready for production (with proper keys)

Remember: This is a **starting point**, not a complete solution. Add business logic, security measures, and features as your project grows.

**Questions?** Check Stripe's excellent documentation or open an issue in this repository.
