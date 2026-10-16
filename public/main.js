let currentUser = localStorage.getItem("user_name") || "";
let currentRoomId = null;

const nameInput = document.getElementById("username-input");
const btnSaveName = document.getElementById("btn-save-name");
const nameForm = document.getElementById("name-form");
const userDisplay = document.getElementById("user-display");
const lblUsername = document.getElementById("lbl-username");
const btnEditName = document.getElementById("btn-edit-name");
const systemBanner = document.getElementById("system-banner");
const roomsList = document.getElementById("rooms-list");
const totalFilled = document.getElementById("total-filled");
const userTeamName = document.getElementById("user-team-name");

function initIdentity() {
  if (currentUser) {
    nameForm.classList.add("hidden");
    userDisplay.classList.remove("hidden");
    lblUsername.textContent = currentUser;
  } else {
    nameForm.classList.remove("hidden");
    userDisplay.classList.add("hidden");
  }
}

btnSaveName.addEventListener("click", () => {
  const val = nameInput.value.trim();
  if (!val) return alert("Sila masukkan nama!");
  currentUser = val;
  localStorage.setItem("user_name", currentUser);
  initIdentity();
  fetchState();
});

btnEditName.addEventListener("click", () => {
  localStorage.removeItem("user_name");
  currentUser = "";
  initIdentity();
  fetchState();
});

// Ambil data dari C++ Server secara berkala (polling ringan)
async function fetchState() {
  try {
    const res = await fetch("/api/state");
    const data = await res.json();
    renderState(data);
  } catch (err) {
    systemBanner.textContent = "Terputus dari pelayan...";
  }
}

function renderState(data) {
  // Banner Status
  if (data.status === "waiting") {
    systemBanner.className = "banner banner-waiting";
    systemBanner.textContent = "Menunggu admin memulakan pemilihan...";
  } else if (data.status === "open") {
    systemBanner.className = "banner banner-open";
    systemBanner.textContent = "Pemilihan Dibuka! Sila pilih bilik anda.";
  } else {
    systemBanner.className = "banner banner-locked";
    systemBanner.textContent = "Pemilihan telah dikunci.";
  }

  let totalCount = 0;
  currentRoomId = null;
  roomsList.innerHTML = "";

  data.rooms.forEach(room => {
    totalCount += room.members.length;
    const isMember = currentUser && room.members.includes(currentUser);
    if (isMember) {
      currentRoomId = room.id;
      userTeamName.textContent = room.name;
    }

    const isFull = room.members.length >= room.capacity;
    const pct = (room.members.length / room.capacity) * 100;

    const el = document.createElement("div");
    el.className = `room-card ${isMember ? "active-room" : ""}`;
    el.innerHTML = `
      <div class="room-header">
        <span>${room.name}</span>
        <span>${room.members.length}/${room.capacity}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill ${isFull ? "full" : ""}" style="width: ${pct}%"></div>
      </div>
      <ol class="member-list">
        ${room.members.map(m => `<li>${m}</li>`).join("") || "<i>Kosong</i>"}
      </ol>
      <div>
        ${isMember ? 
          `<button class="btn btn-red full-width" onclick="leaveRoom(${room.id})">Keluar Bilik</button>` :
          `<button class="btn btn-action full-width" 
            ${isFull || data.status !== 'open' || !currentUser ? "disabled" : ""} 
            onclick="joinRoom(${room.id})">${isFull ? "Bilik Penuh" : "Pilih Bilik"}</button>`
        }
      </div>
    `;
    roomsList.appendChild(el);
  });

  if (!currentRoomId) userTeamName.textContent = "Tiada";
  totalFilled.textContent = totalCount;
}

window.joinRoom = async (roomId) => {
  if (!currentUser) return alert("Isi nama dahulu!");
  const res = await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_id: roomId, user: currentUser })
  });
  const result = await res.json();
  if (!result.success) alert(result.message);
  fetchState();
};

window.leaveRoom = async (roomId) => {
  await fetch("/api/leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_id: roomId, user: currentUser })
  });
  fetchState();
};

initIdentity();
setInterval(fetchState, 1000); // Polling setiap 1 saat untuk 100 klien
fetchState();