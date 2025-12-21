/**
 * Stripe Integration Test Examples
 * 
 * These are example test requests you can use to test the Stripe integration.
 * Make sure to:
 * 1. Install dependencies: npm install
 * 2. Add STRIPE_SECRET_KEY to your .env file
 * 3. Enable StripeModule in app.module.ts
 * 4. Start the server: npm run start:dev
 * 
 * NOTE: This file contains example code snippets, not executable tests.
 * Copy the examples below to test the integration.
 */

// ============================================
// 1. CREATE PAYMENT INTENT (Requires JWT token)
// ============================================

// Example function - wrap in async function to use
async function testPaymentIntent() {
  // First, login to get JWT token
  const loginResponse = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '08012345678',
      password: 'password123'
    })
  });
  const { access_token } = await loginResponse.json();

  // Then create payment intent
  const paymentResponse = await fetch('http://localhost:3000/stripe/create-payment-intent', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`
    },
    body: JSON.stringify({
      amount: 2000,        // $20.00 in cents
      currency: 'usd',
      description: 'Test payment'
    })
  });

  const { clientSecret, paymentIntentId } = await paymentResponse.json();
  console.log('Payment Intent created:', paymentIntentId);
  console.log('Client Secret:', clientSecret);
}

// Uncomment to run: testPaymentIntent();

// ============================================
// 2. CURL EXAMPLES
// ============================================

/*
# Step 1: Login and get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "08012345678",
    "password": "password123"
  }'

# Copy the access_token from response

# Step 2: Create Payment Intent
curl -X POST http://localhost:3000/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "amount": 2000,
    "currency": "usd",
    "description": "Test payment for Order #123"
  }'
*/

// ============================================
// 3. FRONTEND EXAMPLE (React + Stripe.js)
// ============================================

/*
// Install: npm install @stripe/stripe-js @stripe/react-stripe-js

import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY');

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Create payment intent on your server
    const response = await fetch('http://localhost:3000/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      },
      body: JSON.stringify({
        amount: 2000,
        currency: 'usd',
        description: 'Order #123'
      })
    });

    const { clientSecret } = await response.json();

    // 2. Confirm payment with Stripe
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: 'Customer Name',
        },
      },
    });

    if (error) {
      console.error('Payment failed:', error.message);
    } else if (paymentIntent.status === 'succeeded') {
      console.log('Payment successful!', paymentIntent.id);
      // Show success message to user
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>Pay $20.00</button>
    </form>
  );
}

function App() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}
*/

// ============================================
// 4. TESTING WEBHOOKS LOCALLY
// ============================================

/*
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/stripe/webhook

# Copy the webhook signing secret (whsec_...) to your .env:
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded

# Check your server logs to see the webhook was received
*/

// ============================================
// 5. TEST WITH STRIPE TEST CARDS
// ============================================

/*
When using the frontend, use these test card numbers:

Success:
- Card: 4242 4242 4242 4242
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)

Decline (insufficient funds):
- Card: 4000 0000 0000 9995

Requires authentication (3D Secure):
- Card: 4000 0025 0000 3155

See more: https://stripe.com/docs/testing
*/

// ============================================
// 6. POSTMAN COLLECTION
// ============================================

/*
Import this into Postman:

{
  "info": {
    "name": "Stripe Integration",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Payment Intent",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"amount\": 2000,\n  \"currency\": \"usd\",\n  \"description\": \"Test payment\"\n}"
        },
        "url": {
          "raw": "http://localhost:3000/stripe/create-payment-intent",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["stripe", "create-payment-intent"]
        }
      }
    }
  ]
}
*/

export {};
