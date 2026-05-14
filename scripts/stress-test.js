/**
 * WhatSaas - Stress Test Simulation
 * 
 * This script populates a campaign with 1,000+ dummy contacts 
 * and triggers a mass dispatch to test the BullMQ worker 
 * and rate limiting logic.
 */

const axios = require('axios');

const API_URL = 'http://localhost:3333/api/v1';
const ADMIN_TOKEN = 'PASTE_YOUR_SUPER_ADMIN_JWT_HERE'; // User needs to provide this

const TENANT_ID = 'YOUR_TENANT_ID';
const CAMPAIGN_NAME = `STRESS_TEST_${new Date().getTime()}`;
const CONTACT_COUNT = 500; // Start with 500

async function setupStressTest() {
    console.log(`🔥 Starting Stress Test Setup: ${CONTACT_COUNT} contacts...`);

    const headers = { Authorization: `Bearer ${ADMIN_TOKEN}` };

    try {
        // 1. Create Campaign
        console.log('📝 Creating campaign...');
        const campaignRes = await axios.post(`${API_URL}/campaigns`, {
            name: CAMPAIGN_NAME,
            description: 'Massive stress test for dispatcher',
            status: 'draft',
            minDelayMs: 1000, // Frequent
            maxDelayMs: 3000,
        }, { headers });

        const campaignId = campaignRes.data.id;
        console.log(`✅ Campaign created: ${campaignId}`);

        // 2. Bulk Create Dummy Contacts
        console.log(`👥 Adding ${CONTACT_COUNT} dummy contacts...`);
        const contacts = [];
        for (let i = 0; i < CONTACT_COUNT; i++) {
            contacts.push({
                name: `StressUser ${i}`,
                phone: `55119999${String(i).padStart(4, '0')}`,
                email: `test${i}@whatsaas.com`
            });
        }

        // Logic here would ideally use a bulk import endpoint
        // For simplicity in this script, let's assuming a bulk-import endpoint exists
        // or we iterate (not recommended for 1000s)
        
        await axios.post(`${API_URL}/campaigns/${campaignId}/contacts/bulk`, {
            contacts
        }, { headers });

        console.log(`✅ Contacts added to campaign.`);

        // 3. Start Campaign
        console.log('🚀 Launching campaign...');
        await axios.post(`${API_URL}/campaigns/${campaignId}/start`, {}, { headers });

        console.log('✨ Campaign IS RUNNING. Monitor Bull Board at /api/v1/queues');
        
    } catch (error) {
        console.error('❌ Stress Test Setup failed:', error.response?.data || error.message);
    }
}

// setupStressTest();
console.log('⚠️ Edit the script with your TOKEN and TENANT_ID then uncomment the call to run.');
