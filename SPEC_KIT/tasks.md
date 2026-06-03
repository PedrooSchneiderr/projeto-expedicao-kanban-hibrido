# Implementation Tasks - Projeto Expedição Kanban (Final)

## Fase 1: Segurança e Acessos
- [x] Criar superuser `pedro@tspddevs.com.br` e `SISTEMA_BOT`.
- [x] Implementar hierarquia `superadmin`, `admin`, `operator`.
- [x] Padronizar mensagens de erro genéricas.

## Fase 2: CRM & Kanban
- [x] Implementar Drag & Drop nativo.
- [x] Adicionar botões de Editar e Excluir direto no Card.
- [x] Implementar campos de Telefone e E-mail do Cliente.
- [x] Criar toggle para ocultar/exibir coluna de Arquivados.

## Fase 3: Dicionário Global de Campos (CRM Style)
- [x] Criar tabela global de definições de campos.
- [x] Implementar tipos: Numérico, Lista e Observação.
- [x] Integrar Quill.js para Rich Text nas observações.
- [x] **Implementar funcionalidade real de Anexos com upload físico para o servidor.**
- [x] Implementar trava de campos obrigatórios no Backend e Frontend.
- [x] Criar seletor de "Campos Ocultos" no Drawer.

## Fase 4: Comunicação
- [x] Corrigir bug de envio de Chat Privado.
- [x] Implementar links `#ID` clicáveis no chat.
- [x] Adicionar Badge de notificação (ponto vermelho) na sidebar.
- [x] Integrar notificações automáticas do `SISTEMA_BOT`.

## Fase 5: Dashboard & Analytics (BI)
- [x] Redimensionar BI para 100% da largura da tela (layout ultra-wide).
- [x] Otimizar tamanhos de fonte para evitar overflow de valores financeiros.
- [x] Implementar KPIs: Faturamento, Ticket Médio, Eficiência e Meta.
- [x] Criar lista "Top 5 Antiguidade" por etapa.
- [x] Implementar redirecionamento automático da lista BI para o Kanban.

## Fase 6: Validação Final
- [x] Testar persistência de dados após reset de banco.
- [x] Validar responsividade do Drawer (900px).
- [x] Confirmar funcionamento do sistema de auditoria (Timeline).
