import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Trash2, RefreshCcw, AlertTriangle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const Trash: React.FC = () => {
  const trashedPhotos = useLiveQuery(() => db.photos.where('status').equals('trash').toArray()) || [];

  const totalSize = trashedPhotos.reduce((acc, p) => acc + p.size, 0);
  const sizeFormatted = (totalSize / (1024 * 1024)).toFixed(1) + ' MB';

  const handleRestoreAll = async () => {
    await db.photos.where('status').equals('trash').modify({ status: 'analyzed' });
  };

  const handleDeletePermanently = async () => {
    if (!confirm(`Tem certeza que deseja apagar ${trashedPhotos.length} fotos permanentemente? Esta ação não pode ser desfeita.`)) {
      return;
    }
    await db.photos.where('status').equals('trash').delete();
  };

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Lixeira</h2>
        {trashedPhotos.length > 0 && (
          <button 
            onClick={handleRestoreAll}
            className="text-primary text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-full"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Restaurar
          </button>
        )}
      </div>

      {trashedPhotos.length > 0 ? (
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-red-500 shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-red-900 text-sm">{trashedPhotos.length} fotos prontas para apagar</h4>
              <p className="text-xs text-red-600 mt-1">Você irá liberar cerca de <span className="font-bold">{sizeFormatted}</span>.</p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-3 bg-amber-50 border border-amber-100 p-4 rounded-2xl">
             <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
             <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
               Revise tudo antes de excluir definitivamente. Uma vez apagadas, as fotos não podem ser recuperadas pelo app.
             </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-2 opacity-80">
            {trashedPhotos.map((photo) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                <img src={photo.previewUrl} className="w-full h-full object-cover grayscale-[50%]" />
              </div>
            ))}
          </div>

          <button 
            onClick={handleDeletePermanently}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Apagar Tudo Permanentemente
          </button>
        </div>
      ) : (
        <div className="py-32 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
            <Trash2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold">Lixeira Vazia</p>
            <p className="text-slate-400 text-xs px-12">As fotos que você selecionar para apagar aparecerão aqui para revisão.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trash;
