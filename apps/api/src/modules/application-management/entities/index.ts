export class ApplicationManagementRecord {
  id!: string;
  organizationId?: string;
  status!: 'scaffolded';
  metadata?: Record<string, unknown>;
}
