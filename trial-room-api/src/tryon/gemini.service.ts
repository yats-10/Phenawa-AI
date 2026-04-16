import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

const GARMENT_DESCRIPTIONS: Record<string, string> = {
  'Kurta (Men)': `Knee-length collarless Indian tunic. Straight cut with side slits.
Full sleeves with plain cuffs. Mandarin or round neck. Fabric falls
naturally from shoulders.`,

  'Kurti (Women)': `Hip to knee length Indian tunic. A-line or straight cut. Fabric flows
naturally. Slight flare at the bottom.`,

  Sherwani: `Formal ankle-to-knee length Indian coat. High bandhgala collar.
Button placket down center front. Fitted at chest, slight flare
below waist. Worn over churidar.`,

  'Salwar Kameez': `Long kameez tunic reaching mid-thigh to knee with loose salwar pants.
Dupatta in matching fabric draped over one shoulder.`,

  'Shirt (Men)': `Formal or casual shirt. Collar with button placket. Fitted to body.
Full or half sleeves as appropriate for the fabric weight.`,

  'Pant (Men)': `Formal straight-cut trousers. Flat front, waistband with belt loops.
Clean pressed crease down the front.`,

  'Suit (Men)': `Two-piece — single-breasted blazer with matching trousers.
Notch lapel collar, two buttons, pocket square.`,

  Blazer: `Single-breasted jacket. Notch lapel collar, two buttons.
Fitted at shoulders and chest.`,

  Coat: `Full-length formal overcoat. Notch lapel, single-breasted,
falls to the knee or below.`,

  'Sherwani + Pant': `Sherwani coat with matching straight-cut formal trousers.
Bandhgala collar, center button placket.`,

  Lehenga: `Flared floor-length skirt with fitted short choli blouse.
Heavy fabric with natural volume and drape.
Dupatta in matching fabric.`,

  Anarkali: `Floor-length flared dress. Fitted bodice, heavily flared
skirt from the waist down. Three-quarter or full sleeves.`,

  Pajama: `Loose straight-cut Indian drawstring trousers.
Slightly tapered at ankle. Paired look with kurta.`,
};

function buildPrompt(garmentType: string): string {
  const description =
    GARMENT_DESCRIPTIONS[garmentType] ??
    `A traditional Indian garment of type: ${garmentType}.`;

  return `TASK:
You are a professional fashion visualization AI.
I am giving you two images:
- IMAGE 1: A real photograph of a person (the subject)
- IMAGE 2: A photograph of unstitched fabric or cloth material

YOUR JOB:
Generate one photorealistic image of the person from IMAGE 1 wearing 
a ${garmentType} stitched from the exact fabric shown in IMAGE 2.

IDENTITY RULES (highest priority — never violate):
- Preserve the person's face exactly — no changes to facial features,
  skin tone, hair, or expression whatsoever
- Preserve body shape, proportions, and pose exactly as in IMAGE 1
- Only the clothing changes. Everything else stays identical.

FABRIC RULES:
- Use the exact color, pattern, weave, and texture from IMAGE 2
- If IMAGE 2 shows checks, stripes, florals, prints or embroidery —
  those must appear accurately on the stitched garment
- Do not approximate, simplify, or substitute the fabric in any way

GARMENT CONSTRUCTION — ${garmentType}:
${description}

PHOTOGRAPHY RULES:
- Final output must look like a real photograph, not an illustration
- Match the lighting, background, and camera angle from IMAGE 1
- Sharp, high resolution, photorealistic output only

DO NOT: change the face, alter skin tone, modify body proportions,
use a different fabric, make it look like a drawing or cartoon,
add any text, watermarks, or borders.

Before generating, verify mentally:
1. Is the face identical to IMAGE 1?
2. Is the fabric pattern from IMAGE 2 visible on the garment?
3. Does the garment shape match ${garmentType}?
4. Does it look like a real photograph?

OUTPUT: Return the image only.`;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('GEMINI_API_KEY');
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateTryon(
    personBase64: string,
    fabricBase64: string,
    garmentType: string,
  ): Promise<string> {
    const prompt = buildPrompt(garmentType);

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: personBase64 } },
              { inlineData: { mimeType: 'image/jpeg', data: fabricBase64 } },
              { text: prompt },
            ],
          },
        ],
        config: {
          temperature: 0.2,
          responseModalities: ['IMAGE', 'TEXT'],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p) => p.inlineData?.data);

      if (!imagePart?.inlineData?.data) {
        this.logger.error(
          'Gemini response had no image part',
          JSON.stringify(response),
        );
        throw new ServiceUnavailableException(
          'AI is currently busy. Please try again in a moment.',
        );
      }

      return imagePart.inlineData.data;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error('Gemini API call failed', error);
      throw new ServiceUnavailableException(
        'AI is currently busy. Please try again in a moment.',
      );
    }
  }
}
