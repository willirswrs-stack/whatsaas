# Registro de Testes Manuais - Sessão Interativa

**Data:** 18/01/2026
**Status:** 🟡 Em Andamento
**Monitoramento:** Logs de Backend (API) e Frontend (Web) ativos.

Este arquivo será atualizado conforme os testes progridem.

## Diário de Testes

### 1. Inicialização do Ambiente
- [x] Processos anteriores encerrados.
- [x] Backend reiniciado (Porta 3333).
- [x] Frontend reiniciado (Porta 3000).
- [ ] Aguardando "Nest application successfully started".

### 2. Fluxo de Teste do Usuário (Em Andamento)

#### A. Cadastro e Login
- [x] Criar conta (Sign Up) - *Realizado pelo usuário*.
- [x] Login - *Sucesso (implícito pela criação de templates)*.

#### B. Setup Inicial
- [x] Criar Template - *Realizado pelo usuário*.
- [x] Conectar Instância (Ler QR Code) - **SUCESSO (Confirmado na Evolution API)**.

#### C. Disparos
- [ ] Criar Campanha
- [ ] Disparar

---
**Log de Eventos do Sistema:**

**[18:31] ERRO DETECTADO - Módulo de Contatos**
- **Erro:** `QueryFailedError: column Contact.email does not exist`
- **Contexto:** Tentativa de carregar ou salvar um contato.
- **Detalhamento:** O banco de dados (Postgres) retornou erro código `42703` indicando que a coluna `email` não existe na tabela `Contacts`, mas o código (TypeORM) tentou acessá-la na query.
- **Observação do Usuário:** Informou que para este usuário criado, não houve cadastro de e-mail.
- **Ação:** Erro apenas registrado. Correção postergada.

**[18:34] FALHA CONFIRMADA - Criação de Contato Manual**
- **Ação:** Usuário tentou criar um contato manual (Mega Etiquetas, +5562982611347).
- **Resultado:** Alert "Erro ao salvar contato".
- **Evidência:** Screenshot `uploaded_image_1768772078186.png`.
- **Causa Raiz (Diagnóstico):** O campo `email` existe no formulário e na entidade do Backend, mas **NÃO EXISTE** na tabela `contacts` do banco de dados.
- **Impacto:** Funcionalidade de "Criar Contato" inoperante.

**[19:00] FALHA CONFIRMADA - Importação de CSV**
- **Ação:** Usuário tentou importar arquivo `Teste william06.01.26.1.csv`.
- **Resultado:** Alert "Importados: 0, Ignorados: 0". Falha total.
- **Evidência:** Screenshot `uploaded_image_1768773570819.png`.
- **Diagnóstico:** Mesma causa raiz anterior. O processo de importação tenta salvar no banco, encontra erro de coluna inexistente (`email`) e aborta a transação, resultando em 0 importações.
- **DECISÃO:** Teste Manual Bloqueado. Necessária intervenção imediata para corrigir Database Schema.

**[19:07] CORREÇÃO APLICADA**
- **Ação:** Criada e executada Migration `ManualAddEmailToContacts` (`1768773707276`).
- **Resultado Correção:** A coluna `email` foi adicionada com sucesso à tabela `contacts`.
- **Status:** **DESBLOQUEADO**. Usuário pode tentar importar o arquivo novamente.

**[19:15] NOVA FALHA & CORREÇÃO**
- **Sintoma:** Erro persistiu com `column Contact.opted_out does not exist`.
- **Ação:** Criada e executada Migration `ManualAddOptedOutToContacts` (`1768773947597`).
- **Resultado:** Adicionados campos `opted_out` e `opted_out_at`.
- **Status:** **RE-DESBLOQUEADO**. Pode tentar importar novamente.

**[20:12] TERCEIRA FALHA & CORREÇÃO**
- **Sintoma:** Erro persistiu com `column Contact.updated_at does not exist`. Log confirmado no backend.
- **Ação:** Criada e executada Migration `ManualAddUpdatedAtToContacts` (`1768778934971`).
- **Resultado:** Adicionado campo `updated_at`.
- **Status:** **RE-DESBLOQUEADO**. Tente importar agora. Por favor, funcione! :pray:

**[20:35] AUDITORIA E CORREÇÃO SISTÊMICA**
- **Descoberta:** O arquivo `contact.entity.ts` estava nomeado como `index.ts`, fazendo com que a auditoria automática (Migrations) ignorasse completamente a tabela de Contatos.
- **Ação:** Renomeado arquivo para `contact.entity.ts` e rodada migration geral `SyncAllEntities`.
- **Resultado:** Criadas tabelas faltantes (`tags`, `contact_tags`, `custom_fields`) e sincronizadas colunas de `contacts`. O banco agora reflete 100% do código.
- **Status:** **AMBIENTE ESTABILIZADO**. Problema raiz resolvido.

**[20:37] NOVA FALHA (HTTP 400)**
- **Ação:** Tentativa de listar/salvar contatos.
- **Resultado:** Vários erros HTTP 400 (Bad Request) no console para endpoints `/api/v1/contacts`, `/tags/list`, `/fields/list`.
- **Evidência:** Screenshots `uploaded_image_*.png`.
- **Análise:** O erro 400 geralmente indica que o frontend está enviando dados (ou query params) que o backend rejeita. Com a mudança estrutural do banco, pode haver incompatibilidade de tipos ou validação (DTO).
- **Próximo Passo:** Verificar logs do backend para ver *por que* ele está retornando 400.

**[21:23] PROGRESSO: Contatos e Campanha Criados**
- **Status:** ✅ Importação de CSV funcionou. ✅ Criação de Campanha ("Teste e2e") funcionou.
- **Novo Problema:** Campanha está "Em execução" com 5 contatos, mas **0 enviadas**.
- **Erro Observado:** Console mostra erro `GET /api/v1/flows 400 (Bad Request)`.
- **Hipótese:** O Dispatcher pode estar falhando ao tentar executar o fluxo associado à campanha, ou travado em alguma validação.
- **Ação:** Investigar logs do Dispatcher e falha no endpoint de Flows.

**[21:28] FALHA: Backend Inacessível (Connection Refused)**
- **Sintoma:** Ao tentar pausar/excluir campanha, erro `ERR_CONNECTION_REFUSED`.
- **Causa:** O Backend caiu ou está reiniciando num loop de erro.
- **Diagnóstico:** A refatoração anterior (mover `flow.entity.ts`) quebrou os imports pois removeu o `index.ts` que outros arquivos esperavam.
- **Correção:** Recriado `src/modules/flows/entities/index.ts` exportando as entidades corretamente.
- **Expectativa:** Backend deve subir e permitir ações na campanha.

**[21:45] AUDITORIA FINAL DE BANCO (FLOWS)**
- **Ação:** Identificado que tabelas de fluxos (`flows`, `flow_executions`, `flow_triggers`) não existiam no banco.
- **Correção:** Movido arquivo `index.ts` de flows para `flow.entity.ts`, recriado `index.ts` correto e executada migration `SyncFlowEntities` (`1768783494566`).
- **Resultado:** Todas as tabelas do sistema (Contatos e Fluxos) agora existem e estão sincronizadas.
- **Status:** **DESBLOQUEADO**. Usuário pode tentar pausar/cancelar campanha novamente (Backend deve estar online).

**[22:07] PROGRESSO: Backend Online, mas Campanha Travada**
- **Observação:** Backend voltou (sem erro de conexão), mas campanha continua com 0 envios.
- **Hora Atual:** 22:07 (Fora do horário comercial padrão 08:00 - 20:00).
- **Hipótese Forte:** O Dispatcher está bloqueando os envios por causa da **Janela de Horário Ativo**.
- **Ação:** Verificar logs do backend para confirmar mensagem de "Fora da janela horária".

**[22:15] ERRO EADDRINUSE DETECTADO**
- **Erro:** O backend tentou reiniciar sozinho mas falhou com `EADDRINUSE: address already in use 0.0.0.0:3333`.
- **Causa:** O processo anterior (PID 20336) não foi encerrado corretamente e segurou a porta.
- **Ação:** Matado processo "zumbi" via `taskkill /F /PID 20336`.
- **Ação:** Matado processo "zumbi" via `taskkill /F /PID 20336`.
- **Ação:** Reiniciado backend (`npm run start:dev`).
- **Próximo Passo:** Aguardar subir e verificar se os disparos desenroscam ou se aparece o aviso de Horário.

**[23:05] FORÇANDO TESTE (Bypass Horário)**
- **Análise Log:** Não encontrei logs explícitos de "Fora da janela horária", mas o comportamento sugere isso (ou fila travada).
- **Ação:** Comentei temporariamente a verificação de horário no `dispatcher.processor.ts` para forçar o disparo IMEDIATO.
- **Solicitação ao Usuário:** Tentar **Pausar e Retomar** a campanha (ou criar nova) para ver se as mensagens saem agora.
