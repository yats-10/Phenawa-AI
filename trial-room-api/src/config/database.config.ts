import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Fabric } from '../entities/fabric.entity';
import { Generation } from '../entities/generation.entity';
import { Admin } from '../entities/admin.entity';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    url: process.env['DATABASE_URL'],
    entities: [User, Fabric, Generation, Admin],
    synchronize: process.env['NODE_ENV'] !== 'production',
    ssl:
      process.env['NODE_ENV'] === 'production'
        ? { rejectUnauthorized: false }
        : false,
    logging: process.env['NODE_ENV'] === 'development',
  }),
);
