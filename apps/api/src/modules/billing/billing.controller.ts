import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { BillingService } from './billing.service.js';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  createCheckout(@Body() body: { organizationId: string, plan: string }) {
    return this.billingService.createCheckoutSession(body.organizationId, body.plan);
  }

  @Get('status/:organizationId')
  getStatus(@Param('organizationId') organizationId: string) {
    return this.billingService.getSubscriptionStatus(organizationId);
  }

  @Post('webhook')
  webhook(@Body() payload: any) {
    return this.billingService.handleWebhook(payload);
  }
}
