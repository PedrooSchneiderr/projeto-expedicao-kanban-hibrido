# 📦 Enterprise Kanban - Sistema de Expedição & CRM

![Badge Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)
![Badge FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![Badge Tailwind](https://img.shields.io/badge/TailwindCSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)
![Badge SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite)

Um sistema robusto de gerenciamento de fluxo de trabalho logístico, desenhado para atuar tanto como um Kanban de expedição quanto como um micro-CRM. Desenvolvido com foco em performance (Single Page Application com Vanilla JS), segurança nível empresarial e pronto para integrações com Inteligência Artificial.

## ✨ Funcionalidades Principais (Features)

*   📱 **Interface Mobile-First (Responsiva):** Layout fluido construído com Tailwind CSS. No desktop atua como um painel de alta densidade (Bitrix-style), e no mobile se reorganiza para uso ágil por operadores de campo.
*   💬 **Chat em Tempo Real (WebSockets):** Comunicação global ou direta (1-1) entre os usuários do sistema, sem necessidade de atualizar a página (auto-reconnect ativo).
*   🤖 **Integração com IA (GPT Maker Ready):** Possui *Inbound Webhooks* seguros (bypassing JWT via Path Parameter) para agentes de Inteligência Artificial consumirem os dados da expedição em tempo real.
*   📊 **Business Intelligence (Analytics):** Painel de BI gerando KPIs automáticos: Valor Ativo, Volume de Pedidos, Ticket Médio e Lista de Gargalos (Tickets mais antigos parados).
*   🛡️ **Segurança Blindada:** 
    *   Arquitetura de autenticação via **JWT (JSON Web Tokens)**.
    *   Variáveis de Ambiente para segredos vitais (`SECRET_KEY`).
    *   Proteção contra Injeção SQL e Path Traversal no upload de anexos (UUID rewriting).
    *   Políticas restritas de **CORS**.
*   ⚙️ **Campos Personalizáveis:** Adição dinâmica de Custom Fields (Texto, Numérico, Listas) em tempo de execução sem alterar o esquema do banco.

---

## 🏗️ Arquitetura do Sistema

O projeto adota uma arquitetura desacoplada (Headless API) em um mesmo monorepo:

```text
PROJETO-EXPEDICAO-KANBAN/
│
├── BACKEND/                  # Servidor API (FastAPI)
│   ├── APP/
│   │   ├── main.py           # Rotas da API e Websockets
│   │   ├── models.py         # Modelos de Dados (SQLAlchemy)
│   │   ├── schemas.py        # Pydantic Schemas (Validação)
│   │   ├── database.py       # Configuração do SQLite
│   │   ├── auth.py           # Lógica de Login e Criptografia (JWT)
│   │   └── websocket.py      # Gerenciador de conexões em tempo real
│   ├── requirements.txt      # Dependências do Python
│   └── database.db           # Banco de Dados local
│
├── FRONTEND/                 # Aplicação SPA
│   ├── dashboard.html        # View principal (App)
│   ├── index.html            # View de Autenticação
│   ├── CSS/                  # Estilos Customizados
│   └── JS/
│       ├── app.js            # Lógica do Kanban e UX principal
│       ├── auth.js           # Gestão de Tokens e Sessões
│       ├── chat.js           # Engine de troca de mensagens via WSS
│       └── admin.js          # Controle de usuários e ACL
│
├── start.sh                  # Script automatizado de boot (VENV + Server)
└── run.py                    # Entrypoint do Uvicorn
```

---

## 🔒 Endpoints e APIs Notáveis

A API é auto-documentada via Swagger, acessível em `/docs` com o servidor rodando. Destacamos as principais rotas:

| Método | Endpoint | Descrição | Auth Requirida |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Gera o Token JWT da sessão. | ❌ Não |
| `GET` | `/orders` | Retorna a lista de tickets ativos. | ✅ Sim (JWT) |
| `PATCH`| `/orders/{id}` | Atualiza o status ou dados do ticket. | ✅ Sim (JWT) |
| `WS` | `/ws` | Handshake do túnel WebSocket para o Chat. | ❌ (Validação no Socket) |
| `GET` | `/webhook/gptmaker/tickets/{token}` | Porta dos fundos VIP para robôs de IA (JSON limpo). | 🔑 Sim (Token Fixo) |

---

## 🚀 Como Executar o Projeto Localmente

O ambiente foi desenhado para subir facilmente em distribuições Linux ou Windows via WSL.

1. **Iniciando o Servidor:**
   Apenas execute o arquivo principal, que irá criar a Virtual Environment, instalar as dependências e iniciar o `uvicorn` na porta `8000`:
   ```bash
   bash start.sh
   ```

2. **Acessando no Navegador:**
   Acesse a URL `http://localhost:8000` para abrir a tela de Login.

3. **Expondo para Webhooks / Inteligência Artificial:**
   Para testar chamadas externas (ex: GPT Maker), use o Ngrok em uma segunda aba do terminal:
   ```bash
   ngrok http 8000
   ```
   *(Importante: Quando consumindo via IAs no modo Free do Ngrok, adicione o header `ngrok-skip-browser-warning: true` na ferramenta cliente).*

---

## 🛠️ Tecnologias Empregadas

*   **Backend:** Python 3.12, FastAPI, SQLAlchemy, Pydantic, Passlib (Bcrypt), Uvicorn.
*   **Frontend:** Vanilla JavaScript (ES6+), HTML5 Semântico, Tailwind CSS (via CDN).
*   **Bibliotecas de UI:** Quill.js (Editor Rich Text).
*   **Persistência:** SQLite (Produção Local).

---
*Documentação oficial ("Spec Kit") atualizada conforme os padrões de versionamento do GitHub.*
