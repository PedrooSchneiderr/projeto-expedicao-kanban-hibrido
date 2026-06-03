# Functional Specification - Projeto Expedição Kanban

## 1. Módulo de Autenticação e Gestão de Identidade
- **Registro:** Validação obrigatória do sufixo `@tspddevs.com.br`.
- **Status Inicial:** Todo novo usuário é `is_active = False` até aprovação do Superadmin.
- **Superadmin:** Usuário `pedro` com ID visível e controle total de permissões.
- **Login:** Emissão de JWT contendo `role`, `user_id` e `username`.

## 2. Kanban de Expedição (Core)
- **Fluxo de Trabalho:** 4 Ilhas (Aguardando, Separação, Conferência, Expedição).
- **Interatividade:** Drag & Drop nativo e ações rápidas (Editar, Excluir/Arquivar) diretamente no card.
- **Gestão de Visibilidade:** Botão para alternar a exibição da coluna de "Arquivados".
- **Contadores:** Badges em tempo real no topo de cada coluna.

## 3. Gestão de Pedidos (CRM Pro)
- **Dados do Cliente:** Campos para Nome, Telefone e E-mail.
- **Dados do Ticket:** Carga, Valor Financeiro, Prioridade e Notas Internas.
- **Campos Personalizados (Estilo Bitrix24):**
  - **Dicionário Global:** Criação centralizada de propriedades.
  - **Tipagem:** Numérico, Lista (Menu de seleção) e Observação.
  - **Rich Text:** Editor completo (Quill.js) para campos de Observação com suporte a negrito, cores e listas.
  - **Anexos:** Upload de arquivos vinculados diretamente às observações.
  - **Configuração de Formulário:** Adicionar campos do dicionário global ou ocultá-los conforme a necessidade do ticket.
  - **Obrigatoriedade:** Travas de segurança para campos mandatórios.

## 4. Auditoria e Colaboração
- **Timeline de Atividade:** Registro automático de quem alterou o quê e quando (rastreabilidade por ID).
- **Chat Interno:** Seção de comentários dentro de cada ticket.
- **Drawer Lateral:** Expansão lateral de 900px para foco total nos detalhes.

## 5. Comunicação Real-Time (Chat Híbrido)
- **Canais:** Chat Global (Equipe) e Chats Privados (1:1).
- **Marcação Inteligente:** Uso de `#ID` gera links que abrem o ticket correspondente.
- **SISTEMA_BOT:** Notificações de sistema e alertas de movimentação.
- **Notificação de UI:** Badge (ponto vermelho) no botão lateral de Chats para sinalizar novas interações.

## 6. Dashboard Admin (Business Intelligence)
- **Layout:** Redimensionado para ocupação total da tela (Ultra-wide).
- **KPIs Principais:** Faturamento Ativo, Total de Pedidos, Ticket Médio, Fase Crítica (Gargalo), Eficiência e Meta Diária.
- **Distribuição Financeira:** Gráfico/Lista de volume por etapa.
- **Top 5 Antiguidade:** Lista de tickets parados há mais tempo por etapa, com redirecionamento direto para o Kanban.
