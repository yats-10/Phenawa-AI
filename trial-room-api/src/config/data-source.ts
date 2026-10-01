import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Fabric } from '../entities/fabric.entity';
import { Generation } from '../entities/generation.entity';
import { Admin } from '../entities/admin.entity';
import { buildDatabaseSsl } from './ssl';

/**
 * Standalone DataSource used only by the TypeORM CLI (migration:generate,
 * migration:run, migration:revert). The running application builds its own
 * connection in AppModule.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'],
  entities: [User, Fabric, Generation, Admin],
  migrations: ['src/migrations/*.ts'],
  ssl: buildDatabaseSsl(process.env['DATABASE_URL'], process.env['DATABASE_SSL']),
  synchronize: false,
});
