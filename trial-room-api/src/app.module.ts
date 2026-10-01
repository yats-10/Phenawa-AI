import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { TryonModule } from './tryon/tryon.module';
import { FabricModule } from './fabric/fabric.module';
import { HealthController } from './health/health.controller';
import { User } from './entities/user.entity';
import { Fabric } from './entities/fabric.entity';
import { Generation } from './entities/generation.entity';
import { Admin } from './entities/admin.entity';
import { InitialSchema1790888855452 } from './migrations/1790888855452-InitialSchema';
import { buildDatabaseSsl } from './config/ssl';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
        return {
          type: 'postgres' as const,
          url: databaseUrl,
          entities: [User, Fabric, Generation, Admin],
          // Schema is owned by migrations in every environment, so the same
          // SQL that was reviewed locally is what runs in production.
          synchronize: false,
          migrations: [InitialSchema1790888855452],
          migrationsRun: true,
          ssl: buildDatabaseSsl(
            databaseUrl,
            configService.get<string>('DATABASE_SSL'),
          ),
          logging: configService.get<string>('NODE_ENV') === 'development',
        };
      },
    }),
    AuthModule,
    AdminModule,
    TryonModule,
    FabricModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
