# Technical Implementation Plan - Projeto Expedição Kanban

## 1. Arquitetura de Dados
- **Refatoração do Modelo Order:** Substituição de `custom_fields` genéricos por `custom_field_values` (JSON list de referências) e `custom_field_definitions` (Tabela mestre).
- **Persistência de Rich Text:** Armazenamento de HTML gerado pelo Quill.js no SQLite com sanitização básica.
- **Campos de Cliente:** Adição física de colunas `client_phone` e `client_email` no schema.

## 2. Lógica de Validação (Backend)
- **Middleware de Mandatory Fields:** Implementação no `PATCH /orders` que cruza os valores enviados com a tabela de definições para garantir preenchimento de campos obrigatórios.
- **Roteamento de WebSocket:** Melhoria no broadcast para distinguir mensagens privadas (`recipient_id`) e atualizar badges no frontend.

## 3. Frontend e UI/UX
- **Integração Quill.js:** Injeção dinâmica de instâncias do editor em campos do tipo `observation`.
- **Navegação SPA:** Sistema de abas (`tab-system`) com persistência de estado e redirecionamento de links `#ID`.
- **Layout Adaptativo:** CSS Flexbox e Grid para garantir que o BI se expanda em monitores grandes e as fontes se ajustem automaticamente.

## 4. Auditoria e Integridade
- **Logs Automáticos:** Gatilhos nos endpoints de PATCH para registrar alterações de campos específicos no `OrderAuditLog`.
- **Seed Estruturado:** Script de carga que não apenas gera cards, mas também popula o dicionário global de campos para teste imediato.
