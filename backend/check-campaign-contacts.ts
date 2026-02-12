
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { CampaignContact } from './src/modules/campaigns/entities/campaign.entity';

async function checkCampaignContacts() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const dataSource = app.get(DataSource);

    // Replace with campaign ID from previous step
    const campaignId = '25805179-1555-4823-9a3b-c283da9b45b6';
    const contactRepo = dataSource.getRepository(CampaignContact);
    const contacts = await contactRepo.find({ where: { campaignId } });

    console.log(`Campaign Contacts: ${contacts.length}`);
    contacts.forEach(c => {
        console.log(`Contact: ${c.contactId} - Status: ${c.status} - Error: ${c.errorMessage}`);
    });

    await app.close();
}

checkCampaignContacts();
