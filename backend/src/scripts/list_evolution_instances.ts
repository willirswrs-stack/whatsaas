import axios from 'axios';
import { config } from 'dotenv';
config();

async function run() {
    const url = `${process.env.EVOLUTION_API_URL || 'http://localhost:8081'}/instance/fetchInstances`;
    const apiKey = process.env.EVOLUTION_API_KEY || 'evolution_key_2024';

    console.log(`Fetching instances from Evolution API: ${url}`);
    try {
        const response = await axios.get(url, {
            headers: {
                apikey: apiKey
            }
        });
        console.log('Evolution API Response (Instances):');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (err: any) {
        console.error('Error fetching instances:', err.response?.data || err.message);
    }
}

run();
