import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, IsBoolean, IsDateString } from "class-validator";
import { MarketingCategory, NotificationTiming } from "src/schemas/notification.schema";

export class CreateMarketingNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(MarketingCategory)
  @IsNotEmpty()
  category: MarketingCategory;

  @IsEnum(NotificationTiming)
  @IsOptional()
  timing?: NotificationTiming = NotificationTiming.IMMEDIATE;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsArray()
  @IsOptional()
  recipients?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateMarketingPreferenceDto {
  @IsBoolean()
  @IsOptional()
  optedIn?: boolean;

  @IsArray()
  @IsEnum(MarketingCategory, { each: true })
  @IsOptional()
  subscribedCategories?: MarketingCategory[];
}

export class SendMarketingEmailDto {
  @IsString()
  @IsNotEmpty()
  notificationId: string;
}
