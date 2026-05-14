import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { searchPhotos } from '../services/ai';
import { Search as SearchIcon, X, SlidersHorizontal, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const allPhotos = useLiveQuery(() => db.photos.where('status').equals('analyzed').toArray()) || [];
  
  const results = query.trim().length > 0 ? searchPhotos(allPhotos, query) : [];

  const quickFilters = [
    { label: 'Roupas', q: 'roupas' },
    { label: 'Prints', q: 'prints' },
    { label: 'Documentos', q: 'documento' },
    { label: 'Má Qualidade', q: 'ruins' },
    { label: 'Repetidas', q: 'repetidas' },
    { label: 'Comprovantes', q: 'comprovante' }
  ];

  return (
    <div className="px-6 py-6 space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">O que você procura?</h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
            <SearchIcon className="w-5 h-5" />
          </div>
          <input 
            type="text"
            placeholder="Ex: 'Fotos de roupas' ou 'Prints'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-slate-400 shadow-sm"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      {!query && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sugestões de Busca IA</p>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((f) => (
              <button 
                key={f.q}
                onClick={() => setQuery(f.q)}
                className="px-4 py-2 bg-white border border-slate-100 rounded-full text-sm font-semibold text-slate-600 hover:border-primary/30 hover:text-primary transition-all flex items-center gap-2 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        {query && (
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500">{results.length} resultados para "{query}"</p>
            <button className="text-slate-400"><SlidersHorizontal className="w-4 h-4" /></button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence mode="popLayout">
            {results.map((photo, i) => (
              <motion.div 
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="relative aspect-square rounded-2xl overflow-hidden"
              >
                <img src={photo.previewUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                   <p className="text-[8px] text-white font-medium truncate">{photo.metadata?.mainCategory}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {query && results.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <SearchIcon className="w-8 h-8" />
            </div>
            <p className="text-slate-400 text-sm">Não encontramos nada com essa descrição.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
