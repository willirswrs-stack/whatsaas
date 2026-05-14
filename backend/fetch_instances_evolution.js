const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));
const apiKey = envConfig.EVOLUTION_API_KEY;
const baseUrl = envConfig.EVOLUTION_API_URL || 'http://localhost:8081';

const url = `${baseUrl}/instance/fetchInstances`;
console.log("Listing instances from Evolution...");

fetch(url, {
    headers: { 'apikey': apiKey }
})
.then(r => r.json())
.then(d => {
    const target = d.find(i => i.name === 'willian-2897' || i.instanceName === 'willian-2897');
    console.log("TARGET FOUND IN LIST:");
    console.log(JSON.stringify(target, null, 2));
})
.catch(e => console.error("Error:", e));
