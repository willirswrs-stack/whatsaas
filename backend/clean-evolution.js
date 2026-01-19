const axios = require('axios');

const EVO_URL = 'http://localhost:8081';
const API_KEY = 'evolution_key_2024';

async function cleanEvolution() {
    try {
        console.log('Fetching instances...');
        const response = await axios.get(`${EVO_URL}/instance/fetchInstances`, {
            headers: { apikey: API_KEY }
        });

        const instances = response.data;
        console.log(`Found ${instances.length} instances.`);

        for (const instance of instances) {
            // Evolution return format might vary, usually instance.name or instance.instance.name
            const instanceName = instance.name || instance.instance?.name || instance.instanceName;
            if (instanceName) {
                console.log(`Deleting instance: ${instanceName}`);
                try {
                    await axios.delete(`${EVO_URL}/instance/delete/${instanceName}`, {
                        headers: { apikey: API_KEY }
                    });
                    console.log(`Deleted ${instanceName}`);
                } catch (err) {
                    console.error(`Failed to delete ${instanceName}:`, err.message);
                }
            }
        }
        console.log('Evolution cleanup complete.');
    } catch (error) {
        console.error('Error cleaning Evolution:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

cleanEvolution();
