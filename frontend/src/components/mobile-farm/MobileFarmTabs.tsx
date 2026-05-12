'use client';

import { useState } from 'react';
import { MobileFarmView } from '@/components/mobile-farm/MobileFarmView';
import { RealTimeChatView } from '@/components/mobile-farm/RealTimeChatView';

export function MobileFarmTabs() {
  const [activeTab, setActiveTab] = useState<'farm' | 'chat'>('farm');

  return (
    <>
      {/* Tab selector */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab('farm')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
            activeTab === 'farm'
              ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
          }`}
        >
          📱 Dispositivos USB
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
            activeTab === 'chat'
              ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
          }`}
        >
          💬 Chat Real-Time
          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold">
            NOVO
          </span>
        </button>
      </div>

      {activeTab === 'farm' ? (
        <MobileFarmView />
      ) : (
        <div className="h-[680px]">
          <RealTimeChatView />
        </div>
      )}
    </>
  );
}
