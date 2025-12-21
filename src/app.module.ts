import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';
import { MailModule } from './mail/mail.module';
import { SmsModule } from './sms/sms.module';
import { NotificationModule } from './notification/notification.module';
import { ConfigModule } from '@nestjs/config';
// import { StripeModule } from './stripe/stripe.module'; // Uncomment to enable Stripe payments

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule, 
    UserModule, 
    DatabaseModule, 
    MailModule,
    SmsModule,
    NotificationModule,
    // StripeModule, // Uncomment to enable Stripe payments
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
