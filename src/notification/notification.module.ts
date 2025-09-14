import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { MarketingNotification, MarketingNotificationSchema, UserMarketingPreference, UserMarketingPreferenceSchema } from './schemas/marketing.schema';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketingNotification.name, schema: MarketingNotificationSchema },
      { name: UserMarketingPreference.name, schema: UserMarketingPreferenceSchema },
    ]),
    MailModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
