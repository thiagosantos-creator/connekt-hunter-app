import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthIamService {
  getSummary() {
    return {
      module: 'auth-iam',
      title: 'Auth IAM',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/auth-iam/spec.md',
      responsibilities: [
        'login corporativo e autentica\u00e7\u00e3o social',
        'emiss\u00e3o, renova\u00e7\u00e3o e revoga\u00e7\u00e3o de sess\u00f5es',
        'integra\u00e7\u00e3o futura com Cognito',
      ],
    };
  }
}
