export class CommunicationsRecord {
  id!: string;
  organizationId?: string;
  status!: 'scaffolded';
  metadata?: Record<string, unknown>;
}
