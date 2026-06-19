/**
 * Upload real product images for "Licores" category to Cloudinary.
 * Uses free images from Unsplash (no API key needed for source URLs).
 *
 * Usage: npx ts-node -r tsconfig-paths/register scripts/upload-licores-images.ts
 */
import { v2 as cloudinary } from 'cloudinary';
import * as https from 'https';
import * as http from 'http';

cloudinary.config({
  cloud_name: 'dtwvwzbxn',
  api_key: '987585992168871',
  api_secret: 'GdTowY-G4ysjPMMdxixMnAY4F-o',
});

// Free images from Unsplash/other sources (CC0 or free license)
// These are real product-relevant photos
const liquorImages: Record<string, string> = {
  'Aguardiente Antioqueño 375ml':
    'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&h=600&fit=crop&auto=format',
  'Aguardiente Blanco de Valle 750ml':
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=600&fit=crop&auto=format',
  'Ron Medellín Añejo 8 años 750ml':
    'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=600&h=600&fit=crop&auto=format',
  'Ron Medellín Dorado 375ml':
    'https://images.pexels.com/photos/5946620/pexels-photo-5946620.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
  'Cristal Aguardiente 375ml':
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=600&fit=crop&auto=format',
  'Absolut Vodka 750ml':
    'https://images.unsplash.com/photo-1614313511387-1436a4480ebb?w=600&h=600&fit=crop&auto=format',
  'Johnnie Walker Red Label 750ml':
    'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=600&h=600&fit=crop&auto=format',
  'Bacardí Carta Blanca 750ml':
    'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&h=600&fit=crop&auto=format',
  'Smirnoff Vodka No. 21 750ml':
    'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=600&fit=crop&auto=format',
  'Old Parr 12 años 750ml':
    'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&h=600&fit=crop&auto=format',
};

function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return downloadImage(res.headers.location!).then(resolve, reject);
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function uploadToCloudinary(
  buffer: Buffer,
  productName: string,
): Promise<string> {
  const publicId = `tusuper_products/${productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder: 'tusuper_products',
        format: 'webp',
        quality: 'auto',
        width: 600,
        height: 600,
        crop: 'fill',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      },
    );
    stream.end(buffer);
  });
}

async function main() {
  console.log(' liquor images to Cloudinary...\n');

  const results: Record<string, string> = {};

  for (const [productName, imageUrl] of Object.entries(liquorImages)) {
    try {
      console.log(`Downloading: ${productName}...`);
      const buffer = await downloadImage(imageUrl);
      console.log(`  Downloaded (${(buffer.length / 1024).toFixed(1)} KB)`);

      console.log(`  Uploading to Cloudinary...`);
      const cloudinaryUrl = await uploadToCloudinary(buffer, productName);
      console.log(`  Uploaded: ${cloudinaryUrl}\n`);

      results[productName] = cloudinaryUrl;
    } catch (err) {
      console.error(`  FAILED: ${productName} - ${err}\n`);
    }
  }

  console.log('\n--- Results ---');
  console.log(JSON.stringify(results, null, 2));

  // Output the SQL to update the database
  console.log('\n--- SQL Update Statements ---');
  for (const [name, url] of Object.entries(results)) {
    console.log(
      `UPDATE product SET "imageUrl" = '${url}' WHERE name = '${name}';`,
    );
  }
}

main().catch(console.error);
