# 📄 Dossier Técnico de Engenharia: Ecossistema WhatSaas

**Documentação de Arquitetura de Software, Motores de Automação e Inteligência Anti-Ban**

---

## 🎯 1. Visão Geral e Arquitetura de Sistemas

O **WhatSaas** é uma plataforma corporativa de ponta, voltada à orquestração multi-instância de WhatsApp, construção de fluxos conversacionais inteligentes e, acima de tudo, **blindagem matemática contra banimentos** por meio de IA comportamental.

O ecossistema opera em uma arquitetura distribuída baseada em microsserviços locais e containers de borda:

### 🏗️ Stack Tecnológica Core
*   **Backend API:** Construído sobre **NestJS (TypeScript)**, provendo alta granularidade através de Injeção de Dependências (DI), desacoplamento via `forwardRef`, controle estrito de escopo HTTP e filas de processamento robustas.
*   **Frontend Dashboard:** Desenvolvido em **Next.js (React & TailwindCSS)**, oferecendo interfaces reativas de alta performance com estética visual baseada em *glassmorphism* e controles de alto contraste (Neomorphism).
*   **Bases de Dados:** 
    *   **PostgreSQL (15-alpine):** Banco relacional que abriga esquemas estruturados de campanhas, execuções de fluxos e configurações flexíveis via campos JSONB nativos (`metaConfig`).
    *   **Redis (7-alpine):** Motor de cache de altíssima performance e gerenciador das filas assíncronas via **BullMQ**.
*   **Provedores de WhatsApp (Borda):**
    *   **Evolution API (v2.3.7):** Engine multi-instância primária que provê o tráfego de mensagens, captura eventos WebSocket de grupos e gerencia sessões.
    *   **WAHA API:** Engine secundária escalável usada para sessões singulares redundantes.

---

## 🧬 2. O Motor de Blindagem Anti-Ban (Anti-Ban Engine)

Este é o coração científico do software. Enquanto ferramentas genéricas disparam mensagens em intervalos fixos e robóticos, o WhatSaas utiliza o **Anti-Ban Engine** para emular os padrões caóticos de seres humanos, baseados em ritmos circadianos e sociais.

### 🛡️ Pilares do Motor:
1.  **Typing Simulators (Simulação de Presença):** Antes de despachar qualquer mensagem de texto ou mídia, o sistema invoca chamadas de `composing` (digitando...) ou `recording` (gravando áudio...) na API do WhatsApp por períodos calculados dinamicamente com base na contagem de caracteres da resposta.
2.  **Maturidade Progressiva (Warmup Day):** Chips recém-conectados possuem um "teto térmico" diário. O sistema expande o limite de disparos linearmente do dia 1 ao dia 14, gerando trocas orgânicas de mensagens de forma gradativa para aquecer o chip.
3.  **Sessões Cruzadas (Cross-Warmup):** Chips da mesma base de dados entram em sessões de diálogo bidirecional aleatórias, forçando conversas que ativam o histórico "inbound/outbound" exigido pelos algoritmos da Meta para gerar pontuação de confiança (Health Score).

---

## 💎 3. Destaque de Engenharia: Aquecimento Avançado por Nicho e Interação em Grupos

Implementada com rigor matemático e algoritmos estatísticos, esta funcionalidade converte o chip de "um robô de envio" em um **membro socialmente ativo da rede mundial do WhatsApp**.

### 🔬 3.1 DuckDuckGo Scraper (Busca Sem APIs)
Para evitar custos extras e dependência de chaves de API de terceiros, criamos um mecanismo de varredura de HTML cru no DuckDuckGo usando **Axios** e expressões regulares determinísticas:
*   **Query Utilizada:** `site:chat.whatsapp.com "nome_do_nicho"`
*   **RegEx de Extração:** `chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9]{20,})`
*   **Entropy (Entropia):** O cache de links coletados sofre mutações aleatórias (*shuffling*) antes de ser gravado na instância, garantindo que dois chips configurados no mesmo nicho não entrem necessariamente na mesma sequência de grupos.

### 📰 3.2 Google News RSS Content Curator
Uma rotina que faz buscas dinâmicas em fontes jornalísticas reais:
*   Consome o RSS XML público do Google News baseado no termo do nicho: `https://news.google.com/rss/search?q={niche}&hl=pt-BR`.
*   Um parser regex isola as tags `<title>` e `<link>`.
*   A IA redige uma chamada de compartilhamento que emula um usuário comum dizendo "vcs viram isso?" ou "materia interessante", e posta a URL real no grupo, ativando a geração de *link-previews* nativos do WhatsApp.

### 🧠 3.3 Interação Reativa Inteligente (Escuta em Tempo Real)
Localizado estrategicamente nos webhooks receptores (`EvolutionWebhookController`), este gatilho intercepta mensagens enviadas por terceiros dentro dos grupos capturados:
*   **Probabilidade Orgânica:** Aplica uma probabilidade baseada em peso (*Weighted Probability*). Mensagens comuns do grupo têm **4%** de chance de resposta. Se a mensagem contiver palavras contidas no nicho, o gatilho sobe para **15%**.
*   **Veto Antirrepetição:** O sistema impede que o chip se torne o "chato do grupo", limitando sua participação a níveis saudáveis e esparsos.

---

## 🎛️ 4. Flow Builder e Lógica de Respostas Dinâmicas

O WhatSaas possui um construtor visual de fluxos de atendimento baseado em Grafos Direcionados Acíclicos (DAG):
1.  **Execuções Salvas:** Cada conversa com um contato abre uma entrada na tabela `flow_executions` que persiste o estado atual da árvore (`currentNodeId`).
2.  **Variáveis de Contexto:** Respostas fornecidas pelo contato são armazenadas dinamicamente dentro da tabela, podendo ser reinjetadas em nós subsequentes de envio para personalizar mensagens (ex: `"Olá, {name}!"`).
3.  **Event Tracking:** Atualizações de status enviadas pela API do WhatsApp (`DELIVERY_ACK` / `READ`) são propagadas instantaneamente via **EventsGateway (WebSockets)** de volta ao frontend para colorir os indicadores visuais de lido/entregue.

---

## 🔐 5. Camadas de Segurança e Operações de Resiliência

Durante a estruturação e manutenção do ambiente, aplicamos as seguintes camadas arquiteturais críticas:

### 🛡️ 5.1 Proteção Corporativa Multi-Tenant (TenantGuard)
Implementado globalmente nos controladores sensíveis, o `TenantGuard` realiza varreduras SQL de verificação em tempo real para garantir que:
*   Um usuário do inquilino A jamais acesse mensagens, campanhas ou chips do inquilino B.
*   Bloqueios automáticos de API e dashboard sejam efetuados caso o plano financeiro da empresa mude para inativo na tabela `Tenant`.

### ⚙️ 5.2 Bypassing de Conflito WSL2 / Docker Desktop
Configuração avançada para contornar colisões de rede no ambiente operacional Windows:
*   **Problema Detectado:** O Docker Desktop no Windows mapeia portas para IPv4 (`0.0.0.0`), enquanto o utilitário `wslrelay.exe` força escuta nas mesmas portas no IPv6 loopback (`[::1]`). Node.js moderno prioriza IPv6, resultando em quedas cíclicas de conexão (`ECONNRESET`) com o Banco de Dados e Redis.
*   **Solução Aplicada:** Injeção da variável de ambiente nativa de rede do Node.js na inicialização:  
    `NODE_OPTIONS="--dns-result-order=ipv4first"`
    *Isso força o backend NestJS a preferir e travar a comunicação estritamente no IPv4 loopback (`127.0.0.1`), ignorando colisões do WSL e mantendo a conexão a bancos estável indefinidamente.*

---

## 🔮 6. Conclusão

O ecossistema WhatSaas representa uma fusão de engenharia de software contemporânea e técnicas avançadas de simulação de comportamento. A flexibilidade de seu backend modular, somada à agilidade de suas engines de borda de WhatsApp e o poder generativo da OpenAI, posicionam esta arquitetura como um ativo de altíssima confiabilidade operacional.

**Documento atualizado em: 13 de Maio de 2026**  
**Status do Sistema: Operação Estável e Saudável 🟢**
