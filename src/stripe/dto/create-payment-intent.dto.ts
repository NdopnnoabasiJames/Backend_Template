import { IsNotEmpty, IsNumber, IsString, Min, IsOptional } from 'class-validator';

/**
 * DTO for creating a Stripe Payment Intent
 * 
 * Why these fields:
 * - amount: Required by Stripe, in smallest currency unit (e.g., cents for USD)
 * - currency: Required, defaults to USD but should be configurable
 * - description: Optional, helps with record-keeping in Stripe dashboard
 */
export class CreatePaymentIntentDto {
  @IsNumber()
  @Min(50, { message: 'Amount must be at least 50 cents (or equivalent)' })
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsOptional()
  description?: string;
}
