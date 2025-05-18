import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { AppDataSource } from '../config/database';
import { Image, ImageStatus } from '../entities/Image';
import { ImageVariant, VariantType } from '../entities/ImageVariant';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface ImageUploadOptions {
  file: any;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  pageLocation?: string;
  userId: string;
}

export class SupabaseImageService {
  private supabase;
  private bucketName = 'fine-estate-images';

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Create bucket if it doesn't exist
    this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    const { data: buckets } = await this.supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === this.bucketName)) {
      await this.supabase.storage.createBucket(this.bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
    }
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
      const originalPath = `${image.id}/original/${options.file.originalname}`;
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(originalPath, options.file.buffer, {
          contentType: options.file.mimetype,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(originalPath);

      image.originalUrl = publicUrl;

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
        url: publicUrl,
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

        // Upload to Supabase
        const path = `${image.id}/${config.type}/image.jpg`;
        const { error } = await this.supabase.storage
          .from(this.bucketName)
          .upload(path, resized, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (error) throw error;

        const { data: { publicUrl } } = this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(path);

        // Create WebP variant
        const webp = await sharp(buffer)
          .resize(config.width, config.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer();

        const webpPath = `${image.id}/${config.type}/image.webp`;
        const { error: webpError } = await this.supabase.storage
          .from(this.bucketName)
          .upload(webpPath, webp, {
            contentType: 'image/webp',
            cacheControl: '3600',
          });

        if (webpError) throw webpError;

        const { data: { publicUrl: webpUrl } } = this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(webpPath);

        // Save variants
        const jpegVariant = variantRepository.create({
          type: config.type,
          url: publicUrl,
          width: config.width,
          height: config.height,
          size: resized.length,
          format: 'jpeg',
          originalImage: image,
        });

        const webpVariant = variantRepository.create({
          type: VariantType.WEBP,
          url: webpUrl,
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

  async deleteImage(imageId: string): Promise<void> {
    const imageRepository = AppDataSource.getRepository(Image);
    const image = await imageRepository.findOne({
      where: { id: imageId },
      relations: ['variants'],
    });

    if (!image) {
      throw new Error('Image not found');
    }

    // Delete from Supabase Storage
    const paths: string[] = [];
    
    // Extract paths from URLs
    for (const variant of image.variants) {
      const url = new URL(variant.url);
      const path = url.pathname.split(`/${this.bucketName}/`)[1];
      if (path) paths.push(path);
    }
    
    // Add original image path
    const originalUrl = new URL(image.originalUrl);
    const originalPath = originalUrl.pathname.split(`/${this.bucketName}/`)[1];
    if (originalPath) paths.push(originalPath);

    // Delete all files
    if (paths.length > 0) {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove(paths);
      
      if (error) throw error;
    }

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