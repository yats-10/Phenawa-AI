import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env['JWT_SECRET'],
  expiresIn: process.env['JWT_EXPIRES_IN'] ?? '30d',
  adminSecret: process.env['ADMIN_JWT_SECRET'],
  adminExpiresIn: process.env['ADMIN_JWT_EXPIRES_IN'] ?? '24h',
}));
