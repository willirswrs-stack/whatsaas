# 🛠️ WhatSaas: Documentação Técnica de Arquitetura

O **WhatSaas** é uma plataforma de ultra-automação para WhatsApp, projetada com foco em **Antidetect** e escalabilidade horizontal. Diferente de ferramentas comuns, o WhatSaas utiliza uma abordagem híbrida de hardware real (Mobile Farm) e isolamento de software.

## 1. Stack Tecnológica
*   **Backend**: NestJS (Node.js) - Arquitetura modular e tipagem rigorosa com TypeScript.
*   **Frontend**: Next.js 14 - Interface reativa com Tailwind CSS e Framer Motion.
*   **Banco de Dados**: PostgreSQL com TypeORM para gestão de dados relacionais e logs.
*   **Mensageria & Filas**: Redis + BullMQ para processamento assíncrono e controle de throttling (evita picos de envio).
*   **Integrações**: Suporte nativo a Evolution API v2, WAHA e Meta Cloud API (WABA).

## 2. Inovações de Anti-Ban (O Coração do Projeto)
O sistema implementa quatro camadas de proteção exclusiva:

### A. Prevenção Ativa (Active Prevention)
Simula a telemetria de um dispositivo real. Antes de cada envio, o sistema injeta:
*   **Battery Telemetry**: Níveis de bateria que oscilam de forma realista.
*   **Movement Simulation**: Ruído aleatório no acelerômetro para simular que o celular não está estático em uma mesa (comportamento de bot).
*   **Presence Logic**: Simulação de "digitando" ou "gravando áudio" com tempos baseados no tamanho real da mensagem.

### B. Gerenciador de Ciclo de Vida do Chip (Crop Rotation)
Gerencia o chip desde a ativação até a maturidade comercial:
1.  **Registro**: Fase de proteção total.
2.  **Aquecimento (Warmup)**: Rampa de envio progressivo (Gaussian Delays).
3.  **Migração Web**: Transição segura do celular físico para instâncias de servidor.
4.  **Maturidade**: Pronto para disparos de alto volume.

### C. Fazenda de Celulares (Mobile Farm via ADB)
Integração via `adbkit` para gerenciar celulares físicos via USB.
*   Controle remoto de toques e digitação.
*   Monitoramento de saúde do hardware em tempo real no dashboard.

### D. Quebra de Padrão (Pattern Breaker)
Algoritmo que altera a estrutura de cada mensagem:
*   Variação de saudações e emojis.
*   Sinônimos via IA.
*   Hash de conteúdo exclusivo por mensagem para evitar o "fingerprint" da Meta.

## 3. Fluxo de Disparo (Dispatcher)
O motor de disparos utiliza um sistema de **Round-Robin inteligente** que distribui a carga entre múltiplos chips, respeitando os limites individuais de cada um baseados na sua fase de aquecimento.

## 4. Segurança e Monitoramento
*   **Criptografia**: Credenciais de API e Tokens são criptografados no banco de dados.
*   **Observabilidade**: Sentry para rastreio de erros em tempo real.
*   **Resiliência**: Política de retry exponencial para falhas de conexão.
