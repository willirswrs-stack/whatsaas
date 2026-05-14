const axios = require('axios');
const fs = require('fs');

async function dumpBing() {
    const query = `site:chat.whatsapp.com "Marketing Digital"`;
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        fs.writeFileSync('bing_dump.html', response.data);
        console.log("Bing dump saved. Length:", response.data.length);
        
        // Let's check for any occurrences of "chat" or "whatsapp" inside the HTML
        if (response.data.toLowerCase().includes("whatsapp")) {
            console.log("HTML contains the word 'whatsapp'!");
        }
        
        // Let's find all href strings and see if any look like group links or encoded URLs
        const hrefRegex = /href="([^"]+)"/g;
        let m;
        const links = [];
        while((m = hrefRegex.exec(response.data)) !== null) {
            links.push(m[1]);
        }
        console.log("Total Links in Bing response:", links.length);
        const interesting = links.filter(l => l.includes("chat.whatsapp.com") || l.includes("whatsapp.com") || l.includes("bing.com/ck"));
        console.log("Interesting links sample:", interesting.slice(0, 10));
        
        // Look for direct chat.whatsapp.com occurrences even outside hrefs
        const textRegex = /chat\.whatsapp\.com\/[a-zA-Z0-9]+/g;
        const textMatches = response.data.match(textRegex) || [];
        console.log("Direct text occurrences of chat.whatsapp.com:", textMatches.length);
        if (textMatches.length > 0) {
            console.log("Found instances:", textMatches.slice(0, 5));
        }

    } catch (e) {
        console.error(e.message);
    }
}
dumpBing();
