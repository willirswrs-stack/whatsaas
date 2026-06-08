import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CampaignsService } from '../modules/campaigns/campaigns.service';
import { Campaign } from '../modules/campaigns/entities/campaign.entity';
import { DataSource } from 'typeorm';

async function run() {
    console.log('🔄 Initializing NestJS application context...');
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

    try {
        const campaignsService = app.get(CampaignsService);
        const dataSource = app.get(DataSource);
        
        const campaignId = 'cb68d37a-98bf-43cd-b1a1-0dc9083e1ef9';
        const campaignRepo = dataSource.getRepository(Campaign);
        
        const campaign = await campaignRepo.findOne({ where: { id: campaignId } });
        if (!campaign) {
            console.error('❌ Campaign not found');
            return;
        }

        console.log(`Campaign found: "${campaign.name}" | Status: ${campaign.status} | Tenant: ${campaign.tenantId}`);
        
        console.log(`🚀 Retrying failed contacts for campaign...`);
        const result = await campaignsService.retryFailed(campaignId, campaign.tenantId);
        console.log('✅ Campaign Retry/Resume triggered successfully!', JSON.stringify(result, null, 2));

    } catch (err: any) {
        console.error('❌ Error executing retry_campaign:', err);
    } finally {
        await app.close();
        console.log('👋 Finished');
    }
}

run();
