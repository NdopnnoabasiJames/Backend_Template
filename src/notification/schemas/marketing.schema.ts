import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType, NotificationTiming, MarketingCategory } from 'src/schemas/notification.schema';

@Schema({ timestamps: true })
export class MarketingNotification extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, enum: MarketingCategory })
  category: MarketingCategory;

  @Prop({ required: true, enum: NotificationType, default: NotificationType.EMAIL })
  type: NotificationType;

  @Prop({ required: true, enum: NotificationTiming, default: NotificationTiming.IMMEDIATE })
  timing: NotificationTiming;

  @Prop()
  scheduledDate?: Date;

  @Prop({ type: [String], default: [] })
  recipients: string[];

  @Prop({ default: false })
  sent: boolean;

  @Prop()
  sentAt?: Date;

  @Prop({ default: 0 })
  successCount: number;

  @Prop({ default: 0 })
  failureCount: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class UserMarketingPreference extends Document {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ default: true })
  optedIn: boolean;

  @Prop({ type: [String], enum: MarketingCategory, default: [MarketingCategory.PROMOTIONAL] })
  subscribedCategories: MarketingCategory[];

  @Prop()
  optOutDate?: Date;

  @Prop()
  lastEmailSent?: Date;
}

export const MarketingNotificationSchema = SchemaFactory.createForClass(MarketingNotification);
export const UserMarketingPreferenceSchema = SchemaFactory.createForClass(UserMarketingPreference);
