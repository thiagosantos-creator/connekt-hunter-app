import { Module } from '@nestjs/common';
import { WorkflowAutomationService } from './workflow-automation.service.js';
import { WorkflowAutomationController } from './workflow-automation.controller.js';

@Module({ providers: [WorkflowAutomationService], controllers: [WorkflowAutomationController] })
export class WorkflowAutomationModule {}
