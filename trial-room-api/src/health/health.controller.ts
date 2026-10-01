import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Liveness + database readiness. Used as the Railway healthcheck path, so it
   * stays unauthenticated and returns no account data.
   */
  @Get('health')
  async health(): Promise<{ status: string; database: string }> {
    let database = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      database = 'up';
    } catch {
      database = 'down';
    }
    return { status: 'ok', database };
  }
}
