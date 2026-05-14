const axios = require('axios');
const fs = require('fs');

async function dumpDdg() {
    const query = `site:chat.whatsapp.com "Marketing Digital"`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    console.log(`Requesting DuckDuckGo: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        });

        fs.writeFileSync('ddg_response.html', response.data);
        console.log(`DUMP SUCCESS. Saved ${response.data.length} bytes to ddg_response.html`);

        // Check for simple text presence
        if (response.data.includes("ddg-l")) console.log("Found typical DDG layout classes.");
        if (response.data.includes("No results found")) console.log("DDG reports NO RESULTS FOUND.");
        
        // Look for absolute links to see if they match at all
        const linkRegex = /href="([^"]+)"/g;
        let match;
        let links = [];
        while ((match = linkRegex.exec(response.data)) !== null) {
            links.push(match[1]);
        }
        console.log(`Total links found in page: ${links.length}`);
        console.log("Sample links:", links.slice(0, 5));

    } catch (err) {
        console.error("Error dumping:", err.message);
    }
}

dumpDdg();
