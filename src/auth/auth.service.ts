import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Realiza o login do usuário
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuário com suas roles e permissões
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            unitScopes: {
              include: {
                unit: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar status do usuário
    if (user.status !== 'ATIVO') {
      throw new UnauthorizedException('Usuário inativo');
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Construir payload do JWT
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      mantenedoraId: user.mantenedoraId,
      unitId: user.unitId || undefined,
      roles: user.roles.map((userRole) => ({
        roleId: userRole.roleId,
        level: userRole.scopeLevel,
        unitScopes: userRole.unitScopes.map((scope) => scope.unitId),
      })),
    };

    // Gerar tokens
    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    // Atualizar lastLogin
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mantenedoraId: user.mantenedoraId,
        unitId: user.unitId,
        roles: payload.roles,
      },
    };
  }

  /**
   * Renova o access token usando o refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      // Verificar se o usuário ainda existe e está ativo
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, status: true },
      });

      if (!user || user.status !== 'ATIVO') {
        throw new UnauthorizedException('Usuário inativo ou não encontrado');
      }

      // Gerar novo access token
      const newAccessToken = await this.generateAccessToken(payload);

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  /**
   * Gera um access token JWT
   */
  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    return this.jwtService.signAsync(payload as any, {
      secret,
      expiresIn: expiresIn as any,
    });
  }

  /**
   * Gera um refresh token JWT
   */
  private async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    return this.jwtService.signAsync(payload as any, {
      secret,
      expiresIn: expiresIn as any,
    });
  }

  /**
   * Utilitário para hash de senha (usado ao criar usuários)
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Utilitário para validar senha
   */
  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Retorna os dados do usuário autenticado — GET /auth/me
   * Utilizado pelo frontend para carregar o perfil após login
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        mantenedoraId: true,
        unitId: true,
      },
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    // Buscar roles separadamente para evitar problemas de tipo
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, isActive: true },
      select: { scopeLevel: true },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        nome: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        status: user.status,
        mantenedoraId: user.mantenedoraId,
        unitId: user.unitId,
        roles: userRoles.map((r) => r.scopeLevel),
      },
    };
  }
}
