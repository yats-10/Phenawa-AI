import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    // Use local file storage instead of R2 for development
    this.uploadDir = join(process.cwd(), 'uploads');
    this.ensureUploadDirExists();
  }

  private async ensureUploadDirExists(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create upload directory', error);
    }
  }

  async uploadImage(base64: string, folder: string): Promise<string> {
    try {
      // Strip data URI prefix if present
      const cleanBase64 = base64.includes(',') ? base64.split(',')[1]! : base64;

      const buffer = Buffer.from(cleanBase64, 'base64');
      const filename = `${uuidv4()}-${Date.now()}.jpg`;
      const folderPath = join(this.uploadDir, folder);
      const filePath = join(folderPath, filename);

      // Ensure folder exists
      await fs.mkdir(folderPath, { recursive: true });

      // Write file
      await fs.writeFile(filePath, buffer);

      // Return local URL
      return `http://localhost:3000/uploads/${folder}/${filename}`;
    } catch (error) {
      this.logger.error('Local upload failed', error);
      throw new InternalServerErrorException('Upload failed. Please try again.');
    }
  }

  async deleteImage(url: string): Promise<void> {
    try {
      // Extract filename from local URL
      const urlParts = url.split('/uploads/');
      if (urlParts.length < 2) return;

      const filePath = join(this.uploadDir, urlParts[1]!);
      await fs.unlink(filePath);
    } catch (error) {
      // Log but do not throw — deletion failure should not block the caller
      this.logger.error(`Local delete failed for url: ${url}`, error);
    }
  }
}
