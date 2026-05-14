import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { InstancesService } from './src/modules/instances/instances.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Instance } from './src/modules/instances/entities/instance.entity';
import { Repository } from 'typeorm';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const repo = app.get('InstanceRepository'); // Standard string fallback for Nest Dynamic
    const instancesService = app.get(InstancesService);

    console.log("🚀 Starting Forced Scan for missing data...");
    
    // We'll do it properly by executing logic. Since I might not get the repo string perfectly, I'll use raw query if needed, 
    // but let's use the instances service directly since we already have fixed it!
    
    // Target chips with null phone or zero maturity
    const targetIds = [
        '7f7da09c-f1a1-452e-b406-704b7555c325' // willian-2897
    ];

    const tenantId = 'de5a47d1-5770-4cf8-a306-8c113a15d993'; // Found this pattern often but better scan without tenant checks inside.
    // Let's just directly invoke the fixed instancesService.getStatus logic which captures phone and triggers scan!
    
    for (const id of targetIds) {
        try {
            console.log(`Fixing instance ${id}...`);
            // Find tenant directly to pass valid ID
            const current = await instancesService.findById(id);
            if (current) {
                 console.log(`Found ${current.instanceName} belonging to ${current.tenantId}. Running getStatus() to fetch phone...`);
                 const res = await instancesService.getStatus(id, current.tenantId);
                 console.log(`Status result phone captured: ${res.instance.phone}`);
                 
                 console.log(`Now triggering maturity re-evaluation...`);
                 const scanRes = await instancesService.scanMaturity(id, current.tenantId);
                 console.log(`Scan success! Promoted: ${scanRes.promotion}, New Day: ${scanRes.newWarmupDay}`);
            }
        } catch (e) {
            console.error(`Failed on ${id}:`, e.message);
        }
    }

    console.log("✅ DONE");
    await app.close();
}
run();
