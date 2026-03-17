const tuesdayInput = document.getElementById("tuesdayName");
const thursdayInput = document.getElementById("thursdayName");

const playersListTue = document.getElementById("playersListTue");
const waitingListTue = document.getElementById("waitingListTue");
const playersListThu = document.getElementById("playersListThu");
const waitingListThu = document.getElementById("waitingListThu");

async function fetchPlayers(day) {
  const res = await fetch(`/players?day=${day}`);
  const data = await res.json();
  return data;
}

async function renderLists() {
  const tuesday = await fetchPlayers("Tuesday");
  const thursday = await fetchPlayers("Thursday");

  playersListTue.innerHTML = tuesday.players.map(p => `<li>${p}</li>`).join('');
  waitingListTue.innerHTML = tuesday.waiting.map(p => `<li>${p}</li>`).join('');

  playersListThu.innerHTML = thursday.players.map(p => `<li>${p}</li>`).join('');
  waitingListThu.innerHTML = thursday.waiting.map(p => `<li>${p}</li>`).join('');
}

async function registerPlayer(day) {
  const input = day === "Tuesday" ? tuesdayInput : thursdayInput;
  const name = input.value.trim();
  if (!name) return alert("Veuillez entrer un nom");

  const res = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, day })
  });
  const data = await res.json();
  if(data.error) alert(data.error);
  input.value = "";
  renderLists();
}

async function unregisterPlayer(day) {
  const input = day === "Tuesday" ? tuesdayInput : thursdayInput;
  const name = input.value.trim();
  if (!name) return alert("Veuillez entrer un nom");

  const res = await fetch('/unregister', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, day })
  });
  const data = await res.json();
  if(data.error) alert(data.error);
  input.value = "";
  renderLists();
}

document.getElementById("registerTueBtn").addEventListener("click", () => registerPlayer("Tuesday"));
document.getElementById("unregisterTueBtn").addEventListener("click", () => unregisterPlayer("Tuesday"));
document.getElementById("registerThuBtn").addEventListener("click", () => registerPlayer("Thursday"));
document.getElementById("unregisterThuBtn").addEventListener("click", () => unregisterPlayer("Thursday"));

renderLists();