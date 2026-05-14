const axios = require('axios');

async function validateEngines() {
    const niche = "Marketing Digital";
    console.log(`==================================================`);
    console.log(`🚀 VALIDATION OF WHATSAAS AI ENGINES FOR NICHE: "${niche}"`);
    console.log(`==================================================\n`);

    // 1. Validate Google News RSS
    console.log(`📰 [1/2] TESTING GOOGLE NEWS RSS CURATOR...`);
    try {
        const encoded = encodeURIComponent(niche);
        const rssUrl = `https://news.google.com/rss/search?q=${encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
        console.log(`🌐 Requesting RSS: ${rssUrl}`);
        
        const rssResponse = await axios.get(rssUrl, { timeout: 8000 });
        const xml = rssResponse.data || '';
        console.log(`✅ Received XML, length: ${xml.length} bytes.`);

        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        const newsItems = [];
        let match;
        while ((match = itemRegex.exec(xml)) !== null && newsItems.length < 3) {
            const block = match[1];
            const titleM = /<title>(.*?)<\/title>/i.exec(block);
            const linkM = /<link>(.*?)<\/link>/i.exec(block);
            
            if (titleM && linkM) {
                let t = titleM[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
                t = t.split(' - ')[0]; 
                newsItems.push({ title: t, link: linkM[1] });
            }
        }

        if (newsItems.length > 0) {
            console.log(`🔥 SUCCESS! Found ${newsItems.length} news articles:`);
            newsItems.forEach((item, i) => {
                console.log(`   ${i + 1}. TITLE: "${item.title}"`);
                console.log(`      LINK:  ${item.link.substring(0, 60)}...`);
            });
        } else {
            console.log(`⚠️ Warning: Google News returned no items. Check regex or connectivity.`);
        }
    } catch (err) {
        console.error(`❌ Google News Engine Test FAILED:`, err.message);
    }

    console.log(`\n--------------------------------------------------\n`);

    // 2. Validate DuckDuckGo Group Hunting
    console.log(`🕵️ [2/2] TESTING DUCKDUCKGO GROUP HUNTING SCRAPER...`);
    try {
        const query = `site:chat.whatsapp.com "${niche}"`;
        const encodedQuery = encodeURIComponent(query);
        const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
        console.log(`🌐 Requesting HTML: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            timeout: 10000,
        });

        const html = response.data || '';
        console.log(`✅ Received HTML, length: ${html.length} bytes.`);
        
        const regex = /chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9]{20,})/gi;
        const matches = new Set();
        
        let match;
        while ((match = regex.exec(html)) !== null) {
            const code = match[1];
            matches.add(`https://chat.whatsapp.com/${code}`);
        }

        const results = Array.from(matches);
        if (results.length > 0) {
            console.log(`🔥 SUCCESS! Found ${results.length} potential WhatsApp group links:`);
            results.slice(0, 5).forEach((link, i) => {
                console.log(`   ${i + 1}. GROUP: ${link}`);
            });
        } else {
            console.log(`⚠️ Warning: DuckDuckGo HTML scraping yielded 0 groups. It's possible DuckDuckGo rate-limited the query or returned no index for "${niche}".`);
        }
    } catch (err) {
        console.error(`❌ DuckDuckGo Engine Test FAILED:`, err.message);
    }

    console.log(`\n==================================================`);
    console.log(`🎯 VALIDAÇÃO CONCLUÍDA`);
    console.log(`==================================================`);
}

validateEngines();
