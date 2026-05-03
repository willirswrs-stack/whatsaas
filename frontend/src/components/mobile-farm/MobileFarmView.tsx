'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function MobileFarmView() {
  const [devices, setDevices] = useState([
    { id: 'device_1', model: 'Samsung S21', battery: 85, status: 'online', chip: '5511999998888', stage: 'Warmup Mobile' },
    { id: 'device_2', model: 'Motorola G8', battery: 42, status: 'online', chip: '5511988887777', stage: 'Registro' },
    { id: 'device_3', model: 'Xiaomi Redmi', battery: 98, status: 'online', chip: '5511977776666', stage: 'Pronto para Web' },
    { id: 'device_4', model: 'Samsung A10', battery: 12, status: 'warning', chip: '5511966665555', stage: 'Carga Baixa' },
  ]);

  return (
    <div className="p-6 bg-[#1a1f2c] rounded-2xl border border-[#2d3241] shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          📱 Fazenda de Celulares (USB)
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30">
            ADB Ativo
          </span>
        </h2>
        <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          Atualizar Dispositivos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {devices.map((device) => (
          <motion.div 
            key={device.id}
            whileHover={{ y: -5 }}
            className="p-4 bg-[#232936] rounded-xl border border-[#343b4d] relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-[#1e2330] rounded-lg flex items-center justify-center text-2xl">
                📱
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                  device.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {device.status}
                </span>
                <p className="text-[10px] text-gray-500 mt-1">{device.id}</p>
              </div>
            </div>

            <h3 className="font-bold text-white text-sm mb-1">{device.model}</h3>
            <p className="text-xs text-indigo-400 font-mono mb-3">{device.chip}</p>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-gray-400">Bateria</span>
                <span className={device.battery < 20 ? 'text-red-400 animate-pulse' : 'text-gray-300'}>
                  {device.battery}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#1e2330] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    device.battery < 20 ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${device.battery}%` }}
                />
              </div>

              <div className="pt-2 border-t border-[#343b4d]">
                <span className="text-[10px] text-gray-500 block mb-1 uppercase tracking-wider">Estágio Atual</span>
                <span className="text-xs font-medium text-white bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 block text-center">
                  {device.stage}
                </span>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="mt-4 flex gap-2">
              <button className="flex-1 text-[10px] bg-white/5 hover:bg-white/10 text-gray-300 py-1.5 rounded transition-colors">
                Abrir WA
              </button>
              <button className="flex-1 text-[10px] bg-white/5 hover:bg-white/10 text-gray-300 py-1.5 rounded transition-colors">
                Screenshot
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
