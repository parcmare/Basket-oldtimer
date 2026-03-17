const express = require('express')
const Database = require('better-sqlite3')
const nodemailer = require('nodemailer')
const Table = require('cli-table3')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// DATABASE
const db = new Database('./players.db')

// CREATE TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS players (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT,
email TEXT UNIQUE,
paid INTEGER DEFAULT 0,
games INTEGER DEFAULT 0
)
`).run()

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'paremarc911@gmail.com',      // ton email Gmail
    pass: 'ioypwjfeodverrus'            // mot de passe d'application Gmail
  }
})

// GET PLAYERS
app.get('/players', (req, res) => {
  const rows = db.prepare("SELECT * FROM players").all()
  res.json(rows)
})

// ADD PLAYER
app.post('/players', (req,res)=>{
  const { name, email } = req.body

  const countPaid = db.prepare("SELECT COUNT(*) AS count FROM players WHERE paid=1").get().count
  const paidValue = countPaid < 2 ? 1 : 0
  const stmt = db.prepare("INSERT INTO players (name,email,paid,games) VALUES (?,?,?,0)")

  try{
    const info = stmt.run(name,email,paidValue)

    // Email ajout
    const mailOptions = {
      from: 'paremarc911@gmail.com',
      to: email,
      subject: 'Bienvenue au Basket OldTimer!',
      text: `Salut ${name},\n\nTu as été ajouté à la ligue Basket OldTimer.\nStatut: ${paidValue === 1 ? "EN MATCH" : "LISTE D'ATTENTE"}.\n\nAmuse-toi bien !`
    }
    transporter.sendMail(mailOptions,(error,info)=>{
      if(error) console.log("Erreur email:", error)
      else console.log('Email envoyé:', info.response)
    })

    res.json({
      id: info.lastInsertRowid,
      name,
      email,
      paid: paidValue === 1 ? "EN MATCH" : "LISTE D'ATTENTE"
    })

  }catch(err){
    res.status(500).json(err)
  }
})

// DELETE PLAYER
app.delete('/players/:id', (req,res)=>{
  const { id } = req.params
  const player = db.prepare("SELECT name,email,paid FROM players WHERE id=?").get(id)
  if(!player) return res.status(404).json({message:"Joueur non trouvé"})

  db.prepare("DELETE FROM players WHERE id=?").run(id)

  // Email suppression
  const mailOptions = {
    from: 'paremarc911@gmail.com',
    to: player.email,
    subject: 'Confirmation de suppression',
    text: `Salut ${player.name},\n\nTu as été supprimé de la ligue Basket OldTimer.\n\nÀ bientôt !`
  }
  transporter.sendMail(mailOptions,(error,info)=>{
    if(error) console.log("Erreur email:", error)
    else console.log('Email de suppression envoyé:', info.response)
  })

  // Rotation automatique
  const countPaid = db.prepare("SELECT COUNT(*) AS count FROM players WHERE paid=1").get().count
  if(countPaid < 2){
    const nextPlayer = db.prepare("SELECT id,name,email FROM players WHERE paid=0 ORDER BY id ASC LIMIT 1").get()
    if(nextPlayer){
      db.prepare("UPDATE players SET paid=1 WHERE id=?").run(nextPlayer.id)

      // Email passage en match
      const mailNext = {
        from:'paremarc911@gmail.com',
        to: nextPlayer.email,
        subject:'Tu es passé en match !',
        text:`Salut ${nextPlayer.name},\n\nTu es maintenant EN MATCH dans la ligue Basket OldTimer !`
      }
      transporter.sendMail(mailNext,(error,info)=>{
        if(error) console.log("Erreur email:", error)
        else console.log('Email passage en match:', info.response)
      })
    }
  }

  res.json({message:"Joueur supprimé"})
})

// RESET TABLE
app.get('/reset', (req,res)=>{
  db.prepare("DELETE FROM players").run()
  res.json({message:"Table players réinitialisée"})
})

// TABLEAU CLI
app.get('/players-table', (req,res)=>{
  const rows = db.prepare("SELECT * FROM players ORDER BY paid DESC,id ASC").all()

  const table = new Table({
    head:['ID','Nom','Email','Jeu'],
    colWidths:[5,20,30,15]
  })

  rows.forEach(player=>{
    table.push([
      player.id,
      player.name,
      player.email,
      player.paid===1?'EN MATCH':'EN ATTENTE'
    ])
  })

  console.log(table.toString())
  res.send('<pre>'+table.toString()+'</pre>')
})

// DASHBOARD WEB
app.get('/dashboard',(req,res)=>{
  res.send(`
<html>
<head>
<title>Basket OldTimer Dashboard</title>
<style>
body{font-family:Arial;background:#f4f4f4;text-align:center}
table{border-collapse:collapse;margin:auto;background:white}
th,td{padding:10px 20px;border:1px solid #ccc}
th{background:#333;color:white}
button{padding:6px 10px;cursor:pointer}
form{margin-bottom:20px}
</style>
</head>
<body>
<h1>Basket OldTimer Dashboard</h1>
<form id="playerForm">
<input placeholder="Nom" id="name" required>
<input placeholder="Email" id="email" required>
<button type="submit">Ajouter joueur</button>
</form>
<table>
<thead>
<tr><th>ID</th><th>Nom</th><th>Email</th><th>Statut</th><th>Action</th></tr>
</thead>
<tbody id="players"></tbody>
</table>
<script>
async function loadPlayers(){
const res=await fetch('/players')
const players=await res.json()
const tbody=document.getElementById('players')
tbody.innerHTML=''
players.forEach(p=>{
const status=p.paid?'EN MATCH':'EN ATTENTE'
tbody.innerHTML+=\`<tr>
<td>\${p.id}</td>
<td>\${p.name}</td>
<td>\${p.email}</td>
<td>\${status}</td>
<td><button onclick="deletePlayer(\${p.id})">Supprimer</button></td>
</tr>\`
})
}
async function deletePlayer(id){
await fetch('/players/'+id,{method:'DELETE'})
loadPlayers()
}
document.getElementById('playerForm').addEventListener('submit',async e=>{
e.preventDefault()
const name=document.getElementById('name').value
const email=document.getElementById('email').value
await fetch('/players',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({name,email})
})
document.getElementById('name').value=''
document.getElementById('email').value=''
loadPlayers()
})
loadPlayers()
</script>
</body>
</html>
`)})

// REDIRECTION / → /dashboard
app.get('/', (req,res)=>{res.redirect('/dashboard')})

// START SERVER
app.listen(PORT,()=>{console.log('Server running on port '+PORT)})