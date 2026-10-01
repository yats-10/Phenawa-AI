import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Browser origins allowed to call this API. Native builds (Capacitor) and
 * server-to-server calls send no Origin header at all and are always allowed —
 * CORS only constrains browsers.
 */
function parseAllowedOrigins(): string[] {
  const raw = process.env['CORS_ORIGINS'] ?? '';
  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter((origin) => origin.length > 0);
}

/**
 * Matches an origin against a wildcard entry like "https://*.vercel.app" or
 * "*.vercel.app". The wildcard stands for exactly one subdomain label, so
 * "https://evil.com?x=.vercel.app" and "https://a.b.vercel.app" do not match.
 */
function matchesWildcard(origin: string, allowed: string): boolean {
  const star = allowed.indexOf('*.');
  if (star === -1) return false;

  const scheme = allowed.slice(0, star);
  const suffix = allowed.slice(star + 1); // keeps the leading dot

  if (scheme !== '' && !origin.startsWith(scheme)) return false;

  let host: string;
  try {
    const url = new URL(origin);
    if (scheme === '' && url.protocol !== 'https:') return false;
    host = url.hostname;
  } catch {
    return false;
  }

  if (!host.endsWith(suffix)) return false;
  const label = host.slice(0, host.length - suffix.length);
  return label.length > 0 && !label.includes('.');
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Body limit raised to 50MB: person and fabric photos arrive base64-encoded.
  const express = await import('express');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const allowedOrigins = parseAllowedOrigins();
  if (allowedOrigins.length === 0) {
    logger.warn(
      'CORS_ORIGINS is empty — every browser origin is allowed. Set it to your frontend URL(s) in production.',
    );
  }

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // No Origin header: native app, curl, health probes.
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      const normalized = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalized)) return callback(null, true);
      // Wildcard entries such as https://*.vercel.app, which cover Vercel
      // preview deployments. Only one leading label is wildcarded.
      if (allowedOrigins.some((allowed) => matchesWildcard(normalized, allowed))) {
        return callback(null, true);
      }
      logger.warn(`Blocked CORS request from origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env['PORT'] ?? 3000);
  // 0.0.0.0 is required for the platform to route traffic into the container.
  await app.listen(port, '0.0.0.0');
  logger.log(`Trial Room API listening on port ${port}`);
  logger.log(
    allowedOrigins.length > 0
      ? `Allowed browser origins: ${allowedOrigins.join(', ')}`
      : 'Allowed browser origins: all',
  );
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
