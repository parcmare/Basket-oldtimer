const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MAX_PLAYERS = 5;

// Listes par défaut
let playersTuesday = [
  { name: "Jean", games: 1, paid: true },
  { name: "Paul", games: 1, paid: true }
];
let waitingTuesday = [
  { name: "Pierre", games: 1, paid: true }
];

let playersThursday = [
  { name: "Alice", games: 1, paid: true },
  { name: "Bob", games: 1, paid: true }
];
let waitingThursday = [
  { name: "Charlie", games: 1, paid: true }
];

// Fonction inscription avec vérification doublon
function register(players, waiting, name) {
  const exists = players.some(p => p.name === name) || waiting.some(p => p.name === name);
  if (exists) return "⚠️ Vous êtes déjà inscrit pour cette journée";

  const player = { name: name, games: 1, paid: true };
  if (players.length < MAX_PLAYERS) {
    players.push(player);
    return "🏀 Inscription confirmée";
  } else {
    waiting.push(player);
    return "⏳ Ajouté à la liste d'attente";
  }
}

// Inscription
app.post('/register', (req, res) => {
  const { name, day } = req.body;
  if (day === "Tuesday") return res.json({ message: register(playersTuesday, waitingTuesday, name) });
  if (day === "Thursday") return res.json({ message: register(playersThursday, waitingThursday, name) });
  res.json({ message: "Jour invalide" });
});

// Désinscription
app.post('/unsubscribe', (req, res) => {
  const { name, day } = req.body;
  let players, waiting;
  if (day === "Tuesday") { players = playersTuesday; waiting = waitingTuesday; }
  else if (day === "Thursday") { players = playersThursday; waiting = waitingThursday; }
  else return res.json({ message: "Jour invalide" });

  players = players.filter(p => p.name !== name);
  if (waiting.length > 0) {
    const promoted = waiting.shift();
    players.push(promoted);
  }

  if (day === "Tuesday") { playersTuesday = players; waitingTuesday = waiting; }
  if (day === "Thursday") { playersThursday = players; waitingThursday = waiting; }

  res.json({ message: "Désinscription effectuée" });
});

// Routes GET pour listes
app.get('/players/:day', (req, res) => {
  if (req.params.day === "Tuesday") return res.json(playersTuesday);
  if (req.params.day === "Thursday") return res.json(playersThursday);
  res.json({ message: "Jour invalide" });
});
app.get('/waiting/:day', (req, res) => {
  if (req.params.day === "Tuesday") return res.json(waitingTuesday);
  if (req.params.day === "Thursday") return res.json(waitingThursday);
  res.json({ message: "Jour invalide" });
});

// Page web avec formulaires et alertes
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>OldTimer Basket</title>
<style>
body { font-family: Arial; max-width: 600px; margin: 20px auto; background: #f4f4f4; padding: 20px; border-radius: 10px; }
h1 { color: #ff4500; text-align: center; }
h2 { color: #333; margin-top: 30px; }
form { margin-bottom: 10px; }
input[type="text"] { padding: 5px; margin-right: 5px; }
button { padding: 5px 10px; background: #ff4500; color: white; border: none; border-radius: 5px; cursor: pointer; }
button:hover { background: #e03e00; }
#alert { padding: 10px; margin-bottom: 10px; border-radius: 5px; display: none; font-weight: bold; }
ul.main { background: #d4edda; padding: 10px; border-radius: 5px; }
ul.waiting { background: #fff3cd; padding: 10px; border-radius: 5px; }
li { margin: 3px 0; }
</style>
</head>
<body>
<div id="alert"></div>
<h1>🏀 OldTimer Basket</h1>

<div class="section">
  <h2>Mardi</h2>
  <form onsubmit="submitForm(event,'Tuesday','register')">
    Nom: <input name="name" id="nameTuesday" required>
    <button type="submit">S'inscrire</button>
  </form>
  <form onsubmit="submitForm(event,'Tuesday','unsubscribe')">
    Nom: <input name="name" id="unsubTuesday" required>
    <button type="submit">Se désinscrire</button>
  </form>
  <h3>Joueurs :</h3>
  <ul id="playersTuesday" class="main"></ul>
  <h3>Liste d'attente :</h3>
  <ul id="waitingTuesday" class="waiting"></ul>
</div>

<div class="section">
  <h2>Jeudi</h2>
  <form onsubmit="submitForm(event,'Thursday','register')">
    Nom: <input name="name" id="nameThursday" required>
    <button type="submit">S'inscrire</button>
  </form>
  <form onsubmit="submitForm(event,'Thursday','unsubscribe')">
    Nom: <input name="name" id="unsubThursday" required>
    <button type="submit">Se désinscrire</button>
  </form>
  <h3>Joueurs :</h3>
  <ul id="playersThursday" class="main"></ul>
  <h3>Liste d'attente :</h3>
  <ul id="waitingThursday" class="waiting"></ul>
</div>

<script>
async function fetchLists(){
  ['Tuesday','Thursday'].forEach(async day=>{
    const players = await fetch('/players/'+day).then(r=>r.json());
    const waiting = await fetch('/waiting/'+day).then(r=>r.json());
    document.getElementById('players'+day).innerHTML = players.map(p=>'<li>'+p.name+'</li>').join('');
    document.getElementById('waiting'+day).innerHTML = waiting.map(p=>'<li>'+p.name+'</li>').join('');
  });
}

async function submitForm(event, day, action){
  event.preventDefault();
  const inputId = action==='register'?'name'+day:'unsub'+day;
  const name = document.getElementById(inputId).value;
  const response = await fetch('/'+action,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name,day})
  }).then(r=>r.json());
  document.getElementById(inputId).value='';
  showAlert(response.message);
  fetchLists();
}

function showAlert(message){
  const alertDiv = document.getElementById('alert');
  alertDiv.textContent = message;
  alertDiv.style.display='block';
  setTimeout(()=>{ alertDiv.style.display='none'; },3000);
}

fetchLists();
</script>
</body>
</html>
  `);
});

app.listen(3000,()=>console.log("Serveur démarré sur http://localhost:3000"));