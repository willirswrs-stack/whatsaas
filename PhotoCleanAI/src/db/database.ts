import Dexie, { type Table } from 'dexie';

export interface PhotoEntry {
  id?: number;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  blob: Blob;
  previewUrl: string;
  metadata?: PhotoMetadata;
  status: 'imported' | 'analyzing' | 'analyzed' | 'trash' | 'important';
  collectionIds: string[];
  addedAt: number;
}

export interface PhotoMetadata {
  mainCategory: string;
  tags: string[];
  quality: 'good' | 'medium' | 'bad';
  hasText: boolean;
  isScreenshot: boolean;
  hasPerson: boolean;
  similarGroupId?: string;
  suggestedAction: 'keep' | 'organize' | 'delete';
  faces?: number;
  ocrText?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  isSystem?: boolean;
}

export class PhotoCleanDB extends Dexie {
  photos!: Table<PhotoEntry>;
  collections!: Table<Collection>;

  constructor() {
    super('PhotoCleanDB');
    this.version(1).stores({
      photos: '++id, status, *collectionIds, mainCategory, similarGroupId',
      collections: 'id, name'
    });
  }
}

export const db = new PhotoCleanDB();

// Initialize default collections
db.on('ready', async () => {
  const count = await db.collections.count();
  if (count === 0) {
    await db.collections.bulkAdd([
      { id: 'all', name: 'Todas as fotos', isSystem: true, createdAt: Date.now() },
      { id: 'recent', name: 'Recentes', isSystem: true, createdAt: Date.now() },
      { id: 'important', name: 'Importantes', isSystem: true, createdAt: Date.now() },
      { id: 'to_delete', name: 'Lixeira', isSystem: true, createdAt: Date.now() }
    ]);
  }
});
