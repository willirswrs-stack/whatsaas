import api from './api';
import { instancesService } from './instances';
import { campaignsService, Campaign } from './campaigns';

export interface DashboardStats {
    totalChips: number;
    activeChips: number;
    messagesSent: number;
    deliveryRate: number;
    aiVariations: number;
}

export interface DashboardData {
    stats: DashboardStats;
    recentCampaigns: Campaign[];
    funnelData: {
        sent: number;
        delivered: number;
        read: number;
        responded: number;
    };
}

export const dashboardService = {
    async getStats(): Promise<DashboardData> {
        try {
            const [instances, campaigns] = await Promise.all([
                instancesService.list(),
                campaignsService.list()
            ]);

            // Calcular stats
            const activeChips = instances.filter(i => i.status === 'connected').length;
            const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
            const totalDelivered = campaigns.reduce((sum, c) => sum + (c.deliveredCount || 0), 0);
            const totalRead = campaigns.reduce((sum, c) => sum + (c.readCount || 0), 0);
            const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

            return {
                stats: {
                    totalChips: instances.length,
                    activeChips,
                    messagesSent: totalSent,
                    deliveryRate,
                    aiVariations: 0, // Placeholder
                },
                recentCampaigns: campaigns.slice(0, 4),
                funnelData: {
                    sent: totalSent,
                    delivered: totalDelivered,
                    read: totalRead,
                    responded: 0, // Placeholder
                },
            };
        } catch {
            // Return default values if API fails
            return {
                stats: {
                    totalChips: 0,
                    activeChips: 0,
                    messagesSent: 0,
                    deliveryRate: 0,
                    aiVariations: 0,
                },
                recentCampaigns: [],
                funnelData: {
                    sent: 0,
                    delivered: 0,
                    read: 0,
                    responded: 0,
                },
            };
        }
    },
};
