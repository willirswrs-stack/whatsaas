'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SwaggerViewerProps {
    docsUrl: string;
}

export default function SwaggerViewer({ docsUrl }: SwaggerViewerProps) {
    const [spec, setSpec] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!docsUrl) return;

        const fetchDocs = async () => {
            try {
                setLoading(true);
                const response = await axios.get(docsUrl);
                setSpec(response.data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch swagger JSON', err);
                setError('Falha ao carregar a documentação da API. Verifique a URL do backend ou o bloqueio de CORS.');
            } finally {
                setLoading(false);
            }
        };

        fetchDocs();
    }, [docsUrl]);

    if (loading) return <div className="text-[var(--text-muted)] flex items-center gap-2 animate-pulse">Carregando documentação da API em tempo real...</div>;
    if (error) return <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-500/20">{error}</div>;
    if (!spec || !spec.paths) return null;

    // Agrupar rotas pelas Tags definidas no backend (ex: 'auth', 'instances')
    const groupedPaths: Record<string, any[]> = {};
    
    Object.keys(spec.paths).forEach(path => {
        const methods = spec.paths[path];
        Object.keys(methods).forEach(method => {
            const endpoint = methods[method];
            const tag = endpoint.tags && endpoint.tags.length > 0 ? endpoint.tags[0] : 'Geral';
            
            if (!groupedPaths[tag]) {
                groupedPaths[tag] = [];
            }
            
            groupedPaths[tag].push({
                path,
                method: method.toUpperCase(),
                ...endpoint
            });
        });
    });

    const getMethodColor = (method: string) => {
        switch (method) {
            case 'GET': return 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
            case 'POST': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
            case 'PUT': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]';
            case 'PATCH': return 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]';
            case 'DELETE': return 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20 shadow-[0_0_10px_rgba(156,163,175,0.2)]';
        }
    };

    return (
        <div className="space-y-10">
            {Object.keys(groupedPaths).map(tag => (
                <div key={tag} className="mb-8">
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 capitalize border-b border-[var(--border-color)] pb-2">{tag} Endpoints</h3>
                    
                    <div className="space-y-4">
                        {groupedPaths[tag].map((endpoint, idx) => (
                            <details key={idx} className="glass-card border border-[var(--border-color)] overflow-hidden rounded-2xl transition-all group">
                                <summary className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-black/40 border-b border-transparent group-open:border-[var(--border-color)] cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-4 py-1.5 font-bold rounded-lg text-sm uppercase tracking-wider border ${getMethodColor(endpoint.method)}`}>
                                            {endpoint.method}
                                        </span>
                                        <span className="font-mono text-[var(--text-primary)] font-semibold tracking-tight">{endpoint.path}</span>
                                    </div>
                                    <div className="text-sm text-[var(--text-muted)] md:ml-auto flex items-center gap-4">
                                        {endpoint.summary || endpoint.description || ''}
                                        <span className="transform transition-transform duration-300 group-open:rotate-180 opacity-50">▼</span>
                                    </div>
                                </summary>
                                
                                <div className="p-6 bg-black/20 space-y-6">
                                    {/* Parameters */}
                                    {endpoint.parameters && endpoint.parameters.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3">Parâmetros</h4>
                                            <div className="bg-[#0d1117] rounded-xl overflow-hidden border border-gray-800 shadow-inner">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-white/5 border-b border-gray-800">
                                                        <tr>
                                                            <th className="px-4 py-3 font-semibold text-gray-300">Nome</th>
                                                            <th className="px-4 py-3 font-semibold text-gray-300">Local</th>
                                                            <th className="px-4 py-3 font-semibold text-gray-300">Tipo</th>
                                                            <th className="px-4 py-3 font-semibold text-gray-300 text-center">Obrigatório</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-800">
                                                        {endpoint.parameters.map((p: any, i: number) => (
                                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                                <td className="px-4 py-3 font-mono text-emerald-300">{p.name}</td>
                                                                <td className="px-4 py-3 text-gray-400">{p.in}</td>
                                                                <td className="px-4 py-3 font-mono text-blue-300">{p.schema?.type || p.type || 'string'}</td>
                                                                <td className="px-4 py-3 text-gray-400 text-center">{p.required ? <span className="text-red-400 font-bold">Sim</span> : 'Não'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Responses */}
                                    {endpoint.responses && (
                                        <div>
                                            <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3 border-b border-[var(--border-color)] pb-2">Respostas</h4>
                                            <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-[var(--border-color)]">
                                                {Object.keys(endpoint.responses).map(statusCode => (
                                                    <div key={statusCode} className="flex gap-6 items-center text-sm p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                        <span className={`font-bold w-12 text-center py-1 rounded ${
                                                            statusCode.startsWith('2') ? 'text-emerald-400 bg-emerald-400/10' : 
                                                            statusCode.startsWith('4') || statusCode.startsWith('5') ? 'text-red-400 bg-red-400/10' : 
                                                            'text-blue-400 bg-blue-400/10'
                                                        }`}>
                                                            {statusCode}
                                                        </span>
                                                        <span className="text-[var(--text-primary)]">{endpoint.responses[statusCode].description || 'Response'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
