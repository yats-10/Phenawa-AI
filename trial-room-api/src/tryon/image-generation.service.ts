import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const GARMENT_DESCRIPTIONS: Record<string, string> = {
  'Kurta (Men)': 'Knee-length collarless tunic with side slits and full sleeves.',
  'Kurti (Women)': 'Hip-to-knee-length tunic with a straight or A-line cut.',
  Sherwani: 'Formal long coat with bandhgala collar and a front button placket.',
  'Salwar Kameez': 'Long kameez, loose salwar pants, and matching dupatta.',
  'Shirt (Men)': 'Fitted shirt with collar, button placket, and sleeves.',
  'Pant (Men)': 'Straight-cut trousers with waistband and pressed crease.',
  'Suit (Men)': 'Single-breasted blazer and matching trousers.',
  Blazer: 'Fitted single-breasted jacket with notch lapels.',
  Coat: 'Full-length formal overcoat with notch lapels.',
  'Sherwani + Pant': 'Bandhgala sherwani with matching straight trousers.',
  Lehenga: 'Flared floor-length skirt, fitted choli, and matching dupatta.',
  Anarkali: 'Floor-length flared dress with fitted bodice.',
  Pajama: 'Loose, straight-cut drawstring trousers.',
};

function buildPrompt(garmentType: string): string {
  const description = GARMENT_DESCRIPTIONS[garmentType] ?? garmentType;
  return `Create one photorealistic virtual try-on image. Image 1 is the person and must be the base photograph. Image 2 is an unstitched fabric swatch, not a garment photo. Dress the person in a ${garmentType} (${description}) made from the fabric in Image 2. Preserve the person's identity, face, skin tone, hair, body proportions, pose, background, camera angle, and lighting. Change only the clothing needed for this garment. Reproduce the fabric's color, pattern, scale, and texture as faithfully as possible, with realistic seams and drape. Do not add text, borders, or watermarks.`;
}

function imageFile(base64: string, label: string): { blob: Blob; name: string } {
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 20 * 1024 * 1024) {
    throw new BadRequestException(`${label} must be an image under 20 MB.`);
  }
  let type: string;
  let extension: string;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    type = 'image/jpeg';
    extension = 'jpg';
  } else if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    type = 'image/png';
    extension = 'png';
  } else if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    type = 'image/webp';
    extension = 'webp';
  } else {
    throw new BadRequestException(`${label} must be a JPEG, PNG, or WebP image.`);
  }
  return { blob: new Blob([bytes], { type }), name: `${label}.${extension}` };
}

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateTryon(
    personBase64: string,
    fabricBase64: string,
    garmentType: string,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is not configured');
      throw new ServiceUnavailableException('Image generation is not configured.');
    }

    const model = this.configService.get<string>(
      'OPENAI_IMAGE_MODEL',
      'gpt-image-2.5-sunburst',
    );
    const form = new FormData();
    form.set('model', model);
    form.set('prompt', buildPrompt(garmentType));
    form.set('quality', 'medium');
    form.set('size', '1024x1536');
    form.set('output_format', 'jpeg');
    form.set('n', '1');
    const person = imageFile(personBase64, 'person');
    const fabric = imageFile(fabricBase64, 'fabric');
    form.append('image[]', person.blob, person.name);
    form.append('image[]', fabric.blob, fabric.name);

    try {
      const response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) {
        this.logger.error(`OpenAI image edit failed: HTTP ${response.status}`);
        throw new ServiceUnavailableException(
          'AI is currently busy. Please try again in a moment.',
        );
      }

      const result = (await response.json()) as {
        data?: Array<{ b64_json?: string }>;
        usage?: unknown;
      };
      const imageBase64 = result.data?.[0]?.b64_json;
      if (!imageBase64) {
        this.logger.error('OpenAI image edit returned no image');
        throw new ServiceUnavailableException(
          'AI did not return an image. Please try again.',
        );
      }
      if (result.usage) {
        this.logger.log(`Image generation usage: ${JSON.stringify(result.usage)}`);
      }
      return imageBase64;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error('OpenAI image edit request failed', error);
      throw new ServiceUnavailableException(
        'AI is currently busy. Please try again in a moment.',
      );
    }
  }
}
