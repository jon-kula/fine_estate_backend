import sharp from 'sharp';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AppDataSource } from '../config/database';
import { Image, ImageStatus } from '../entities/Image';
import { ImageVariant, VariantType } from '../entities/ImageVariant';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface ImageUploadOptions {
  file: Express.Multer.File;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  pageLocation?: string;
  userId: string;
}

export class ImageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-west-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET || 'fine-estate-images';
  }

  async uploadImage(options: ImageUploadOptions): Promise<Image> {
    const imageRepository = AppDataSource.getRepository(Image);
    const variantRepository = AppDataSource.getRepository(ImageVariant);

    // Create image record
    const image = imageRepository.create({
      originalFilename: options.file.originalname,
      title: options.title,
      description: options.description,
      category: options.category as any,
      tags: options.tags,
      pageLocation: options.pageLocation,
      status: ImageStatus.PROCESSING,
      uploadedBy: { id: options.userId } as any,
    });

    await imageRepository.save(image);

    try {
      // Upload original image
      const originalKey = `${image.id}/original/${options.file.originalname}`;
      await this.uploadToS3(options.file.buffer, originalKey, options.file.mimetype);
      
      const originalUrl = `https://${this.bucketName}.s3.amazonaws.com/${originalKey}`;
      image.originalUrl = originalUrl;

      // Get image metadata
      const metadata = await sharp(options.file.buffer).metadata();
      image.metadata = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: options.file.size,
        colorSpace: metadata.space,
      };

      // Create original variant
      const originalVariant = variantRepository.create({
        type: VariantType.ORIGINAL,
        url: originalUrl,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: options.file.size,
        format: metadata.format || '',
        originalImage: image,
      });

      await variantRepository.save(originalVariant);

      // Generate optimized variants
      const variants = await this.generateVariants(options.file.buffer, image);
      await variantRepository.save(variants);

      // Update image status
      image.status = ImageStatus.ACTIVE;
      await imageRepository.save(image);

      return image;
    } catch (error) {
      // Update status on failure
      image.status = ImageStatus.FAILED;
      await imageRepository.save(image);
      throw error;
    }
  }

  private async generateVariants(buffer: Buffer, image: Image): Promise<ImageVariant[]> {
    const variantRepository = AppDataSource.getRepository(ImageVariant);
    const variants: ImageVariant[] = [];

    const variantConfigs = [
      { type: VariantType.THUMBNAIL, width: 150, height: 150 },
      { type: VariantType.SMALL, width: 320, height: 240 },
      { type: VariantType.MEDIUM, width: 640, height: 480 },
      { type: VariantType.LARGE, width: 1024, height: 768 },
      { type: VariantType.FULL, width: 1920, height: 1440 },
    ];

    for (const config of variantConfigs) {
      try {
        // Resize image
        const resized = await sharp(buffer)
          .resize(config.width, config.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        // Upload to S3
        const key = `${image.id}/${config.type}/image.jpg`;
        await this.uploadToS3(resized, key, 'image/jpeg');

        // Create WebP variant
        const webp = await sharp(buffer)
          .resize(config.width, config.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer();

        const webpKey = `${image.id}/${config.type}/image.webp`;
        await this.uploadToS3(webp, webpKey, 'image/webp');

        // Save variants
        const jpegVariant = variantRepository.create({
          type: config.type,
          url: `https://${this.bucketName}.s3.amazonaws.com/${key}`,
          width: config.width,
          height: config.height,
          size: resized.length,
          format: 'jpeg',
          originalImage: image,
        });

        const webpVariant = variantRepository.create({
          type: VariantType.WEBP,
          url: `https://${this.bucketName}.s3.amazonaws.com/${webpKey}`,
          width: config.width,
          height: config.height,
          size: webp.length,
          format: 'webp',
          originalImage: image,
        });

        variants.push(jpegVariant, webpVariant);
      } catch (error) {
        console.error(`Error generating ${config.type} variant:`, error);
      }
    }

    return variants;
  }

  private async uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'max-age=31536000',
    });

    await this.s3Client.send(command);
  }

  async deleteImage(imageId: string): Promise<void> {
    const imageRepository = AppDataSource.getRepository(Image);
    const image = await imageRepository.findOne({
      where: { id: imageId },
      relations: ['variants'],
    });

    if (!image) {
      throw new Error('Image not found');
    }

    // Delete from S3
    for (const variant of image.variants) {
      const key = variant.url.split('.com/')[1];
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));
    }

    // Delete original
    const originalKey = image.originalUrl.split('.com/')[1];
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: originalKey,
    }));

    // Delete from database
    await imageRepository.remove(image);
  }

  async getImagesByLocation(pageLocation: string): Promise<Image[]> {
    const imageRepository = AppDataSource.getRepository(Image);
    return imageRepository.find({
      where: {
        pageLocation,
        status: ImageStatus.ACTIVE,
      },
      relations: ['variants'],
      order: {
        createdAt: 'DESC',
      },
    });
  }
}