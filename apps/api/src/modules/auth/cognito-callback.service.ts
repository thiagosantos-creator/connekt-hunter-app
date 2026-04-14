import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface CognitoCallbackResult {
  token: string;
  provider: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationIds: string[];
  };
  candidateProfile?: {
    photoUrl?: string | null;
    fullName?: string | null;
  };
}

interface CognitoClaims {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  'cognito:username'?: string;
}

@Injectable()
export class CognitoCallbackService {
  private readonly logger = new Logger(CognitoCallbackService.name);

  /** Exchange authorization code for tokens and persist social profile */
  async handleCallback(input: {
    code: string;
    poolId: string;
    clientId: string;
    clientSecret: string | undefined;
    domain: string;
    redirectUri: string;
    region: string;
    inviteToken?: string;
  }): Promise<CognitoCallbackResult> {
    // 1. Exchange authorization code → tokens
    const tokenSet = await this.exchangeCode(input);

    // 2. Verify & decode id_token
    const claims = await this.verifyIdToken(tokenSet.id_token, {
      domain: input.domain,
      region: input.region,
      poolId: input.poolId,
      clientId: input.clientId,
    });

    const sub = claims.sub;
    const email = claims.email ?? `${sub}@cognito.local`;
    const socialName =
      claims.name ??
      [claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
      null;
    const pictureUrl = claims.picture ?? null;

    this.logger.log(
      JSON.stringify({ event: 'cognito_callback_claims', sub, email, hasPicture: Boolean(pictureUrl) }),
    );

    // 3. Upsert user
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: socialName || undefined },
      create: { email, name: socialName ?? email, role: 'candidate' },
    });

    // 4. Upsert AuthIdentity (cognito-social sub)
    await prisma.authIdentity.upsert({
      where: { provider_subject: { provider: 'aws-cognito', subject: sub } },
      update: { userId: user.id, email },
      create: { provider: 'aws-cognito', subject: sub, email, userId: user.id },
    });

    // 5. Persist social identity link with full claims
    await prisma.socialIdentityLink.upsert({
      where: { provider_subject: { provider: 'aws-cognito', subject: sub } },
      update: { profileJson: claims as never },
      create: { provider: 'aws-cognito', subject: sub, userId: user.id, profileJson: claims as never },
    });

    // 6. Link candidate if an invite token was provided
    let candidateProfile: { photoUrl?: string | null; fullName?: string | null } | undefined;
    if (input.inviteToken) {
      const candidate = await prisma.candidate.findUnique({ where: { token: input.inviteToken } });
      if (candidate && !candidate.userId) {
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: { userId: user.id, guestUpgradeAt: new Date() },
        });

        // Upsert full CandidateProfile with social data
        const profileUpdate = {
          socialName,
          socialEmail: email,
          ...(pictureUrl ? { photoUrl: pictureUrl, photoProvider: 'google' } : {}),
          ...(!candidate.profile ? { fullName: socialName } : {}),
        };
        const profile = await prisma.candidateProfile.upsert({
          where: { candidateId: candidate.id },
          update: profileUpdate,
          create: {
            candidateId: candidate.id,
            fullName: socialName,
            socialName,
            socialEmail: email,
            photoUrl: pictureUrl,
            photoProvider: pictureUrl ? 'google' : null,
          },
        });
        candidateProfile = { photoUrl: profile.photoUrl, fullName: profile.fullName };
      }
    }

    // 7. Create internal session
    const sessionToken = `cog-${randomUUID()}`;
    const expiresAt = new Date(
      Date.now() + Number(process.env.AUTH_SESSION_HOURS ?? 24) * 60 * 60 * 1000,
    );
    await prisma.userSession.create({
      data: {
        token: sessionToken,
        userId: user.id,
        provider: 'aws-cognito',
        expiresAt,
        metadata: { cognitoSub: sub, socialProviders: ['google', 'linkedin'] } as never,
      },
    });

    // 8. Audit
    await prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: 'auth.social_login',
        entityType: 'user-session',
        entityId: sessionToken,
        metadata: { provider: 'aws-cognito', sub } as never,
      },
    });

    return {
      token: sessionToken,
      provider: 'aws-cognito',
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationIds: [],
      },
      candidateProfile,
    };
  }

  private async exchangeCode(input: {
    code: string;
    clientId: string;
    clientSecret: string | undefined;
    domain: string;
    redirectUri: string;
  }): Promise<{ id_token: string; access_token: string }> {
    const tokenUrl = `${input.domain}/oauth2/token`;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
      client_id: input.clientId,
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };

    // Cognito requires Basic Auth when client secret is configured
    if (input.clientSecret) {
      const credentials = Buffer.from(`${input.clientId}:${input.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const res = await fetch(tokenUrl, { method: 'POST', headers, body: body.toString() });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error({ event: 'cognito_token_exchange_failed', status: res.status, body: text });
      throw new UnauthorizedException('cognito_token_exchange_failed');
    }

    const json = (await res.json()) as { id_token?: string; access_token?: string; error?: string };
    if (!json.id_token) {
      this.logger.error({ event: 'cognito_token_missing_id_token', json });
      throw new UnauthorizedException('cognito_id_token_missing');
    }

    return { id_token: json.id_token, access_token: json.access_token ?? '' };
  }

  private async verifyIdToken(
    idToken: string,
    input: { domain: string; region: string; poolId: string; clientId: string },
  ): Promise<CognitoClaims> {
    try {
      const jwksUri = `https://cognito-idp.${input.region}.amazonaws.com/${input.poolId}/.well-known/jwks.json`;
      const jwks = createRemoteJWKSet(new URL(jwksUri));
      const { payload } = await jwtVerify(idToken, jwks, {
        issuer: `https://cognito-idp.${input.region}.amazonaws.com/${input.poolId}`,
        audience: input.clientId,
      });
      return payload as unknown as CognitoClaims;
    } catch (err) {
      this.logger.error({ event: 'cognito_id_token_verification_failed', error: String(err) });
      throw new UnauthorizedException('cognito_id_token_invalid');
    }
  }
}
