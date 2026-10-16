let token = "";
const authBox = document.getElementById("auth-box");
const adminPanel = document.getElementById("admin-panel");
const adminPass = document.getElementById("admin-pass");
const btnLogin = document.getElementById("btn-login");
const authErr = document.getElementById("auth-err");

btnLogin.addEventListener("click", async () => {
  const password = adminPass.value;
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (data.success) {
    token = data.token;
    authBox.classList.add("hidden");
    adminPanel.classList.remove("hidden");
  } else {
    authErr.classList.remove("hidden");
  }
});

async function setStatus(status) {
  await fetch("/api/admin/status", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({ status })
  });
  alert(`Status diubah kepada: ${status}`);
}

document.getElementById("btn-open").addEventListener("click", () => setStatus("open"));
document.getElementById("btn-lock").addEventListener("click", () => setStatus("locked"));

document.getElementById("btn-reset").addEventListener("click", async () => {
  if (!confirm("Kosongkan semua bilik sekarang?")) return;
  await fetch("/api/admin/reset", {
    method: "POST",
    headers: { "Authorization": token }
  });
  alert("Semua bilik telah dikosongkan.");
});

document.getElementById("btn-export").addEventListener("click", async () => {
  const res = await fetch("/api/state");
  const data = await res.json();
  let text = "📋 *SENARAI PASUKAN*\n\n";
  data.rooms.forEach(r => {
    text += `*${r.name}* (${r.members.length}/${r.capacity})\n`;
    if (r.members.length === 0) text += "- (Kosong)\n";
    else r.members.forEach((m, i) => text += `${i + 1}. ${m}\n`);
    text += "\n";
  });
  navigator.clipboard.writeText(text).then(() => alert("Disalin ke papan keratan!"));
});