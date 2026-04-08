export class ResumeProcessingRecord {
  id!: string;
  organizationId?: string;
  status!: 'scaffolded';
  metadata?: Record<string, unknown>;
}
