'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { ChipCard } from '@/components/ChipCard';
import { dashboardService, DashboardData } from '@/lib/dashboard';
import { instancesService, Instance } from '@/lib/instances';

const statusColors: Record<string, string> = {
  running: 'var(--accent-success)',
  completed: 'var(--accent-info)',
  scheduled: 'var(--accent-warning)',
  draft: 'var(--text-muted)',
  paused: '#fb923c',
};

const statusLabels: Record<string, string> = {
  running: 'Em execução',
  completed: 'Concluída',
  scheduled: 'Agendada',
  draft: 'Rascunho',
  paused: 'Pausada',
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [chips, setChips] = useState<Instance[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dashboardData, instancesData] = await Promise.all([
        dashboardService.getStats(),
        instancesService.list().catch(() => [])
      ]);
      setData(dashboardData);
      setChips(instancesData.slice(0, 4));
    } catch {
      // Use empty data on error
      setData({
        stats: { totalChips: 0, activeChips: 0, messagesSent: 0, deliveryRate: 0, aiVariations: 0 },
        recentCampaigns: [],
        funnelData: { sent: 0, delivered: 0, read: 0, responded: 0 }
      });
      setChips([]);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = data ? [
    { label: 'Chips Ativos', value: data.stats.activeChips.toString(), change: { value: `de ${data.stats.totalChips} total`, positive: true } },
    { label: 'Mensagens Enviadas', value: data.stats.messagesSent.toLocaleString(), change: { value: 'Este mês', positive: true } },
    { label: 'Taxa de Entrega', value: `${data.stats.deliveryRate.toFixed(1)}%`, change: { value: 'Média geral', positive: true } },
    { label: 'Campanhas', value: data.recentCampaigns.length.toString(), change: { value: 'Ativas', positive: true } },
  ] : [];

  return (
    <div className="animate-fadeIn">
      <Header />

      {/* Page Title */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span>Última atualização:</span>
          <span className="text-[var(--text-secondary)]">Agora</span>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaigns Table - 2 columns */}
            <div className="lg:col-span-2">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Campanhas Recentes
                  </h2>
                  <Link href="/campaigns" className="btn btn-ghost text-sm">Ver todas</Link>
                </div>

                {data?.recentCampaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[var(--text-muted)]">Nenhuma campanha ainda</p>
                    <Link href="/campaigns" className="btn btn-primary mt-4">Criar campanha</Link>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Campanha</th>
                          <th>Status</th>
                          <th>Enviadas</th>
                          <th>Entregues</th>
                          <th>Lidas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.recentCampaigns.map((campaign) => (
                          <tr key={campaign.id}>
                            <td className="font-medium">{campaign.name}</td>
                            <td>
                              <span
                                className="inline-flex items-center gap-2 text-sm"
                                style={{ color: statusColors[campaign.status] || 'var(--text-muted)' }}
                              >
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                                {statusLabels[campaign.status] || campaign.status}
                              </span>
                            </td>
                            <td>{(campaign.sentCount || 0).toLocaleString()}</td>
                            <td>{(campaign.deliveredCount || 0).toLocaleString()}</td>
                            <td>{(campaign.readCount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Funnel Chart - 1 column */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                Funil de Engajamento
              </h2>

              <div className="space-y-4">
                {/* Enviadas */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">Enviadas</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {data?.funnelData.sent.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-10 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-bold">100%</span>
                  </div>
                </div>

                {/* Entregues */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">Entregues</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {data?.funnelData.delivered.toLocaleString()}
                    </span>
                  </div>
                  <div
                    className="h-10 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 flex items-center justify-center"
                    style={{ width: data?.funnelData.sent ? `${(data.funnelData.delivered / data.funnelData.sent * 100)}%` : '0%', minWidth: '60px' }}
                  >
                    <span className="text-white font-bold">
                      {data?.funnelData.sent ? ((data.funnelData.delivered / data.funnelData.sent) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>

                {/* Lidas */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">Lidas</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {data?.funnelData.read.toLocaleString()}
                    </span>
                  </div>
                  <div
                    className="h-10 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center"
                    style={{ width: data?.funnelData.sent ? `${(data.funnelData.read / data.funnelData.sent * 100)}%` : '0%', minWidth: '60px' }}
                  >
                    <span className="text-white font-bold">
                      {data?.funnelData.sent ? ((data.funnelData.read / data.funnelData.sent) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chips Grid */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Status dos Chips
              </h2>
              <Link href="/chips" className="btn btn-ghost text-sm">Gerenciar Chips</Link>
            </div>

            {chips.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-[var(--text-muted)]">Nenhum chip conectado</p>
                <Link href="/chips" className="btn btn-primary mt-4">Adicionar chip</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {chips.map((chip) => (
                  <ChipCard
                    key={chip.id}
                    phone={chip.phone || chip.instanceName || 'Sem número'}
                    status={chip.status === 'connected' ? 'active' : chip.status as any}
                    dailyLimit={chip.dailyLimit || 10}
                    dailySent={chip.dailySent || 0}
                    instanceId={chip.id}
                    proxy={chip.proxy?.host}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
