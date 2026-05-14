# PhotoClean AI

**PhotoClean AI** é um Progressive Web App (PWA) moderno e seguro, projetado para ajudar usuários de iPhone e Android a organizar, agrupar e limpar grandes volumes de fotos e vídeos usando Inteligência Artificial local.

## ✨ Funcionalidades Principais

- 🤖 **Análise por IA**: Classificação automática de fotos em categorias (Roupas, Documentos, Prints, etc).
- 🔍 **Busca Inteligente**: Encontre fotos usando linguagem natural (ex: "fotos de vestidos").
- 🗑️ **Lixeira Segura**: Sistema de exclusão em duas etapas para evitar acidentes.
- 📂 **Organização em Coleções**: Agrupe suas memórias por temas ou projetos.
- 🔒 **Privacidade Total**: O processamento é feito localmente no navegador, garantindo que suas fotos permaneçam no seu dispositivo.
- 📱 **Mobile-First**: Experiência otimizada para navegadores móveis (Safari iOS e Chrome Android).

## 🚀 Tecnologias

- **Frontend**: Vite + React + TypeScript
- **Estilo**: Tailwind CSS 4
- **Animações**: Framer Motion
- **Banco de Dados**: IndexedDB (via Dexie.js)
- **Componentes PWA**: vite-plugin-pwa

## 📦 Como rodar o projeto

1. Entre na pasta do projeto:
   ```bash
   cd PhotoCleanAI
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 🛠️ Estrutura de Pastas

- `src/db/`: Configuração do banco de dados IndexedDB.
- `src/services/`: Camada de lógica da IA (atualmenete mockada para demonstração).
- `src/components/`: Componentes UI reutilizáveis.
- `src/pages/`: Telas principais do aplicativo.
- `src/hooks/`: Hooks customizados para gerenciamento de estado.

## 📝 Notas de Implementação

A análise de IA está simulada no arquivo `src/services/ai.ts`. Para produção, você pode integrar bibliotecas como `@tensorflow/tfjs` para análise 100% local ou APIs externas via Web Workers.
