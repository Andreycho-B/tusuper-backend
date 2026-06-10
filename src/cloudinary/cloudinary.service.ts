import { Injectable, BadRequestException } from '@nestjs/common';

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

import { Readable } from 'node:stream';

import toStream from 'buffer-to-stream';

@Injectable()
export class CloudinaryService {
  /**

   * Sube un archivo de imagen a Cloudinary en streaming.

   *

   * ANÁLISIS DE COMPLEJIDAD:

   * - Complejidad Temporal: O(B) donde B es el tamaño del buffer en bytes. La lectura del buffer y su posterior

   *   envío a través del socket de red escala linealmente con respecto al volumen de datos del archivo.

   * - Complejidad Espacial: O(1) auxiliar en Heap de Node.js. Al realizar la conversión a Readable Stream

   *   y entubarlo (.pipe) directamente al upload_stream del SDK de Cloudinary, evitamos

   *   cargar copias completas o temporales del buffer en memoria, manteniendo un consumo constante.

   */

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'tusuper_products',
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Defensa en profundidad: saneamiento y validación estricta de tipo MIME

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    // Aserción de tipo para evitar propagación de tipo implicito any en la librería de terceros

    const castedToStream = toStream as (buffer: Buffer) => Readable;

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
        },

        (error, result) => {
          if (error) {
            return reject(
              new Error(error.message || 'Cloudinary upload failed'),
            );
          }

          if (!result) {
            return reject(
              new Error('Cloudinary upload returned undefined result'),
            );
          }

          resolve(result);
        },
      );

      castedToStream(file.buffer).pipe(uploadStream);
    });
  }
}
