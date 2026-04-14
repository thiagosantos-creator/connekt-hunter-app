import { ForbiddenException } from '@nestjs/common';
import { prisma } from '@connekt/db';

export async function canAccessOrganization(organizationId: string, actorId?: string): Promise<boolean> {
  if (!actorId) return true;

  const membership = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId: actorId } },
  });
  if (membership) return true;

  const user = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });
  return user?.role === 'admin';
}

export async function assertOrganizationAccess(organizationId: string, actorId?: string): Promise<void> {
  const allowed = await canAccessOrganization(organizationId, actorId);
  if (!allowed) throw new ForbiddenException('user_not_member_of_org');
}
