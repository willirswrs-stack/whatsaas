# CHECKLIST DE VALIDAÇÃO FASE 2.5 - WhatSaas
# Status: Em Progresso

## 1. Autenticação e Perfil
- [x] Registro de nova conta (Sign Up)
- [x] Login com credenciais válidas (Sign In)
- [x] Logout
- [x] Proteção de rotas (Tentar acessar dashboard sem login)
- [x] Persistência de sessão (Reload da página mantém logado)

## 2. Gerenciamento de Instâncias (WhatsApp)
- [x] Listagem de instâncias (vazia inicialmente ou carregada)
- [x] Adicionar Nova Instância
  - [x] Seleção de Provider (Evolution/WAHA)
  - [x] Exibição do QR Code
- [x] Conexão da Instância (Simulação ou Real)
- [x] Status da Instância (Connecting, Open, Close)
- [x] Exclusão de Instância
- [x] **TESTE CRÍTICO FASE 2.5**: Reconexão Automática (PR-07)
  - [x] Simular desconexão -> Verificar se volta sozinho

## 3. Gerenciamento de Contatos
- [x] Criar Contato Manualmente
- [x] Listar Contatos
- [x] Editar Contato
- [x] Excluir Contato
- [x] Importação de CSV (Se disponível)

## 4. Construtor de Fluxos (Flow Builder)
- [ ] Adicionar "Message Node" (Texto Simples)
- [ ] Salvar Fluxo
- [ ] Editar Fluxo existente

## 5. Campanhas e Disparos
- [ ] Criar Nova Campanha
  - [ ] Selecionar Instância
  - [ ] Selecionar Fluxo
  - [ ] Selecionar Contatos/Segmento
- [ ] Agendamento (Imediato vs Futuro)
- [ ] Disparo (Start)
- [ ] Monitoramento em Tempo Real (Socket.io)
  - [ ] Status mudando de PENDING -> SENDING -> SENT/FAILED

## 6. Configurações e Sistema
- [ ] Ajuste de Profile
- [ ] Integração com Evolution API (Verificar API Key salva)

## 7. Performance & UI/UX
- [ ] Carregamento de listas (Paginação)
- [ ] Responsividade Mobile (Menu colapsável)
- [ ] Feedback visual (Toasts de sucesso/erro)
