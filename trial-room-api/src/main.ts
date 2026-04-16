import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Increase body size limit to 50MB to support base64-encoded images
  const express = await import('express');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve uploaded images statically
  app.use('/uploads', express.static('uploads'));

  // Enable CORS for Ionic/Angular frontend
  app.enableCors({
    origin: true, // Restrict this to your Vercel domain in production
    credentials: true,
  });

  // Global validation pipe — validates all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip unknown properties
      forbidNonWhitelisted: true, // Error on unknown properties
      transform: true,           // Auto-transform payloads to DTO instances
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  console.log(`Trial Room API running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
