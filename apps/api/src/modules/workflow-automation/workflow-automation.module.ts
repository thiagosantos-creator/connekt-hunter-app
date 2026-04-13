import { Module } from '@nestjs/common';
import { WorkflowAutomationService } from './workflow-automation.service.js';
import { WorkflowAutomationController } from './workflow-automation.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({ imports: [AuthModule], providers: [WorkflowAutomationService], controllers: [WorkflowAutomationController] })
export class WorkflowAutomationModule {}
