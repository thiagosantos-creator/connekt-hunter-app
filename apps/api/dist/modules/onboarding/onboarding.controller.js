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
import { Body, Controller, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service.js';
let OnboardingController = class OnboardingController {
    onboardingService;
    constructor(onboardingService) {
        this.onboardingService = onboardingService;
    }
    basic(body) {
        return this.onboardingService.basic(body.token, body.fullName, body.phone);
    }
    consent(body) {
        return this.onboardingService.consent(body.token);
    }
    resume(body) {
        return this.onboardingService.resume(body.token, body.filename);
    }
};
__decorate([
    Post('basic'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OnboardingController.prototype, "basic", null);
__decorate([
    Post('consent'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OnboardingController.prototype, "consent", null);
__decorate([
    Post('resume'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OnboardingController.prototype, "resume", null);
OnboardingController = __decorate([
    Controller('candidate/onboarding'),
    __metadata("design:paramtypes", [OnboardingService])
], OnboardingController);
export { OnboardingController };
//# sourceMappingURL=onboarding.controller.js.map