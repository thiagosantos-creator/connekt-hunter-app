var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ClientDecisionsService } from './client-decisions.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
let ClientDecisionsController = class ClientDecisionsController {
    clientDecisionsService;
    constructor(clientDecisionsService) {
        this.clientDecisionsService = clientDecisionsService;
    }
    create(body, user) {
        return this.clientDecisionsService.create(body.shortlistItemId, user.id, body.decision);
    }
};
__decorate([
    Post(),
    RequirePermissions('decision:write'),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ClientDecisionsController.prototype, "create", null);
ClientDecisionsController = __decorate([
    Controller('client-decisions'),
    UseGuards(JwtAuthGuard, PermissionsGuard),
    __metadata("design:paramtypes", [ClientDecisionsService])
], ClientDecisionsController);
export { ClientDecisionsController };
//# sourceMappingURL=client-decisions.controller.js.map