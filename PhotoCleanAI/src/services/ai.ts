import type { PhotoMetadata } from '../db/database';

let aiWorker: Worker | null = null;
let messageIdCounter = 0;

const getWorker = () => {
  if (!aiWorker) {
    aiWorker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), { type: 'module' });
  }
  return aiWorker;
};

export const loadModel = (onProgress?: (progress: any) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    const worker = getWorker();
    const id = messageIdCounter++;
    
    const handler = (event: MessageEvent) => {
      if (event.data.id === id) {
        if (event.data.type === 'loaded') {
          worker.removeEventListener('message', handler);
          resolve();
        } else if (event.data.type === 'error') {
          worker.removeEventListener('message', handler);
          reject(new Error(event.data.error));
        } else if (event.data.type === 'progress' && onProgress) {
          onProgress(event.data.payload);
        }
      }
    };
    
    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'load', id });
  });
};

export const analyzeImage = async (file: File): Promise<PhotoMetadata> => {
  return new Promise((resolve, reject) => {
    const worker = getWorker();
    const id = messageIdCounter++;
    const imageUrl = URL.createObjectURL(file);
    
    const handler = (event: MessageEvent) => {
      if (event.data.id === id) {
        if (event.data.type === 'result') {
          worker.removeEventListener('message', handler);
          URL.revokeObjectURL(imageUrl);
          resolve(event.data.payload as PhotoMetadata);
        } else if (event.data.type === 'error') {
          worker.removeEventListener('message', handler);
          URL.revokeObjectURL(imageUrl);
          reject(new Error(event.data.error));
        }
      }
    };
    
    worker.addEventListener('message', handler);
    worker.postMessage({ 
      type: 'analyze', 
      payload: { imageUrl },
      id 
    });
  });
};

export const searchPhotos = (photos: any[], query: string) => {
  const q = query.toLowerCase();
  return photos.filter(p => {
    const meta = p.metadata;
    if (!meta) return false;
    
    return (
      meta.mainCategory.includes(q) ||
      meta.tags.some((t: string) => t.includes(q)) ||
      (q === 'repetidas' && meta.similarGroupId) ||
      (q === 'ruins' && meta.quality === 'bad') ||
      (q === 'prints' && meta.isScreenshot)
    );
  });
};
