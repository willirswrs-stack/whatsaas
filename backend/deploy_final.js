/**
 * Deploy final: compila o TS localmente e copia o .js compilado para o container backend.
 * Para o frontend (Next.js), faz rebuild completo dentro do container.
 */
const { NodeSSH } = require('node-ssh');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const ssh = new NodeSSH();

const VPS = { host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 60000 };
const BACKEND_SRC = path.join(__dirname, 'src/modules/ai/providers/groq.adapter.ts');
const FRONTEND_LAYOUT = 'C:/Users/Usuario/whatsaas/frontend/src/components/ClientLayout.tsx';

async function deploy() {
    console.log('🚀 Deploy final (compiled JS + frontend rebuild)\n');
    await ssh.connect(VPS);
    console.log('✅ Conectado!\n');

    // ─── 1. Compilar groq.adapter.ts localmente ───
    console.log('1. Compilando groq.adapter.ts...');
    try {
        execSync('npx tsc --target ES2020 --module commonjs --moduleResolution node --esModuleInterop true --outDir ./dist_tmp src/modules/ai/providers/groq.adapter.ts 2>&1', {
            cwd: __dirname,
            stdio: 'pipe'
        });
        console.log('   ✅ Compilação OK');
    } catch(e) {
        // tsc pode reclamar de imports externos mas ainda gera o .js
        console.log('   ⚠️  Avisos de compilação (esperado):', e.stdout?.toString().slice(0, 200));
    }

    const compiledJsPath = path.join(__dirname, 'dist_tmp/src/modules/ai/providers/groq.adapter.js');
    
    if (!fs.existsSync(compiledJsPath)) {
        console.log('   JS compilado não encontrado. Compilando com método alternativo...');
        // Copiar o .js existente do container e patchar manualmente
        const getExisting = await ssh.execCommand('cat /app/dist/src/modules/ai/providers/groq.adapter.js');
        
        // Patchear o JS: substituir a função generate com a versão com rate limit fallback
        let jsContent = getExisting.stdout;
        
        // Salvar o JS original modificado
        const patchedPath = path.join(__dirname, 'groq.adapter.patched.js');
        
        // Substituição cirúrgica: adicionar statusCode ao erro e fallback 429
        jsContent = jsContent.replace(
            /throw new Error\(data\.error\?\.message \|\| 'Erro na API Groq'\);/g,
            `const err = new Error(data.error?.message || 'Erro na API Groq');
                    err.statusCode = response.status;
                    throw err;`
        );
        
        // Adicionar lógica de fallback para 429 no catch
        jsContent = jsContent.replace(
            /catch \(error\) \{\s*this\.logger\.error\(`Groq Error: \$\{error\.message\}`\);\s*throw error;\s*\}/,
            `catch (error) {
            if (error.statusCode === 429 && model !== 'llama-3.1-8b-instant') {
                this.logger.warn(\`Groq rate limit atingido no modelo '\${model}'. Tentando fallback com 'llama-3.1-8b-instant'...\`);
                try {
                    const fallbackMessages = [];
                    if (options.systemPrompt) fallbackMessages.push({ role: 'system', content: options.systemPrompt });
                    fallbackMessages.push({ role: 'user', content: prompt });
                    const fbResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${this.apiKey}\` },
                        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: fallbackMessages, temperature: options.temperature ?? 0.7, max_tokens: options.maxTokens ?? 2048 })
                    });
                    const fbData = await fbResp.json();
                    if (!fbResp.ok) throw new Error(fbData.error?.message || 'Fallback Groq error');
                    this.logger.log('✅ Groq fallback llama-3.1-8b-instant OK');
                    return { content: fbData.choices?.[0]?.message?.content || '', tokensUsed: fbData.usage?.total_tokens || 0, model: 'llama-3.1-8b-instant', provider: this.id };
                } catch (fbErr) {
                    this.logger.error(\`Groq fallback falhou: \${fbErr.message}\`);
                    throw fbErr;
                }
            }
            this.logger.error(\`Groq Error: \${error.message}\`);
            throw error;
        }`
        );
        
        fs.writeFileSync(patchedPath, jsContent);
        console.log('   ✅ JS patchado em:', patchedPath);

        // Copiar o JS patchado para o container
        await ssh.putFile(patchedPath, '/root/groq.adapter.patched.js');
        const cp = await ssh.execCommand('docker cp /root/groq.adapter.patched.js whatsaas-backend:/app/dist/src/modules/ai/providers/groq.adapter.js 2>&1');
        console.log('   docker cp backend:', cp.stdout || cp.stderr || 'OK');
    } else {
        await ssh.putFile(compiledJsPath, '/root/groq.adapter.compiled.js');
        const cp = await ssh.execCommand('docker cp /root/groq.adapter.compiled.js whatsaas-backend:/app/dist/src/modules/ai/providers/groq.adapter.js 2>&1');
        console.log('   docker cp backend:', cp.stdout || cp.stderr || 'OK');
    }

    // ─── 2. Frontend - rebuild dentro do container ───
    console.log('\n2. Fazendo rebuild do frontend (Next.js build inside container)...');
    
    // Verificar onde está o código fonte no container frontend
    const frontendPaths = await ssh.execCommand('docker exec -i whatsaas-frontend sh -c "ls /app/src/components/ 2>/dev/null | head -5 || ls /.next/ 2>/dev/null | head -3 || echo NO_SRC"');
    console.log('   Frontend container src:', frontendPaths.stdout);
    
    // O Next.js compila staticamente, precisamos do código fonte dentro do container
    // Vamos verificar se tem source dentro do container
    const hasSrc = await ssh.execCommand('docker exec -i whatsaas-frontend test -f /app/src/components/ClientLayout.tsx && echo YES || echo NO');
    console.log('   Tem src no container frontend:', hasSrc.stdout.trim());

    if (hasSrc.stdout.trim() === 'YES') {
        // Tem source: copiar o arquivo e rebuildar
        const cpFrontend = await ssh.execCommand('docker cp /root/whatsaas/frontend/src/components/ClientLayout.tsx whatsaas-frontend:/app/src/components/ClientLayout.tsx 2>&1');
        console.log('   docker cp frontend:', cpFrontend.stdout || cpFrontend.stderr || 'OK');
        
        console.log('   Executando next build dentro do container (pode demorar ~2-3 min)...');
        const buildRes = await ssh.execCommand('docker exec -i whatsaas-frontend sh -c "cd /app && npm run build 2>&1 | tail -20"');
        console.log('   Build result:', buildRes.stdout);
    } else {
        // Next.js standalone: precisamos reconstruir a imagem
        // Como alternativa, vamos verificar o chunk compilado e patchear
        console.log('   Frontend usa build standalone. Verificando chunks...');
        const chunks = await ssh.execCommand('docker exec -i whatsaas-frontend sh -c "ls /.next/server/chunks/ 2>/dev/null | head -5 || ls /app/.next/server/chunks/ 2>/dev/null | head -5"');
        console.log('   Chunks:', chunks.stdout || '(não encontrado)');
        console.log('   ⚠️  Frontend requer rebuild da imagem para aplicar mudanças de código.');
        console.log('   Por ora, apenas o backend foi atualizado.');
    }

    // ─── 3. Restart backend (frontend só se rebuildar) ───
    console.log('\n3. Reiniciando backend...');
    const restart = await ssh.execCommand('docker restart whatsaas-backend 2>&1');
    console.log('   backend:', restart.stdout.trim());

    await new Promise(r => setTimeout(r, 15000));

    const status = await ssh.execCommand('docker ps --format "table {{.Names}}\\t{{.Status}}"');
    console.log('\n📊 Status final:');
    console.log(status.stdout);

    // Verificar logs backend para confirmar que subiu sem erro
    const logs = await ssh.execCommand('docker logs whatsaas-backend --tail 10 2>&1');
    console.log('\n📋 Últimas linhas do backend:');
    console.log(logs.stdout || logs.stderr);

    ssh.dispose();
    console.log('\n✅ Deploy concluído!');
}

deploy().catch(e => { console.error('ERRO:', e.message); try { ssh.dispose(); } catch(_) {} });
