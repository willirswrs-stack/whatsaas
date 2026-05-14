const https = require('http'); // Evolution is locally usually http

const options = {
  hostname: '127.0.0.1',
  port: 8081,
  path: '/instance/connectionState/willian-2897',
  method: 'GET',
  headers: { 'apikey': 'D34F429B9135-494D-8A6E-A21E319' } // Guess from prior interactions or look in .env
};

// Better yet: Read the .env to get actual key!
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));
const apiKey = envConfig.EVOLUTION_API_KEY;
const baseUrl = envConfig.EVOLUTION_API_URL || 'http://localhost:8081';

const url = `${baseUrl}/instance/connectionState/willian-2897`;
console.log("Querying Evolution at:", url);

fetch(url, {
    headers: { 'apikey': apiKey }
})
.then(r => r.json())
.then(d => {
    console.log("EVOLUTION PAYLOAD:");
    console.log(JSON.stringify(d, null, 2));
})
.catch(e => console.error("Error:", e));
