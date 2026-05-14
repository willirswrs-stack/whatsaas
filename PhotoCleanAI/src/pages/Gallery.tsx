import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { PhotoEntry } from '../db/database';
import { LayoutGrid, List, Filter, ChevronRight, CheckCircle2, Trash2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

const Gallery: React.FC = () => {
  const photos = useLiveQuery(() => db.photos.where('status').equals('analyzed').toArray()) || [];
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'groups'>('all');

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleMoveToTrash = async () => {
    if (selectedIds.length === 0) return;
    await db.photos.where('id').anyOf(selectedIds).modify({ status: 'trash' });
    setSelectedIds([]);
  };

  // Group photos by category
  const groups = photos.reduce((acc, photo) => {
    const category = photo.metadata?.mainCategory || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(photo);
    return acc;
  }, {} as Record<string, PhotoEntry[]>);

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Sua Galeria</h2>
        <div className="flex p-1 bg-slate-200/50 rounded-xl">
          <button 
            onClick={() => setActiveTab('all')}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'all' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
            )}
          >
            Todas
          </button>
          <button 
            onClick={() => setActiveTab('groups')}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'groups' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
            )}
          >
            Grupos
          </button>
        </div>
      </div>

      {activeTab === 'all' ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <motion.div 
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggleSelect(photo.id!)}
              className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group"
            >
              <img 
                src={photo.previewUrl} 
                alt={photo.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className={clsx(
                "absolute inset-0 transition-opacity flex items-center justify-center bg-black/20",
                selectedIds.includes(photo.id!) ? "opacity-100" : "opacity-0"
              )}>
                <CheckCircle2 className="text-white w-8 h-8 drop-shadow-lg" />
              </div>
              {photo.metadata?.quality === 'bad' && (
                <div className="absolute bottom-1 right-1 bg-red-500/80 p-0.5 rounded-md">
                   <Trash2 className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.div>
          ))}
          {photos.length === 0 && (
            <div className="col-span-3 py-16 text-center text-slate-500 space-y-4 px-4">
              <div className="w-16 h-16 bg-slate-200/50 rounded-full flex items-center justify-center mx-auto">
                <ImageIcon className="w-8 h-8 text-slate-400" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-700">Nenhuma foto encontrada</p>
                <p className="text-xs text-slate-400">Suas fotos do celular não aparecem aqui automaticamente por segurança (privacidade do iPhone/Android).</p>
              </div>
              <button 
                onClick={() => window.location.href = '/'}
                className="mt-4 px-6 py-3 bg-primary text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary/30 w-full"
              >
                Selecionar e Importar Fotos
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([name, items]) => (
            <div key={name} className="card-premium space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <span className="capitalize font-bold text-slate-800">{name}</span>
                   <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px] text-slate-500 font-bold">{items.length}</span>
                </div>
                <button className="text-primary text-xs font-bold flex items-center gap-1">
                  Ver Todos <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {items.slice(0, 5).map((item) => (
                   <div key={item.id} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                     <img src={item.previewUrl} className="w-full h-full object-cover" />
                   </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Bar for Selected */}
      {selectedIds.length > 0 && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-24 left-6 right-6 h-16 bg-slate-900 rounded-3xl flex items-center justify-between px-6 shadow-2xl z-[55]"
        >
          <span className="text-white text-sm font-bold">{selectedIds.length} selecionadas</span>
          <div className="flex gap-4">
            <button className="text-white/60 hover:text-white transition-colors">
              <Heart className="w-5 h-5" />
            </button>
            <button 
              onClick={handleMoveToTrash}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default Gallery;
