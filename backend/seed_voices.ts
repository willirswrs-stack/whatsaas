import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { InstancesService } from './src/modules/instances/instances.service';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(InstancesService);
    
    const tenantId = 'd5e5febe-f7dc-40bd-8f73-da5367f30c0e'; // Real tenant ID detected in logs earlier
    console.log("🔍 Listing instances for heuristic voice assignment...");
    
    const instances = await service.findAll(tenantId);
    
    for (const inst of instances) {
        const name = (inst.instanceName || '').toLowerCase();
        let voice = 'alloy'; // Default
        
        // Heuristics for user's names
        if (name.includes('willian')) {
            voice = 'onyx'; // Strong Male
        } else if (name.includes('ricardo')) {
            voice = 'fable'; // Classic Male
        } else if (name.includes('bernardo')) {
            voice = 'echo'; // Younger Male
        } else if (name.includes('maria') || name.includes('ana') || name.includes('clara')) {
            voice = 'nova'; // Clear Female
        } else if (name.includes('player') || name.includes('chip')) {
            voice = 'shimmer'; // Diversification
        }
        
        console.log(`Updating ${inst.instanceName} -> Voice assigned: ${voice}`);
        
        // Update existing metaConfig preserving existing keys
        const newMeta = { ...(inst.metaConfig || {}), voiceProfile: voice };
        await service.update(inst.id, tenantId, { metaConfig: newMeta } as any);
    }
    
    console.log("✅ All instance voice profiles updated successfully!");
    await app.close();
}
run();
