const API_URL = `${window.location.protocol}//${window.location.host}`;
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const showSignup = document.getElementById("show-signup");
    const showLogin = document.getElementById("show-login");
    const logoutBtn = document.getElementById("logout-btn");

    if (showSignup) { showSignup.onclick = (e) => { e.preventDefault(); loginForm.classList.add("hidden"); signupForm.classList.remove("hidden"); }; }
    if (showLogin) { showLogin.onclick = (e) => { e.preventDefault(); signupForm.classList.add("hidden"); loginForm.classList.remove("hidden"); }; }

    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append("username", document.getElementById("login-username").value);
            formData.append("password", document.getElementById("login-password").value);
            try {
                const res = await fetch(`${API_URL}/login`, { method: "POST", body: formData });
                const data = await res.json();
                if (res.ok) {
                    localStorage.setItem("token", data.access_token);
                    localStorage.setItem("username", data.username);
                    localStorage.setItem("user_id", data.user_id);
                    localStorage.setItem("role", data.role);
                    window.location.href = "dashboard.html";
                } else { alert(data.detail || "Erro"); }
            } catch (err) { alert("Erro de conexão"); }
        };
    }

    if (signupForm) {
        signupForm.onsubmit = async (e) => {
            e.preventDefault();
            const body = {
                username: document.getElementById("signup-username").value,
                email: document.getElementById("signup-email").value,
                password: document.getElementById("signup-password").value
            };
            try {
                const res = await fetch(`${API_URL}/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                if (res.ok) { alert("Solicitação enviada!"); signupForm.classList.add("hidden"); loginForm.classList.remove("hidden"); }
                else { const data = await res.json(); alert(data.detail || "Erro"); }
            } catch (err) { console.error(err); }
        };
    }

    if (logoutBtn) { logoutBtn.onclick = () => { localStorage.clear(); window.location.href = "index.html"; }; }
});
