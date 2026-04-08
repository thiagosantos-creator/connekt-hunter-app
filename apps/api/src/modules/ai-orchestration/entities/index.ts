export class AiOrchestrationRecord {
  id!: string;
  organizationId?: string;
  status!: 'scaffolded';
  metadata?: Record<string, unknown>;
}
