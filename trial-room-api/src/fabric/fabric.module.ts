import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FabricController } from './fabric.controller';
import { FabricService } from './fabric.service';
import { Fabric } from '../entities/fabric.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fabric, User])],
  controllers: [FabricController],
  providers: [FabricService],
})
export class FabricModule {}
