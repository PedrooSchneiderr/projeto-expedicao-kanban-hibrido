# Constitution - Projeto Expedição Kanban

Este documento estabelece os princípios fundamentais e as diretrizes não negociáveis para o sistema de gestão de expedição.

## 🛠️ Stack Tecnológica
- **Backend:** Python 3.12 + FastAPI (Assíncrono).
- **Banco de Dados:** SQLite (persistente) com SQLAlchemy ORM.
- **Segurança:** JWT (JSON Web Tokens) + Passlib (Bcrypt).
- **Real-Time:** WebSockets para chat, atualizações de cards e notificações.
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Design:** Tailwind CSS (CDN), Tema Dark/Slate Moderno.

## 🔐 Regras de Segurança e Acesso
- **Domínio Restrito:** Apenas e-mails `@tspddevs.com.br` são permitidos.
- **Hierarquia de Roles:**
  - **Superadmin (Pedro):** Único com poder de promover/rebaixar administradores.
  - **Admin:** Gestão de usuários e BI.
  - **Operator:** Operação de Kanban e Chat.
- **Aprovação Manual:** Novos usuários entram como "Pendente" e requerem ativação administrativa.
- **Ofuscação:** Mensagens de erro genéricas para evitar engenharia reversa.

## ⏱️ Regras de Negócio e CRM
- **Dicionário Global:** Propriedades customizadas são globais; uma vez criadas, podem ser usadas em qualquer ticket.
- **Validação Mandatória:** Campos marcados como obrigatórios impedem o salvamento e a transição de etapa se vazios.
- **Retenção:** Pedidos arquivados são mantidos por 30 dias.
- **Auditoria:** Log imutável de todas as ações (`order_audit_logs`) e histórico final (`order_history_log`).

## 🎨 Interface e Experiência (UX/UI)
- **Visual High-Tech:** Focado em alta densidade de informação sem poluição visual.
- **Drawer Lateral:** Painel de 900px para visualização rica e edição profunda.
- **BI Ultra-Wide:** Dashboard em tela cheia para monitoramento de KPIs em tempo real.
- **Notificações:** Badge visual (ponto vermelho) no ícone de chat para novas mensagens.
