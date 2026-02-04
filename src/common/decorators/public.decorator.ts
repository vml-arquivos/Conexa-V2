import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator para marcar uma rota como pública (não requer autenticação)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
