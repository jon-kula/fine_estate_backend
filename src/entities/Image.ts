import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { ImageVariant } from './ImageVariant';

export enum ImageStatus {
  PROCESSING = 'processing',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  FAILED = 'failed'
}

export enum ImageCategory {
  AUCTION = 'auction',
  PROPERTY = 'property',
  ARTWORK = 'artwork',
  FURNITURE = 'furniture',
  JEWELRY = 'jewelry',
  COLLECTIBLES = 'collectibles',
  GENERAL = 'general'
}

@Entity('images')
export class Image {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  originalFilename: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ImageCategory, default: ImageCategory.GENERAL })
  category: ImageCategory;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    size?: number;
    colorSpace?: string;
  };

  @Column()
  originalUrl: string;

  @Column({ type: 'enum', enum: ImageStatus, default: ImageStatus.PROCESSING })
  status: ImageStatus;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'varchar', nullable: true })
  pageLocation: string;  // e.g., "home-hero", "auction-gallery", etc.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.images)
  uploadedBy: User;

  @OneToMany(() => ImageVariant, variant => variant.originalImage)
  variants: ImageVariant[];
}