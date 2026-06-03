const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${wsProtocol}//${window.location.host}/ws`;
const CHAT_API_URL = `${window.location.protocol}//${window.location.host}`;
let socket;
let currentRecipientId = null;

function connectWebSocket() {
    console.log("Connecting to WebSocket...");
    socket = new WebSocket(WS_URL);
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === "chat") { handleIncomingChatMessage(data); } 
            else if (data.type === "order_update") { if (window.refreshKanban) window.refreshKanban(); } 
        } catch (e) { console.error("WS Message Error:", e); }
    };
    socket.onclose = () => {
        console.log("WS Closed, reconnecting...");
        setTimeout(connectWebSocket, 3000);
    };
    socket.onerror = (err) => console.error("WS Error:", err);
}

async function loadUsers() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
        const res = await fetch(`${CHAT_API_URL}/users`, { headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) {
            const users = await res.json();
            const listContainer = document.getElementById("chat-user-list");
            if (!listContainer) return;
            
            const myId = parseInt(localStorage.getItem("user_id"));
            const globalItem = listContainer.querySelector('[data-recipient="global"]');
            
            listContainer.innerHTML = ''; 
            if (globalItem) listContainer.appendChild(globalItem);
            
            users.forEach(u => {
                if (u.id !== myId) {
                    const item = document.createElement("div");
                    item.className = "chat-list-item p-4 flex items-center space-x-3 cursor-pointer transition border-b border-darkBorder/30";
                    item.setAttribute("data-recipient", u.id);
                    item.innerHTML = `
                        <div class="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center font-bold text-slate-300 text-sm">${u.username ? u.username[0].toUpperCase() : '?'}</div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-sm truncate">${u.username} <span class="text-[9px] text-slate-500 font-normal">#${u.id}</span></h4>
                            <p class="text-[10px] text-slate-500 truncate uppercase font-bold tracking-widest">${u.role}</p>
                        </div>`;
                    item.onclick = () => selectChat(u.id, u.username);
                    listContainer.appendChild(item);
                }
            });
        }
    } catch (err) { console.error("Load Users Error:", err); }
}

function selectChat(id, name) {
    console.log("Selecting chat:", id, name);
    currentRecipientId = id === "global" ? null : parseInt(id);
    document.querySelectorAll('.chat-list-item').forEach(i => i.classList.remove('bg-blue-500/10', 'border-l-4', 'border-blue-500'));
    
    const activeItem = document.querySelector(`.chat-list-item[data-recipient="${id}"]`);
    if (activeItem) activeItem.classList.add('bg-blue-500/10', 'border-l-4', 'border-blue-500');
    
    const nameEl = document.getElementById("active-chat-name");
    const avatarEl = document.getElementById("active-chat-avatar");
    if (nameEl) nameEl.textContent = id === "global" ? "Chat Global" : name;
    if (avatarEl) avatarEl.textContent = name ? name[0].toUpperCase() : 'G';
    
    loadChatHistory();
}

async function loadChatHistory() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const url = currentRecipientId ? `${CHAT_API_URL}/chat?recipient_id=${currentRecipientId}` : `${CHAT_API_URL}/chat`;
    try {
        const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) {
            const history = await res.json();
            const container = document.getElementById("chat-messages");
            if (container) {
                container.innerHTML = ""; 
                history.forEach(displayChatMessage);
            }
        }
    } catch (err) { console.error("Load Chat History Error:", err); }
}

function displayChatMessage(msg) {
    const container = document.getElementById("chat-messages");
    if (!container) return;
    
    const myId = parseInt(localStorage.getItem("user_id"));
    const isMe = msg.user_id === myId;
    
    const msgDiv = document.createElement("div");
    msgDiv.className = `flex ${isMe ? 'justify-end' : 'justify-start'}`;
    
    const bubbleColor = isMe ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-darkBorder text-slate-200';
    const borderRadius = isMe ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm';
    
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    
    msgDiv.innerHTML = `
        <div class="max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}">
            ${!isMe ? `<p class="text-[10px] text-slate-500 font-bold ml-2 mb-1">${msg.username}</p>` : ''}
            <div class="${bubbleColor} ${borderRadius} p-4 shadow-sm inline-block">
                <p class="text-sm break-words">${msg.message}</p>
            </div>
            <p class="text-[10px] text-slate-500 mt-1 ${isMe ? 'mr-2' : 'ml-2'}">${time}</p>
        </div>
    `;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function handleIncomingChatMessage(data) {
    const myId = parseInt(localStorage.getItem("user_id"));
    if (currentRecipientId === null && data.recipient_id === null) {
        displayChatMessage(data);
    } else if (currentRecipientId !== null) {
        if ((data.user_id === currentRecipientId && data.recipient_id === myId) || 
            (data.user_id === myId && data.recipient_id === currentRecipientId)) {
            displayChatMessage(data);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("Chat.js Loaded");
    const chatForm = document.getElementById("chat-form");
    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("chat-input");
            const message = input.value.trim();
            if (!message) return;
            
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ 
                    type: "chat", 
                    username: localStorage.getItem("username"), 
                    message: message, 
                    recipient_id: currentRecipientId 
                }));
                input.value = "";
            } else {
                alert("🔴 O chat está offline ou desconectado. Pressione F5 para reconectar o WebSocket.");
            }
        });
    }
    if (localStorage.getItem("token")) { 
        connectWebSocket(); 
        loadUsers(); 
        loadChatHistory(); 
    }
});
