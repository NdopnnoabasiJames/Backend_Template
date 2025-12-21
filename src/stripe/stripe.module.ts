import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

/**
 * Stripe Module
 * 
 * This is a self-contained, optional module for Stripe payment integration.
 * 
 * What it does:
 * - Creates Payment Intents for one-time payments
 * - Handles webhook events from Stripe
 * 
 * What it doesn't do:
 * - Subscriptions or recurring billing
 * - Customer management
 * - Invoice generation
 * - Product/Price management
 * 
 * To enable:
 * 1. Install stripe package: npm install stripe
 * 2. Add environment variables (see .env.example)
 * 3. Uncomment import in app.module.ts
 * 
 * To remove:
 * 1. Delete this entire stripe/ folder
 * 2. Remove import from app.module.ts
 * 3. Remove stripe from package.json
 * 4. Remove STRIPE_* variables from .env
 * 
 * Dependencies:
 * - ConfigModule: For environment variables
 * - stripe npm package: Official Stripe SDK
 */
@Module({
  imports: [ConfigModule],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService], // Export in case other modules need to use StripeService
})
export class StripeModule {}
