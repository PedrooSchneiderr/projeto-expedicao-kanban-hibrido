document.addEventListener("DOMContentLoaded", () => {
    const API_URL = `${window.location.protocol}//${window.location.host}`;
    window.API_URL = API_URL;

    const panel = document.getElementById("detail-panel");
    const overlay = document.getElementById("detail-panel-overlay");
    const closePanelBtn = document.getElementById("close-panel-btn");
    const savePanelBtn = document.getElementById("pnl-save-btn");
    const commentForm = document.getElementById("pnl-comment-form");

    let currentOrderId = null;
    let globalFieldDefinitions = [];
    let currentOrderFieldValues = []; 
    let quillEditors = {};

    // --- TAB SYSTEM ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            const tab = btn.getAttribute('data-tab');
            if (tab === 'chats') {
                const badge = document.getElementById("chat-notification-badge");
                if (badge) badge.classList.add("hidden");
            }
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            const targetTab = document.getElementById(`tab-${tab}`);
            if (targetTab) targetTab.classList.remove('hidden');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('text-blue-500', 'bg-blue-500/10'));
            btn.classList.add('text-blue-500', 'bg-blue-500/10');
            if (tab === 'analytics') loadAnalytics();
            if (tab === 'kanban') refreshKanban();
            const titleEl = document.getElementById('current-view-title');
            if (titleEl) titleEl.textContent = tab.toUpperCase();
            const controls = document.getElementById('kanban-controls');
            if (controls) controls.style.display = (tab === 'kanban') ? 'flex' : 'none';
        };
    });

    // --- CREATE TICKET MODAL ---
    const orderModal = document.getElementById("order-modal");
    const newOrderBtn = document.getElementById("new-order-btn");
    const closeModalBtn = document.getElementById("close-modal");
    const orderForm = document.getElementById("order-form");

    if (newOrderBtn && orderModal) newOrderBtn.onclick = () => orderModal.classList.remove("hidden");
    if (closeModalBtn && orderModal) closeModalBtn.onclick = () => orderModal.classList.add("hidden");

    if (orderForm) {
        orderForm.onsubmit = async (e) => {
            e.preventDefault();
            const body = {
                client_name: document.getElementById("order-client").value,
                client_phone: document.getElementById("order-phone").value,
                client_email: document.getElementById("order-email").value,
                items_list: document.getElementById("order-items").value,
                order_value: parseFloat(document.getElementById("order-value").value),
                priority: document.getElementById("order-priority").value,
                internal_notes: "",
                custom_field_values: "[]"
            };
            try {
                const res = await fetch(`${API_URL}/orders`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                    body: JSON.stringify(body)
                });
                if (res.ok) { orderModal.classList.add("hidden"); orderForm.reset(); refreshKanban(); }
            } catch (err) { alert("Falha na conexão."); }
        };
    }

    // --- KANBAN & CARDS ---
    async function refreshKanban() {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/orders?include_archived=true`, { headers: { "Authorization": `Bearer ${token}` } });
            if (res.ok) { renderOrders(await res.json()); }
        } catch (err) { console.error(err); }
    }
    window.refreshKanban = refreshKanban;

    function renderOrders(orders) {
        document.querySelectorAll(".order-list").forEach(list => list.innerHTML = "");
        orders.forEach(order => {
            const card = createOrderCard(order);
            const col = order.is_archived ? document.querySelector('[data-status="Arquivado"]') : document.querySelector(`[data-status="${order.status}"]`);
            if (col) {
                const list = col.querySelector(".order-list");
                if (list) list.appendChild(card);
            }
        });
        updateCounts(orders);
        setupDragAndDrop();
    }

    function createOrderCard(order) {
        const div = document.createElement("div");
        div.className = "order-card group";
        div.setAttribute("draggable", "true");
        div.setAttribute("data-order-id", order.id);
        const prioColors = { "Urgente": "text-red-500 bg-red-500/10", "Alta": "text-orange-500 bg-orange-500/10", "Normal": "text-blue-400 bg-blue-500/10", "Baixa": "text-slate-500 bg-slate-800" };
        div.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <span class="text-[8px] font-black text-slate-600 bg-slate-900 px-2 py-0.5 rounded border border-darkBorder">#${order.id}</span>
                <span class="text-[8px] font-black px-2 py-0.5 rounded ${prioColors[order.priority] || prioColors.Normal}">${order.priority.toUpperCase()}</span>
            </div>
            <div class="mb-4">
                <h4 class="text-sm font-black text-white truncate group-hover:text-blue-400 transition">${order.client_name}</h4>
                <p class="text-[10px] text-slate-500 italic truncate mt-1">${order.items_list}</p>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-darkBorder/30">
                <div class="flex flex-col"><span class="text-[10px] font-black text-green-500">R$ ${order.order_value.toFixed(2)}</span><span class="text-[8px] font-bold text-slate-600">${new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="edit-btn p-1 bg-blue-600/20 text-blue-500 rounded hover:bg-blue-600 hover:text-white transition"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                    ${!order.is_archived ? `<button class="delete-btn p-1 bg-red-600/20 text-red-500 rounded hover:bg-red-600 hover:text-white transition"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>` : ''}
                </div>
            </div>
        `;
        div.querySelector('.edit-btn').onclick = (e) => { e.stopPropagation(); openSidePanel(order.id); };
        const delBtn = div.querySelector('.delete-btn');
        if (delBtn) delBtn.onclick = async (e) => { 
            e.stopPropagation(); 
            if (confirm("Mover para Arquivados?")) {
                await fetch(`${API_URL}/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ is_archived: true }) });
                refreshKanban();
            }
        };
        div.onclick = () => openSidePanel(order.id);
        return div;
    }

    // --- SIDE PANEL ---
    async function openSidePanel(orderId) {
        currentOrderId = orderId;
        quillEditors = {};
        try {
            const defRes = await fetch(`${API_URL}/admin/fields`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
            globalFieldDefinitions = await defRes.json();
            const res = await fetch(`${API_URL}/orders?include_archived=true`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
            const order = (await res.json()).find(o => o.id === orderId);
            if (!order) return;

            document.getElementById("pnl-id-badge").textContent = `TICKET #00${order.id}`;
            document.getElementById("pnl-client-input").value = order.client_name || "";
            document.getElementById("pnl-phone-input").value = order.client_phone || "";
            document.getElementById("pnl-email-input").value = order.client_email || "";
            document.getElementById("pnl-priority-select").value = order.priority;
            document.getElementById("pnl-value-input").value = order.order_value;
            document.getElementById("pnl-items-input").value = order.items_list;
            document.getElementById("pnl-notes-input").value = order.internal_notes || "";

            try { currentOrderFieldValues = order.custom_field_values ? JSON.parse(order.custom_field_values) : []; } 
            catch { currentOrderFieldValues = []; }
            renderCustomFields();
            renderActivity(order);
            panel.classList.add("open"); overlay.classList.add("open");
        } catch (err) { console.error(err); }
    }
    window.openOrderDetail = openSidePanel;

    function renderCustomFields() {
        const container = document.getElementById("pnl-custom-fields");
        if (!container) return;
        container.innerHTML = "";
        const activeIds = currentOrderFieldValues.map(v => v.id);
        const fieldsToShow = globalFieldDefinitions.filter(d => activeIds.includes(d.id) || d.is_mandatory || d.is_default);

        fieldsToShow.forEach((def) => {
            const valObj = currentOrderFieldValues.find(v => v.id === def.id) || { id: def.id, value: "", attachments: [] };
            const div = document.createElement("div");
            div.className = `flex flex-col bg-slate-900 border ${def.is_mandatory ? 'border-blue-500/50' : 'border-darkBorder'} rounded-xl p-4 space-y-3`;
            let inputHtml = "";
            const fieldId = `cf-input-${def.id}`;
            
            if (def.type === 'numeric') {
                inputHtml = `<input type="number" id="${fieldId}" value="${valObj.value}" class="bg-slate-950 border border-darkBorder rounded-lg px-3 py-2 text-xs text-white" onchange="window.updateFieldVal(${def.id}, this.value)">`;
            } else if (def.type === 'list') {
                const options = def.options ? def.options.split(',') : [];
                inputHtml = `<select id="${fieldId}" class="bg-slate-950 border border-darkBorder rounded-lg px-3 py-2 text-xs text-white" onchange="window.updateFieldVal(${def.id}, this.value)">
                    <option value="">Selecionar...</option>${options.map(opt => `<option value="${opt.trim()}" ${valObj.value == opt.trim() ? 'selected' : ''}>${opt.trim()}</option>`).join('')}
                </select>`;
            } else if (def.type === 'observation') {
                inputHtml = `
                    <div id="editor-${def.id}" class="bg-slate-950 rounded-lg text-white min-h-[100px] border border-darkBorder"></div>
                    <div class="flex items-center space-x-4 pt-2">
                        <label class="text-[8px] font-black text-blue-500 cursor-pointer hover:underline uppercase">📎 Anexar Arquivo<input type="file" class="hidden" onchange="window.attachFileToField(${def.id}, this.files[0])"></label>
                        <div id="file-list-${def.id}" class="flex flex-wrap gap-2">
                            ${(valObj.attachments || []).map(f => `<a href="${f.url}" target="_blank" class="bg-slate-800 text-[8px] px-2 py-1 rounded border border-darkBorder flex items-center text-blue-400 hover:text-blue-300">${f.name} <button class="ml-1 text-red-500" onclick="event.preventDefault(); window.removeFieldFile(${def.id}, '${f.name}')">×</button></a>`).join('')}
                        </div>
                    </div>`;
            }

            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="text-[9px] font-black ${def.is_mandatory ? 'text-blue-400' : 'text-slate-500'} uppercase tracking-tighter">${def.key} ${def.is_mandatory ? '(OBRIGATÓRIO)' : ''}</span>
                    <button class="text-slate-600 hover:text-red-500 font-black text-[8px]" onclick="window.hideField(${def.id})">OCULTAR</button>
                </div>${inputHtml}`;
            container.appendChild(div);

            if (def.type === 'observation') {
                setTimeout(() => {
                    const quill = new Quill(`#editor-${def.id}`, { theme: 'snow', modules: { toolbar: [['bold', 'italic', 'underline'], [{ 'color': [] }], ['clean']] } });
                    quill.root.innerHTML = valObj.value || "";
                    quill.on('text-change', () => { window.updateFieldVal(def.id, quill.root.innerHTML); });
                    quillEditors[def.id] = quill;
                }, 10);
            }
        });

        const hiddenFields = globalFieldDefinitions.filter(d => !fieldsToShow.map(f => f.id).includes(d.id));
        if (hiddenFields.length > 0) {
            const optDiv = document.createElement("div");
            optDiv.className = "pt-4 border-t border-darkBorder/30";
            optDiv.innerHTML = `<p class="text-[8px] font-black text-slate-600 mb-2 uppercase">Adicionar do Dicionário CRM</p><div class="flex gap-2"><select id="hidden-fields-select" class="flex-1 bg-slate-900 border border-darkBorder rounded-lg px-3 py-2 text-[10px] text-white"><option value="">Selecionar campo...</option>${hiddenFields.map(hf => `<option value="${hf.id}">${hf.key} (${hf.type})</option>`).join('')}</select><button onclick="window.addFieldFromDict()" class="bg-slate-800 text-white px-3 py-2 rounded-lg text-[10px] font-black">ADICIONAR</button></div>`;
            container.appendChild(optDiv);
        }
    }

    window.updateFieldVal = (id, val) => {
        let obj = currentOrderFieldValues.find(v => v.id === id);
        if (obj) obj.value = val;
        else currentOrderFieldValues.push({ id, value: val, attachments: [] });
    };

    window.attachFileToField = async (id, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await fetch(`${API_URL}/upload`, { method: "POST", headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: formData });
            if (res.ok) {
                const data = await res.json();
                let obj = currentOrderFieldValues.find(v => v.id === id);
                if (!obj) { obj = { id, value: "", attachments: [] }; currentOrderFieldValues.push(obj); }
                if (!obj.attachments) obj.attachments = [];
                obj.attachments.push({ name: data.filename, url: data.url });
                renderCustomFields();
            }
        } catch (err) { alert("Erro no upload."); }
    };

    window.removeFieldFile = (id, fileName) => {
        let obj = currentOrderFieldValues.find(v => v.id === id);
        if (obj) { obj.attachments = obj.attachments.filter(f => f.name !== fileName); renderCustomFields(); }
    };

    window.hideField = (id) => { currentOrderFieldValues = currentOrderFieldValues.filter(v => v.id !== id); renderCustomFields(); };
    window.addFieldFromDict = () => { const id = parseInt(document.getElementById("hidden-fields-select").value); if (id) { window.updateFieldVal(id, ""); renderCustomFields(); } };

    const addCfBtn = document.getElementById("add-custom-field-btn");
    if (addCfBtn) {
        addCfBtn.onclick = async () => {
            const k = document.getElementById("custom-field-key").value.trim();
            const t = document.getElementById("custom-field-type").value;
            if (k) {
                let options = null; if (t === 'list') options = prompt("Opções da lista (virgula):");
                const isMandatory = confirm("Campo OBRIGATÓRIO?");
                const res = await fetch(`${API_URL}/admin/fields`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ key: k, type: t, options, is_mandatory: isMandatory, is_default: true }) });
                if (res.ok) { const newDef = await res.json(); globalFieldDefinitions.push(newDef); window.updateFieldVal(newDef.id, ""); document.getElementById("custom-field-key").value = ""; renderCustomFields(); }
            }
        };
    }

    function renderActivity(order) {
        const list = document.getElementById("pnl-activity-list");
        if (!list) return;
        list.innerHTML = "";
        let events = [];
        if (order.audit_trail) order.audit_trail.forEach(a => events.push({ ...a, type: 'audit' }));
        if (order.comments) order.comments.forEach(c => events.push({ ...c, type: 'comment' }));
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        events.forEach(ev => {
            const div = document.createElement("div");
            const date = new Date(ev.timestamp).toLocaleString('pt-BR');
            if (ev.type === 'audit') { div.className = "audit-item"; div.innerHTML = `<p class="text-[9px] font-black text-blue-400 uppercase mb-1">${ev.username} • ${date}</p><p class="text-xs text-slate-300">${ev.action}</p>`; }
            else { div.className = "comment-bubble"; div.innerHTML = `<p class="text-[9px] font-black text-green-400 uppercase mb-2">${ev.username} • ${date}</p><p class="text-xs text-slate-100">${ev.comment}</p>`; }
            list.appendChild(div);
        });
    }

    if (savePanelBtn) {
        savePanelBtn.onclick = async () => {
            const body = {
                client_name: document.getElementById("pnl-client-input").value,
                client_phone: document.getElementById("pnl-phone-input").value,
                client_email: document.getElementById("pnl-email-input").value,
                priority: document.getElementById("pnl-priority-select").value,
                order_value: parseFloat(document.getElementById("pnl-value-input").value),
                items_list: document.getElementById("pnl-items-input").value,
                internal_notes: document.getElementById("pnl-notes-input").value,
                custom_field_values: JSON.stringify(currentOrderFieldValues)
            };
            const res = await fetch(`${API_URL}/orders/${currentOrderId}`, { method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify(body) });
            if (res.ok) { panel.classList.remove("open"); overlay.classList.remove("open"); refreshKanban(); }
            else { const err = await res.json(); alert(err.detail || "Erro ao salvar."); }
        };
    }

    if (commentForm) {
        commentForm.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById("pnl-comment-input");
            if (!input || !input.value.trim()) return;
            await fetch(`${API_URL}/orders/${currentOrderId}/comments`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ comment: input.value }) });
            input.value = ""; openSidePanel(currentOrderId);
        };
    }

    if (closePanelBtn) closePanelBtn.onclick = () => { panel.classList.remove("open"); overlay.classList.remove("open"); };
    if (overlay) overlay.onclick = () => { panel.classList.remove("open"); overlay.classList.remove("open"); };

    async function loadAnalytics() {
        try {
            const res = await fetch(`${API_URL}/admin/analytics`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
            if (res.ok) {
                const data = await res.json();
                document.getElementById("stats-total-value").textContent = `R$ ${data.total_active_value.toLocaleString('pt-BR')}`;
                document.getElementById("stats-total-orders").textContent = data.total_orders;
                const avgTicket = data.total_orders > 0 ? (data.total_active_value / data.total_orders) : 0;
                const ticketEl = document.getElementById("stats-avg-ticket");
                if (ticketEl) ticketEl.textContent = `R$ ${avgTicket.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                const bnEl = document.getElementById("stats-bottleneck");
                if (bnEl) bnEl.textContent = data.bottleneck || "Estável";
                const list = document.getElementById("analytics-islands-list");
                list.innerHTML = "";
                data.islands.forEach(isl => {
                    const row = document.createElement("div"); row.className = "flex justify-between items-center p-4 bg-slate-900 rounded-2xl border border-darkBorder";
                    row.innerHTML = `<span class="font-black text-[9px] text-slate-400 uppercase">${isl.status}</span><div class="text-right"><p class="text-white font-black text-sm">${isl.count} Pedidos</p><p class="text-green-500 font-bold text-xs">R$ ${isl.value.toLocaleString('pt-BR')}</p></div>`;
                    list.appendChild(row);
                });
                const agingList = document.getElementById("analytics-aging-list");
                agingList.innerHTML = "";
                Object.entries(data.aging).forEach(([island, orders]) => {
                    if (orders.length === 0) return;
                    const group = document.createElement("div"); group.className = "space-y-2";
                    group.innerHTML = `<h5 class="text-[8px] font-black text-blue-500 uppercase tracking-widest border-b border-darkBorder pb-1">${island}</h5>`;
                    orders.forEach(o => {
                        const item = document.createElement("div"); item.className = "flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800 hover:border-blue-500/50 transition cursor-pointer";
                        item.onclick = () => { const kanbanBtn = document.querySelector('[data-tab="kanban"]'); if (kanbanBtn) kanbanBtn.click(); setTimeout(() => openSidePanel(o.id), 100); };
                        const time = new Date(o.since).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
                        item.innerHTML = `<div class="flex flex-col"><span class="text-[10px] font-black text-white">#${o.id} ${o.client}</span><span class="text-[8px] text-slate-500 font-bold uppercase">Parado: ${time}</span></div><svg class="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>`;
                        group.appendChild(item);
                    });
                    agingList.appendChild(group);
                });
            }
        } catch (err) { console.error(err); }
    }

    function updateCounts(orders) {
        ["Aguardando Separação", "Em Separação", "Conferência", "Pronto para Envio"].forEach(s => {
            const count = orders.filter(o => o.status === s && !o.is_archived).length;
            const b = document.querySelector(`[data-status="${s}"] .count-badge`);
            if (b) b.textContent = count;
        });
    }

    function setupDragAndDrop() {
        document.querySelectorAll('.order-card').forEach(c => {
            c.ondragstart = (e) => { e.dataTransfer.setData("orderId", c.dataset.orderId); c.classList.add("opacity-20"); };
            c.ondragend = () => c.classList.remove("opacity-20");
        });
        document.querySelectorAll('.kanban-column').forEach(col => {
            col.ondragover = (e) => e.preventDefault();
            col.ondrop = async (e) => {
                const id = e.dataTransfer.getData("orderId");
                const status = col.dataset.status;
                if (!id || !status) return;
                await fetch(`${API_URL}/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify(status === "Arquivado" ? { is_archived: true } : { status }) });
                refreshKanban();
            };
        });
    }

    const toggleArchiveBtn = document.getElementById("toggle-archive-btn");
    if (toggleArchiveBtn) { toggleArchiveBtn.onclick = () => { const arcCol = document.getElementById("archive-column"); if (arcCol) { arcCol.classList.toggle("hidden"); toggleArchiveBtn.textContent = arcCol.classList.contains("hidden") ? "Ver Arquivados" : "Ocultar Arquivados"; refreshKanban(); } }; }

    // --- INLINE KANBAN SEARCH ---
    const inlineSearchInput = document.getElementById("inline-search-input");
    if (inlineSearchInput) {
        inlineSearchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll(".order-card");
            
            cards.forEach(card => {
                // We extract text content from the card to filter
                const textContent = card.innerText.toLowerCase();
                if (query === "" || textContent.includes(query)) {
                    card.style.display = "block";
                } else {
                    card.style.display = "none";
                }
            });
        });
    }

    if (localStorage.getItem("token")) {
        refreshKanban();
        const username = localStorage.getItem("username");
        const role = localStorage.getItem("role");
        if (document.getElementById("profile-name")) document.getElementById("profile-name").textContent = username;
        if (document.getElementById("profile-name-big")) document.getElementById("profile-name-big").textContent = username;
        if (document.getElementById("role-display")) document.getElementById("role-display").textContent = role ? role.toUpperCase() : "ATIVO";
        if (role === "admin" || role === "superadmin") { const adminBtn = document.getElementById("admin-tab-btn"); if (adminBtn) adminBtn.classList.remove("hidden"); }
    } else { window.location.href = "index.html"; }
});
