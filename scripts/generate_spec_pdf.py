from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Especificação Técnica - SaaS WhatsApp Marketing Híbrido', 0, 1, 'C')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Página {self.page_no()}', 0, 0, 'C')

    def chapter_title(self, title):
        self.set_font('Arial', 'B', 12)
        self.set_fill_color(200, 220, 255)
        self.cell(0, 6, title, 0, 1, 'L', 1)
        self.ln(4)

    def chapter_body(self, body):
        self.set_font('Arial', '', 11)
        self.multi_cell(0, 5, body)
        self.ln()

pdf = PDF()
pdf.add_page()

# Conteúdo do PDF
specs = {
    "1. Visão Geral": 
    "Sistema SaaS Multi-tenant para automação de WhatsApp, integrando API Oficial (Meta) e API Não-Oficial (Gateway/Instâncias). Foco em alta escalabilidade, gestão de proxies, evasão de bloqueios (Anti-Ban) e geração de conteúdo dinâmica via IA.",
    
    "2. Arquitetura Híbrida":
    "- Backend: Python (FastAPI) ou Node.js (NestJS).\n- Database: PostgreSQL + Redis.\n- Gateway: Evolution API.\n- Suporte simultâneo a campanhas de marketing (Instâncias) e transacionais (Oficial).",
    
    "3. Motor de Disparo (Dispatcher)":
    "- Rodízio de Chips (Load Balancing): Distribuição Round-Robin de envios.\n- Rate Limiting: Delays aleatórios entre envios (ex: 15-60s).\n- Variáveis: Substituição dinâmica ({{nome}}, {{var1}}).\n- Proxy por Instância: Suporte a Socks5 para rotação de IP.",
    
    "4. Integração com IA (LLM)":
    "- Multi-LLM: Suporte a OpenAI, Anthropic e Llama local.\n- Content Spinner: Geração de 20 variações semânticas por mensagem.\n- Objetivo: Evitar detecção de spam por hash de mensagem repetida.",
    
    "5. Sistema de Maturação (Warm-up)":
    "- Simulação Humana: Chips conversam entre si automaticamente.\n- Eventos: Envio de 'digitando...' e 'gravando áudio' proporcional ao texto.\n- Rampa: Aumento progressivo de volume (10 -> 100 msgs/dia).\n- Grupos: Criação e interação em grupos temporários.",
    
    "6. Gestão de Grupos":
    "- Funcionalidades: Scraping de contatos, envio em massa para IDs de grupos, gestão de admin.\n- Criação dinâmica de comunidades.",
    
    "7. Dashboard & UX":
    "- Visualização em tempo real de funil (Enviado -> Entregue -> Lido).\n- Editor de Templates com Preview.\n- Gestão visual de Proxies e status de maturação dos chips."
}

for title, body in specs.items():
    pdf.chapter_title(title)
    pdf.chapter_body(body)

filename = "docs/Especificacao_SaaS_WhatsApp_IA.pdf"
pdf.output(filename)
print(f"PDF gerado com sucesso: {filename}")
