import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus, Search, Sparkles, FolderPlus, ShieldCheck, Zap, AlertCircle, DownloadCloud } from 'lucide-react';
import { db } from '../db/database';
import { analyzeImage, loadModel } from '../services/ai';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const Home: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState<{file: string, progress: number, status: string} | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsAnalyzing(true);
    setTotalFiles(acceptedFiles.length);
    setProgress(0);
    
    // Ensure Model is loaded first
    setIsModelLoading(true);
    try {
      await loadModel((prog) => {
        if (prog.status === 'progress' || prog.status === 'downloading') {
          setModelProgress(prog);
        }
      });
    } catch (err) {
      console.error("Failed to load AI model", err);
      // fallback handling...
    }
    setIsModelLoading(false);

    let processed = 0;
    for (const file of acceptedFiles) {
      try {
        const metadata = await analyzeImage(file);
        const previewUrl = URL.createObjectURL(file);
        
        await db.photos.add({
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          blob: file, 
          previewUrl,
          metadata,
          status: 'analyzed',
          collectionIds: ['all'],
          addedAt: Date.now()
        });
      } catch(err) {
         console.warn(`Failed to analyze ${file.name}`, err);
      }

      processed++;
      setProgress(Math.round((processed / acceptedFiles.length) * 100));
    }

    setIsAnalyzing(false);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#8b5cf6', '#10b981']
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic']
    }
  });

  return (
    <div className="px-6 py-6 space-y-8 animate-fade-in">
      {/* Hero Section */}
      <section className="space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Organize sua vida <br/> 
          <span className="text-primary italic">visual com IA.</span>
        </h2>
        <p className="text-slate-500 text-sm max-w-[280px]">
          Encontre, agrupe e limpe suas fotos por tema, pessoa ou tipo de arquivo.
        </p>
      </section>

      {/* Main Actions */}
      <div className="grid grid-cols-1 gap-4">
        <div 
          {...getRootProps()} 
          className={`
            relative overflow-hidden group cursor-pointer h-48 rounded-3xl border-2 border-dashed transition-all duration-300
            ${isDragActive ? 'border-primary bg-primary/5 scale-95' : 'border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50'}
            flex flex-col items-center justify-center gap-4
          `}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
            <Plus className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800">Começar Análise</p>
            <p className="text-xs text-slate-400">Importe fotos da sua galeria</p>
          </div>

          <div className="absolute bottom-3 flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
             <ShieldCheck className="w-3 h-3 text-emerald-500" />
             <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-tighter">100% Privado & Local</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="card-premium h-36 flex flex-col items-start justify-between">
            <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Cores</p>
              <p className="text-[10px] text-slate-400">Criar Nova Coleção</p>
            </div>
          </button>
          
          <button className="card-premium h-36 flex flex-col items-start justify-between">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Smart Search</p>
              <p className="text-[10px] text-slate-400">Busca por Descrição</p>
            </div>
          </button>
        </div>
      </div>

      {/* Analysis Modal Overlay */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center px-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl space-y-6 text-center"
            >
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" stroke="#f1f5f9" strokeWidth="8" 
                  />
                  <motion.circle 
                    cx="50" cy="50" r="45" 
                    fill="none" stroke="currentColor" strokeWidth="8"
                    strokeDasharray="283"
                    className="text-primary"
                    animate={{ strokeDashoffset: 283 - (283 * (isModelLoading ? (modelProgress?.progress || 0) : progress)) / 100 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isModelLoading ? (
                    <DownloadCloud className="w-8 h-8 text-primary animate-bounce" />
                  ) : (
                    <Zap className="w-8 h-8 text-primary animate-pulse" />
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800">
                  {isModelLoading ? "Baixando Motor de IA" : "Analisando Imagens"}
                </h3>
                <p className="text-sm text-slate-500">
                  {isModelLoading ? (
                    <span>
                      Primeiro acesso. Baixando modelo localmente (~200MB)... <br/>
                      Isso é feito apenas uma vez.
                    </span>
                  ) : (
                    <span>A IA está organizando {totalFiles} arquivos...</span>
                  )}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center gap-1">
                <div className="flex items-center gap-3 w-full justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">
                    {isModelLoading ? (
                      modelProgress?.file ? `Baixando ${modelProgress.file} (${Math.round(modelProgress.progress || 0)}%)` : "Iniciando..."
                    ) : (
                      `Processando ${progress}%...`
                    )}
                  </span>
                </div>
                {isModelLoading && (
                  <p className="text-[10px] text-slate-400 mt-2">Recomendamos usar Wi-Fi 🌐</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Tips */}
      <section className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-6 border border-blue-100 flex gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-500 shrink-0">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Escaneie por repetidas</h4>
          <p className="text-xs text-slate-500 mt-1">Liberte espaço no seu celular rapidamente apagando prints e fotos duplicadas.</p>
        </div>
      </section>
    </div>
  );
};

export default Home;
