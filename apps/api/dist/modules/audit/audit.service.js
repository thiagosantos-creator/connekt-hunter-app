var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
let AuditService = class AuditService {
    log(action, entityType, entityId, metadata = {}) {
        return prisma.auditEvent.create({ data: { action, entityType, entityId, metadata: metadata } });
    }
    findAll() {
        return prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' } });
    }
};
AuditService = __decorate([
    Injectable()
], AuditService);
export { AuditService };
//# sourceMappingURL=audit.service.js.map