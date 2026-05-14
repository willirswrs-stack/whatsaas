import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instance } from '../instances/entities/instance.entity';
import { AiService } from '../ai/ai.service';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import axios from 'axios';

@Injectable()
export class GroupWarmupService {
    private readonly logger = new Logger(GroupWarmupService.name);

    constructor(
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        private aiService: AiService,
        private whatsappFactory: WhatsAppProviderFactory,
    ) {}

    /**
     * Main routine invoked daily or periodically per instance
     */
    async processGroupWarmupForInstance(instance: Instance): Promise<{ success: boolean; action: string; message?: string }> {
        try {
            // 1. Guard Checks
            const meta = instance.metaConfig || {};
            const isEnabled = !!meta.groupWarmupEnabled;
            const niche = meta.warmupNiche || '';
            const minDay = Number(meta.groupWarmupDay) || 5;
            const currentDay = instance.warmupDay || 0;

            if (!isEnabled) {
                return { success: false, action: 'skip', message: 'Group warmup not enabled' };
            }
            if (!niche || niche.trim().length < 3) {
                return { success: false, action: 'skip', message: 'No valid niche defined for group search' };
            }
            if (currentDay < minDay) {
                return { success: false, action: 'skip', message: `Maturity insufficient (${currentDay}/${minDay} days)` };
            }

            // Action selection strategy: 
            // If we already belong to groups, alternate between "joining a new one" (60% weight) 
            // and "sharing news/curating content" (40% weight) to diversify social interaction.
            const joinedJids = meta.joinedGroupJids || [];
            const hasGroups = joinedJids.length > 0;
            
            // 40% chance to share news instead of joining a group if already in groups
            if (hasGroups && Math.random() < 0.4) {
                this.logger.log(`[GroupWarmup] 📰 Choosing 'Share News' strategy today for instance ${instance.instanceName}`);
                const shareRes = await this.searchAndShareNicheNews(instance);
                return { success: shareRes.success, action: 'share_news', message: shareRes.message || `Shared news: ${shareRes.url}` };
            }

            // Check if we already performed a join activity in the last 20 hours to throttle
            const lastJoin = meta.lastGroupJoinAt ? new Date(meta.lastGroupJoinAt) : null;
            if (lastJoin && (Date.now() - lastJoin.getTime() < 20 * 60 * 60 * 1000)) {
                return { success: false, action: 'throttle', message: 'Group join throttled (1 per 24h)' };
            }

            this.logger.log(`[GroupWarmup] 🕵️ Triggering group hunt for instance ${instance.instanceName} in niche: "${niche}"`);

            // 2. Get available links
            // Prioritize user-provided custom links, then fallback to scraper cache
            const customLinks: string[] = meta.customGroupLinks || [];
            let potentialLinks: string[] = [...customLinks, ...(meta.foundGroupLinksCache || [])];
            
            const lastSearch = meta.lastGroupSearchAt ? new Date(meta.lastGroupSearchAt) : null;
            
            // If both custom links and cached scrapings are exhausted or cache expired (older than 3 days), try scraping fallback
            const needsScraping = (potentialLinks.length === 0) || 
                                  (!customLinks.length && (!lastSearch || (Date.now() - lastSearch.getTime() > 3 * 24 * 60 * 60 * 1000)));

            if (needsScraping) {
                const scraped = await this.searchGroupLinks(niche);
                meta.foundGroupLinksCache = scraped;
                meta.lastGroupSearchAt = new Date().toISOString();
                await this.saveMeta(instance.id, meta);
                
                potentialLinks = [...customLinks, ...scraped];
                this.logger.log(`[GroupWarmup] Search complete. Found ${scraped.length} new potential groups via fallback search.`);
            }

            // Filter out already joined groups
            const joined = meta.joinedGroupLinks || [];
            const candidateLinks = potentialLinks.filter(l => !joined.includes(l));

            if (candidateLinks.length === 0) {
                return { success: false, action: 'no_links', message: 'No new group links available to join' };
            }

            // Select the first available link
            const inviteUrl = candidateLinks[0];
            this.logger.log(`[GroupWarmup] 🚪 Attempting to join group: ${inviteUrl}`);

            // 3. Execute group joining via provider
            const provider = this.whatsappFactory.getProvider(instance.provider || 'evolution');
            const joinResult = await provider.joinGroup(instance.instanceName, inviteUrl);

            // Save the returned JID of the group for future interactive sharing
            let newGroupJid = '';
            if (joinResult) {
                // Dig up return values from different APIs
                newGroupJid = joinResult.jid || joinResult.groupJid || (joinResult.data?.jid) || '';
            }

            // 4. Generate a warm introduction message via AI
            let introMessage = `Olá pessoal! Prazer em entrar no grupo. Sou focado em ${niche} e espero trocar conhecimentos aqui com vocês! 😊`;
            try {
                if (this.aiService) {
                    const aiResponse = await this.aiService.generateResponseWithKey(
                        `Você é uma pessoa real e educada que acabou de entrar em um grupo de WhatsApp focado no nicho "${niche}". Escreva uma breve mensagem de apresentação de no máximo 2 frases dizendo que está feliz em entrar no grupo para aprender e interagir. Não pareça um robô ou vendedor. Use um português natural com letra minúscula ou gírias casuais leves.`,
                        "Crie a mensagem de introdução",
                        process.env.OPENAI_API_KEY || 'sk-placeholder'
                    );
                    if (aiResponse && !aiResponse.includes('[ERROR AI]')) {
                        introMessage = aiResponse.replace(/\"/g, ''); 
                    }
                }
            } catch (aiErr) {
                this.logger.warn(`Failed to generate custom AI group intro: ${aiErr.message}`);
            }

            // Wait 15-45 seconds after joining to simulate human reading the group context
            const typingMs = Math.floor(Math.random() * 30000) + 15000;
            this.logger.log(`[GroupWarmup] Waiting ${Math.round(typingMs/1000)}s before sending intro message...`);
            
            setTimeout(async () => {
                try {
                    // If the API returned the JID, we can proactively send the AI-generated intro message!
                    if (newGroupJid) {
                        await provider.sendText(instance.instanceName, newGroupJid, introMessage);
                        this.logger.log(`[GroupWarmup] Intro message successfully sent to group: ${newGroupJid}`);
                    } else {
                        this.logger.log(`[GroupWarmup] Group joined, but JID not returned. Skipping immediate intro message.`);
                    }
                } catch (sendErr) {
                    this.logger.warn(`Failed to send group intro message, but join was successful: ${sendErr.message}`);
                }
            }, typingMs);

            // Update Meta state
            joined.push(inviteUrl);
            meta.joinedGroupLinks = joined;
            meta.lastGroupJoinAt = new Date().toISOString();
            
            // Add JID to our internal list of interactive groups if returned
            if (newGroupJid) {
                const currentJids = meta.joinedGroupJids || [];
                if (!currentJids.includes(newGroupJid)) {
                    currentJids.push(newGroupJid);
                    meta.joinedGroupJids = currentJids;
                }
            }

            // Remove from candidate cache to avoid reuse
            meta.foundGroupLinksCache = potentialLinks.filter(l => l !== inviteUrl);
            await this.saveMeta(instance.id, meta);

            return { success: true, action: 'joined', message: `Joined: ${inviteUrl}` };

        } catch (error) {
            this.logger.error(`Group Warmup flow failure: ${error.message}`);
            return { success: false, action: 'error', message: error.message };
        }
    }

    /**
     * Analyzes incoming group messages and occasionally responds using contextual AI,
     * creating high social credibility (Interação Reativa).
     */
    async handleGroupIncomingMessage(instanceName: string, groupJid: string, content: string): Promise<void> {
        try {
            const instance = await this.instanceRepo.findOne({ where: { instanceName } });
            if (!instance) return;

            const meta = instance.metaConfig || {};
            if (!meta.groupWarmupEnabled || !meta.warmupNiche) return;

            // Safeguard: Save this JID as a known joined group for future news sharing 
            // (helps backfill groups joined before this version or from other means)
            const joinedJids = meta.joinedGroupJids || [];
            if (!joinedJids.includes(groupJid)) {
                joinedJids.push(groupJid);
                meta.joinedGroupJids = joinedJids;
                await this.saveMeta(instance.id, meta);
            }

            // Natural throttle: Only respond to ~4% of general messages, 
            // increasing to 15% if keywords related to our niche are explicitly mentioned.
            const dice = Math.random();
            const niche = meta.warmupNiche.toLowerCase();
            const lowercaseContent = (content || '').toLowerCase();
            
            const nicheKeywords = niche.split(' ').filter(word => word.length > 3);
            const hasKeywords = nicheKeywords.some(kw => lowercaseContent.includes(kw));
            
            const responseThreshold = hasKeywords ? 0.15 : 0.04;

            if (dice > responseThreshold) {
                // Decided not to respond this time. Completely natural.
                return;
            }

            this.logger.log(`[GroupWarmup] 🤖 Decision hit! Responding reactively to group ${groupJid} on instance ${instanceName}.`);

            // Generate reply using AI
            let reply = '';
            if (this.aiService) {
                const systemPrompt = `Você é um participante comum de um grupo de WhatsApp sobre o assunto "${meta.warmupNiche}".
Comente sobre a seguinte mensagem enviada no grupo de forma extremamente natural, curta (no máximo 10 a 15 palavras) e casual.
Use gírias brasileiras super leves, letras minúsculas e ignore pontuações perfeitas de português corporativo. Não tente vender nada, apenas seja amigável ou concorde/comente brevemente.
Mensagem no grupo: "${content}"`;

                const response = await this.aiService.generateResponseWithKey(
                    systemPrompt,
                    "Resposta Reativa de Grupo",
                    process.env.OPENAI_API_KEY || 'sk-placeholder'
                );

                if (response && !response.includes('[ERROR AI]')) {
                    reply = response.replace(/\"/g, '');
                }
            }

            if (!reply || reply.length < 2) return;

            // Wait 12-30 seconds simulating slow mobile typing before dispatching
            const delayMs = Math.floor(Math.random() * 18000) + 12000;
            this.logger.log(`[GroupWarmup] Simulating reactive group typing for ${Math.round(delayMs/1000)}s...`);

            setTimeout(async () => {
                try {
                    const provider = this.whatsappFactory.getProvider(instance.provider || 'evolution');
                    await provider.sendText(instanceName, groupJid, reply);
                    this.logger.log(`[GroupWarmup] Dispatched reactive comment to group ${groupJid}`);
                } catch (err) {
                    this.logger.warn(`Failed to dispatch reactive reply: ${err.message}`);
                }
            }, delayMs);

        } catch (error) {
            this.logger.error(`Failed inside handleGroupIncomingMessage: ${error.message}`);
        }
    }

    /**
     * Scrapes real-world news from Google News for the niche, 
     * then shares an article link to a joined group with an organic AI introduction.
     */
    async searchAndShareNicheNews(instance: Instance, forcedJid?: string): Promise<{ success: boolean; message?: string; url?: string }> {
        try {
            const meta = instance.metaConfig || {};
            const niche = meta.warmupNiche || '';
            
            const groupJids = meta.joinedGroupJids || [];
            let targetJid = forcedJid;

            if (!targetJid && groupJids.length > 0) {
                targetJid = groupJids[Math.floor(Math.random() * groupJids.length)];
            }

            if (!targetJid) {
                return { success: false, message: 'No joined groups available for sharing news.' };
            }

            this.logger.log(`[GroupWarmup] 📰 Commencing Google News RSS lookup for niche: "${niche}"`);
            
            // 1. Connect to Google News RSS feeds (fast, reliable, standard XML)
            const encoded = encodeURIComponent(niche);
            const rssUrl = `https://news.google.com/rss/search?q=${encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
            
            const rssResponse = await axios.get(rssUrl, { timeout: 8000 });
            const xml = rssResponse.data || '';

            // 2. Parse news blocks with precise regex
            const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
            const newsItems: { title: string; link: string }[] = [];
            
            let match;
            while ((match = itemRegex.exec(xml)) !== null && newsItems.length < 5) {
                const block = match[1];
                const titleM = /<title>(.*?)<\/title>/i.exec(block);
                const linkM = /<link>(.*?)<\/link>/i.exec(block);
                
                if (titleM && linkM) {
                    // Strip CDATA wrappers if present
                    let t = titleM[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
                    // Google RSS titles often suffix " - Source Name", let's clean that if possible for natural sharing
                    t = t.split(' - ')[0]; 
                    newsItems.push({ title: t, link: linkM[1] });
                }
            }

            if (newsItems.length === 0) {
                return { success: false, message: 'DuckDuck/Google News RSS returned zero relevant items.' };
            }

            // Choose a random article
            const pick = newsItems[Math.floor(Math.random() * newsItems.length)];
            this.logger.log(`[GroupWarmup] Selected article: "${pick.title}"`);

            // 3. Draft intro message
            let shareIntro = `Achei bem interessante essa matéria que li agora sobre ${niche}:`;
            
            if (this.aiService) {
                try {
                    const sysPrompt = `Você está em um grupo do nicho "${niche}". Você vai colar um link de uma matéria cujo título é: "${pick.title}".
Escreva uma chamada inicial curtíssima e muito casual (tipo "olha isso galera", "achei interessante dps leiam", "bom artigo pro pessoal", "vi isso aq agr") em letras minúsculas e sem pontuação chata. 
Não coloque o título nem o link na sua resposta, apenas essa introdução.`;

                    const aiReply = await this.aiService.generateResponseWithKey(
                        sysPrompt,
                        "Apresentação de Artigo",
                        process.env.OPENAI_API_KEY || 'sk-placeholder'
                    );
                    
                    if (aiReply && !aiReply.includes('[ERROR AI]')) {
                        shareIntro = aiReply.replace(/\"/g, '');
                    }
                } catch (aiErr) {
                    this.logger.warn(`News intro generation fallback: ${aiErr.message}`);
                }
            }

            const finalMessage = `${shareIntro}\n\n${pick.title}\n${pick.link}`;
            const provider = this.whatsappFactory.getProvider(instance.provider || 'evolution');

            // 4. Execute sending
            await provider.sendText(instance.instanceName, targetJid, finalMessage);
            this.logger.log(`[GroupWarmup] Successfully curated content to group ${targetJid}`);

            return { success: true, url: pick.link };

        } catch (err) {
            this.logger.error(`Failed inside searchAndShareNicheNews: ${err.message}`);
            return { success: false, message: err.message };
        }
    }

    /**
     * Uses DuckDuckGo HTML search to safely scrape public WhatsApp group links
     */
    async searchGroupLinks(niche: string): Promise<string[]> {
        try {
            const query = `site:chat.whatsapp.com "${niche}"`;
            const encodedQuery = encodeURIComponent(query);
            const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

            this.logger.log(`[GroupWarmup] 🌐 Scoping web search: ${url}`);

            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                },
                timeout: 10000,
            });

            const html = response.data || '';
            
            // Rigorous Regex for WhatsApp group links
            const regex = /chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9]{20,})/gi;
            const matches = new Set<string>();
            
            let match;
            while ((match = regex.exec(html)) !== null) {
                const code = match[1];
                matches.add(`https://chat.whatsapp.com/${code}`);
            }

            const results = Array.from(matches);
            this.logger.log(`[GroupWarmup] Engine found ${results.length} unique group links for "${niche}"`);
            
            return results.sort(() => Math.random() - 0.5);

        } catch (e) {
            this.logger.warn(`WebSearch Engine failed to scrape groups: ${e.message}`);
            return [];
        }
    }

    private async saveMeta(instanceId: string, meta: Record<string, any>) {
        const instance = await this.instanceRepo.findOne({ where: { id: instanceId } });
        if (!instance) return;

        const currentMeta = instance.metaConfig || {};
        instance.metaConfig = {
            ...currentMeta,
            ...meta
        };

        await this.instanceRepo.save(instance);
    }
}
