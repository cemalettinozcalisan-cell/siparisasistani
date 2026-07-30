import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    const urlTenantId = request.params?.tenantId;

    // Get required roles from route handler metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Public endpoints (no auth required)
    if (!token) {
      if (requiredRoles && requiredRoles.length > 0) {
        this.logger.warn('Auth required but no token provided');
        throw new UnauthorizedException('Authentication required');
      }
      return true;
    }

    try {
      const session = this.authService.validateToken(token);
      if (!session) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Tenant ID validation
      if (urlTenantId && session.tenantId !== urlTenantId) {
        this.logger.warn(`Tenant mismatch: session=${session.tenantId}, request=${urlTenantId}`);
        throw new ForbiddenException('Tenant access denied');
      }

      // Role-based access control
      if (requiredRoles && requiredRoles.length > 0) {
        const userRole = session.role || 'staff';
        if (!requiredRoles.includes(userRole)) {
          this.logger.warn(`Role mismatch: user=${userRole}, required=${requiredRoles}`);
          throw new ForbiddenException('Bu işlem için yetkiniz bulunmuyor');
        }
      }

      // Attach user info to request
      (request as any).user = session;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException || e instanceof ForbiddenException) throw e;
      this.logger.error(`Tenant guard error: ${e}`);
      throw new UnauthorizedException('Authentication required');
    }
  }
}
