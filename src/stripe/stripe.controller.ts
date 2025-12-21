import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  BadRequestException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Stripe Controller
 * 
 * Handles HTTP endpoints for Stripe operations:
 * - POST /stripe/create-payment-intent (protected, requires auth)
 * - POST /stripe/webhook (public, for Stripe to call)
 * 
 * Why separate webhook from other endpoints?
 * - Webhook must be public (Stripe calls it)
 * - Webhook requires raw body (not JSON parsed)
 * - Other endpoints require authentication
 */
@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(private readonly stripeService: StripeService) {}

  /**
   * Create Payment Intent endpoint
   * 
   * Protected by JWT - only authenticated users can create payment intents.
   * 
   * Flow:
   * 1. Client requests payment intent with amount/currency
   * 2. Server creates intent on Stripe
   * 3. Server returns client_secret to client
   * 4. Client uses client_secret with Stripe.js to collect payment
   * 
   * @param createPaymentIntentDto - Payment details
   * @returns Object with clientSecret for frontend
   */
  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    return this.stripeService.createPaymentIntent(createPaymentIntentDto);
  }

  /**
   * Stripe Webhook endpoint
   * 
   * IMPORTANT: This endpoint must NOT be protected by auth guards.
   * Stripe's servers need to call this endpoint directly.
   * 
   * Security is handled by:
   * 1. Signature verification (STRIPE_WEBHOOK_SECRET)
   * 2. Event type checking
   * 
   * Why raw body?
   * - Stripe signature verification requires the exact raw request body
   * - NestJS normally parses body as JSON, which changes the raw bytes
   * - Solution: Use raw-body middleware (configured in main.ts)
   * 
   * Supported events:
   * - payment_intent.succeeded: Payment completed successfully
   * - payment_intent.payment_failed: Payment failed
   * 
   * Add more events as needed for your use case.
   * 
   * @param req - Raw Express request object
   * @param signature - Stripe signature from headers
   * @returns 200 OK to acknowledge receipt
   */
  @Post('webhook')
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Verify the webhook came from Stripe
    const event = this.stripeService.constructWebhookEvent(
      req.body, // This should be the raw body buffer
      signature,
    );

    this.logger.log(`Received webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        return this.stripeService.handlePaymentSuccess(
          event.data.object as any,
        );

      case 'payment_intent.payment_failed':
        return this.stripeService.handlePaymentFailed(
          event.data.object as any,
        );

      // Add more event handlers as needed
      // Examples: charge.refunded, customer.subscription.updated, etc.

      default:
        this.logger.warn(`Unhandled webhook event type: ${event.type}`);
        return { received: true };
    }
  }
}
