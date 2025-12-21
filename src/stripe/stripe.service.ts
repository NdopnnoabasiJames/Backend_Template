import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

/**
 * Stripe Service
 * 
 * This service handles all Stripe-related operations.
 * Currently supports: Payment Intents (one-time payments only)
 * 
 * Why Payment Intents?
 * - Modern Stripe API (replaces deprecated Charges API)
 * - Built-in SCA (Strong Customer Authentication) support
 * - Better for learning the payment flow
 * 
 * Not included:
 * - Subscriptions (too complex for a starter template)
 * - Customer management (app-specific business logic)
 * - Invoice generation (beyond MVP scope)
 */
@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    // Initialize Stripe with secret key from environment
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured. Stripe integration will not work.',
      );
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia', // Use latest stable API version
    });
  }

  /**
   * Create a Payment Intent
   * 
   * A Payment Intent represents the intent to collect payment from a customer.
   * The client (frontend) will confirm this intent using Stripe Elements.
   * 
   * @param createPaymentIntentDto - Payment details (amount, currency, description)
   * @returns Payment Intent object with client_secret for frontend
   */
  async createPaymentIntent(createPaymentIntentDto: CreatePaymentIntentDto) {
    try {
      const { amount, currency, description } = createPaymentIntentDto;

      // Create the payment intent on Stripe
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        description,
        // automatic_payment_methods tells Stripe to enable compatible payment methods
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(
        `Payment Intent created: ${paymentIntent.id} for ${amount} ${currency}`,
      );

      // Return the client secret - frontend needs this to confirm the payment
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error('Failed to create payment intent', error.stack);
      throw new BadRequestException(
        'Could not create payment intent. Please check your Stripe configuration.',
      );
    }
  }

  /**
   * Verify Stripe webhook signature
   * 
   * Why verify?
   * - Ensures the webhook is actually from Stripe
   * - Prevents malicious actors from sending fake events
   * 
   * @param rawBody - Raw request body (must be unparsed)
   * @param signature - Stripe signature from headers
   * @returns Verified Stripe event object
   */
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new BadRequestException(
        'Webhook secret not configured. Cannot verify webhook signature.',
      );
    }

    try {
      // Stripe verifies the signature and returns the event
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error.stack);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Handle successful payment
   * 
   * This is where you'd implement your business logic:
   * - Update database (mark order as paid)
   * - Send confirmation email
   * - Grant access to digital product
   * - etc.
   * 
   * For a starter template, we just log it.
   * 
   * @param paymentIntent - The successful payment intent from Stripe
   */
  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(
      `Payment succeeded: ${paymentIntent.id} - Amount: ${paymentIntent.amount} ${paymentIntent.currency}`,
    );

    // TODO: Implement your business logic here
    // Example:
    // - Find the order by paymentIntent.metadata.orderId
    // - Update order status to 'paid'
    // - Send confirmation email to customer
    // - etc.

    return {
      received: true,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Handle failed payment
   * 
   * @param paymentIntent - The failed payment intent from Stripe
   */
  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.warn(
      `Payment failed: ${paymentIntent.id} - Reason: ${paymentIntent.last_payment_error?.message || 'Unknown'}`,
    );

    // TODO: Implement failure handling
    // Example:
    // - Notify customer about the failure
    // - Log for manual review
    // - Retry logic if applicable

    return {
      received: true,
      paymentIntentId: paymentIntent.id,
    };
  }
}
