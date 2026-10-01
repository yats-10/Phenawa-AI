import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TryonController } from './tryon.controller';
import { TryonService } from './tryon.service';
import { ImageGenerationService } from './image-generation.service';
import { Fabric } from '../entities/fabric.entity';
import { Generation } from '../entities/generation.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fabric, Generation, User])],
  controllers: [TryonController],
  providers: [TryonService, ImageGenerationService],
})
export class TryonModule {}
