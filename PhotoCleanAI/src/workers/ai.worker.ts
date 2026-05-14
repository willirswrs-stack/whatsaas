import { pipeline, env } from '@xenova/transformers';

// Desabilita modelos locais (para carregar apenas via Web e fazer cache no indexedDB)
env.allowLocalModels = false;
env.useBrowserCache = true;

class PipelineSingleton {
  static task = 'zero-shot-image-classification';
  static model = 'Xenova/clip-vit-base-patch32';
  static instance: any = null;

  static async getInstance(progress_callback?: Function) {
    if (this.instance === null) {
      try {
        this.instance = await pipeline(this.task as any, this.model, { 
          progress_callback 
        });
      } catch (e) {
        console.error('Error loading model', e);
        throw e;
      }
    }
    return this.instance;
  }
}

// Mapeamento de categorias em Inglês para otimizar a rede CLIP, traduzido para o app.
const LABEL_MAP: Record<string, any> = {
  'clothing and fashion': { category: 'roupas', tags: ['moda', 'vestuário', 'catálogo'] },
  'paper document': { category: 'documento', tags: ['papel', 'texto'] },
  'screenshot of a chat or app': { category: 'print', tags: ['tela', 'conversa', 'webapp'] },
  'receipt or invoice': { category: 'comprovante', tags: ['pagamento', 'nota', 'pix'] },
  'product photo': { category: 'produto', tags: ['venda', 'loja'] },
  'landscape and nature': { category: 'paisagem', tags: ['natureza', 'externo'] },
  'food': { category: 'comida', tags: ['refeição', 'restaurante'] },
  'selfie of a person': { category: 'pessoa', tags: ['rosto', 'retrato'] },
  'dog or cat': { category: 'animal', tags: ['pet'] },
  'blurry photo': { category: 'ruins', tags: ['desfocada', 'baixa qualidade'] },
  'dark photo': { category: 'ruins', tags: ['escura'] }
};

const LABELS = Object.keys(LABEL_MAP);

self.addEventListener('message', async (event) => {
  const { type, payload, id } = event.data;

  if (type === 'load') {
    try {
      await PipelineSingleton.getInstance((progress: any) => {
        // Envia o progresso de volta para exibir na tela (o arquivo e % carregada)
        self.postMessage({ type: 'progress', payload: progress, id });
      });
      self.postMessage({ type: 'loaded', id });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message, id });
    }
  }

  if (type === 'analyze') {
    try {
      const { imageUrl } = payload;
      
      const classifier = await PipelineSingleton.getInstance();
      
      // Processamento da IA (Realiza o Zero-Shot Classification)
      const results = await classifier(imageUrl, LABELS);
      // results retorna: [{label: '...', score: 0.99}, ...]
      
      const topLabel = results[0].label;
      const confidence = results[0].score;
      
      const mapped = LABEL_MAP[topLabel];
      
      let mainCategory = mapped.category;
      let tags = mapped.tags;
      
      // Heurísticas complementares
      const hasPerson = ['selfie of a person'].includes(topLabel) || results.some((r: any) => r.label === 'selfie of a person' && r.score > 0.15);
      const isScreenshot = ['screenshot of a chat or app'].includes(topLabel);
      const isDocument = ['paper document', 'receipt or invoice'].includes(topLabel);
      const quality = mainCategory === 'ruins' ? 'bad' : (confidence > 0.5 ? 'good' : 'medium');
      
      const metadata = {
        mainCategory: mainCategory === 'ruins' ? 'outros' : mainCategory, // Se for ruim, fica em "outros" e ganha a marcação de qualidade
        tags: [...tags, topLabel.split(' ')[0]], // add raw tag too
        quality,
        hasText: isScreenshot || isDocument,
        isScreenshot,
        hasPerson,
        suggestedAction: quality === 'bad' ? 'delete' : (isScreenshot ? 'organize' : 'keep'),
        faces: hasPerson ? 1 : 0,
        similarGroupId: undefined 
      };

      self.postMessage({ type: 'result', payload: metadata, id });
      
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message, id });
    }
  }
});
