import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Image } from './Image';

export enum VariantType {
  THUMBNAIL = 'thumbnail',    // 150x150
  SMALL = 'small',           // 320x240
  MEDIUM = 'medium',         // 640x480
  LARGE = 'large',          // 1024x768
  FULL = 'full',           // 1920x1440
  WEBP = 'webp',           // WebP format variant
  ORIGINAL = 'original'    // Original uploaded image
}

@Entity('image_variants')
export class ImageVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: VariantType })
  type: VariantType;

  @Column()
  url: string;

  @Column()
  width: number;

  @Column()
  height: number;

  @Column()
  size: number;

  @Column()
  format: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Image, image => image.variants, { onDelete: 'CASCADE' })
  originalImage: Image;
}