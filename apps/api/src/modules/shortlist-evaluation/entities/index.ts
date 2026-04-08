export class ShortlistEvaluationRecord {
  id!: string;
  organizationId?: string;
  status!: 'scaffolded';
  metadata?: Record<string, unknown>;
}
