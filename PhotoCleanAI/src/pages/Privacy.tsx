import React from 'react';
import { Shield, Lock, EyeOff, UserCheck, Trash2 } from 'lucide-react';
import { db } from '../db/database';

const Privacy: React.FC = () => {
  const clearAllData = async () => {
    if (confirm('Isso apagará todas as fotos e análises locais. As fotos originais no seu celular NÃO serão apagadas. Continuar?')) {
      await db.photos.clear();
      await db.collections.clear();
      alert('Dados limpos com sucesso.');
    }
  };

  return (
    <div className="px-6 py-6 space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">Privacidade em Primeiro Lugar</h2>
        <p className="text-sm text-slate-500">Sua galeria é um espaço sagrado. Veja como protegemos você.</p>
      </div>

      <div className="space-y-4">
        <PrivacyCard 
          icon={<Lock className="text-blue-500" />}
          title="Processamento Local"
          description="A análise de rostos e objetos é feita diretamente no seu navegador. Nenhuma foto é enviada para nossos servidores sem seu comando explícito."
        />
        <PrivacyCard 
          icon={<EyeOff className="text-purple-500" />}
          title="Sem Coleta de Dados"
          description="Não vendemos seus dados nem usamos suas fotos para treinar modelos globais de IA. Suas memórias pertencem a você."
        />
        <PrivacyCard 
          icon={<UserCheck className="text-emerald-500" />}
          title="Segurança de Biometria"
          description="O reconhecimento de rostos é anônimo e serve apenas para agrupar suas fotos localmente."
        />
      </div>

      <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 space-y-4">
        <div className="flex items-center gap-3 text-red-600">
          <Trash2 className="w-5 h-5" />
          <h4 className="font-bold">Zona de Perigo</h4>
        </div>
        <p className="text-xs text-red-700">Deseja remover todos os metadados e miniaturas salvos neste PWA?</p>
        <button 
          onClick={clearAllData}
          className="w-full py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors"
        >
          Limpar Todos os Dados Locais
        </button>
      </div>
    </div>
  );
};

const PrivacyCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="card-premium flex items-start gap-4">
    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="space-y-1">
      <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  </div>
);

export default Privacy;
