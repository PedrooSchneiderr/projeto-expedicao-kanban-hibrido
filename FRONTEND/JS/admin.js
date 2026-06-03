const ADMIN_API_URL = `${window.location.protocol}//${window.location.host}`;

async function loadAdminUsers() {
    const table = document.getElementById("admin-user-table");
    if (!table) return;
    try {
        const res = await fetch(`${ADMIN_API_URL}/admin/users`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) {
            const users = await res.json();
            const myRole = localStorage.getItem("role");
            table.innerHTML = "";
            users.forEach(u => {
                if (u.username === "pedro" || u.username === "SISTEMA_BOT") return;
                
                let roleControls = "";
                if (myRole === "superadmin") {
                    const newRole = u.role === "admin" ? "operator" : "admin";
                    roleControls = `<button onclick="toggleUserRole(${u.id}, '${newRole}')" class="ml-2 bg-slate-700 hover:bg-slate-600 text-white text-[9px] font-black px-2 py-1 rounded-lg transition">${u.role === 'admin' ? 'Revogar Admin' : 'Promover Admin'}</button>`;
                }

                const tr = document.createElement("tr");
                tr.className = "hover:bg-slate-900/30 transition";
                tr.innerHTML = `
                    <td class="px-8 py-5 font-bold text-white">${u.username} <span class="text-slate-600 text-[10px] font-normal ml-1">#${u.id}</span></td>
                    <td class="px-8 py-5 text-slate-400">${u.email}</td>
                    <td class="px-8 py-5">
                        <span class="px-2 py-1 rounded-full text-[10px] font-black uppercase ${u.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}">${u.is_active ? 'Ativo' : 'Pendente'}</span>
                        <span class="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-slate-800 text-slate-300 ml-2">${u.role}</span>
                    </td>
                    <td class="px-8 py-5">
                        <button onclick="toggleUserStatus(${u.id}, ${!u.is_active})" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-4 py-2 rounded-lg transition">${u.is_active ? 'Bloquear' : 'Aprovar'}</button>
                        ${roleControls}
                    </td>
                `;
                table.appendChild(tr);
            });
        }
    } catch (err) { console.error("Load Admin Users Error:", err); }
}

async function toggleUserStatus(userId, newStatus) {
    try {
        await fetch(`${ADMIN_API_URL}/admin/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify({ is_active: newStatus })
        });
        loadAdminUsers();
    } catch (err) { console.error("Toggle User Status Error:", err); }
}

async function toggleUserRole(userId, newRole) {
    try {
        await fetch(`${ADMIN_API_URL}/admin/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify({ role: newRole })
        });
        loadAdminUsers();
    } catch (err) { console.error("Toggle User Role Error:", err); }
}

window.toggleUserStatus = toggleUserStatus;
window.toggleUserRole = toggleUserRole;

document.addEventListener("DOMContentLoaded", () => {
    console.log("Admin.js Loaded");
    const role = localStorage.getItem("role");
    if (role === "admin" || role === "superadmin") { loadAdminUsers(); }
});
