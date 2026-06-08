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
        
        const campaignId = '8abdda0e-eede-4044-80a3-2a5fefa1a026';
        const campaignRepo = dataSource.getRepository(Campaign);
        
        const campaign = await campaignRepo.findOne({ where: { id: campaignId } });
        if (!campaign) {
            console.error('❌ Campaign not found');
            return;
        }

        console.log(`Campaign found: "${campaign.name}" | Status: ${campaign.status} | Tenant: ${campaign.tenantId}`);
        
        console.log(`🔄 Pausing campaign first to clean up any stuck queues...`);
        try {
            await campaignsService.pause(campaignId, campaign.tenantId);
            console.log('✅ Paused');
        } catch (e: any) {
            console.log('Info: Campaign was not running or failed to pause:', e.message);
        }

        console.log(`🚀 Resuming campaign to trigger remaining dispatch...`);
        const result = await campaignsService.resume(campaignId, campaign.tenantId);
        console.log('✅ Campaign Resumed successfully!', JSON.stringify(result, null, 2));

    } catch (err: any) {
        console.error('❌ Error executing resume_campaign:', err);
    } finally {
        await app.close();
        console.log('👋 Finished');
    }
}

run();
