const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const nodemailer = require('nodemailer')
const Table = require('cli-table3')

const app = express()
const PORT = 3000

app.use(express.json())

// DATABASE
const db = new sqlite3.Database('./players.db')

// CREATE TABLE
db.run(`
CREATE TABLE IF NOT EXISTS players (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT,
email TEXT UNIQUE,
paid INTEGER DEFAULT 0,
games INTEGER DEFAULT 0
)
`)

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'paremarc911@gmail.com',
    pass: 'ioypwjfeodverrus'
  }
})

// GET PLAYERS
app.get('/players', (req, res) => {
  db.all("SELECT * FROM players", [], (err, rows) => {
    if(err) return res.status(500).json(err)
    res.json(rows)
  })
})

// ADD PLAYER
app.post('/players', (req,res)=>{
  const { name, email } = req.body

  db.all("SELECT COUNT(*) AS count FROM players WHERE paid=1", [], (err, rows) => {
    if(err) return res.status(500).json(err)

    const paidValue = rows[0].count < 2 ? 1 : 0 // max 2 en match
    const sql = `INSERT INTO players (name,email,paid,games) VALUES (?,?,?,0)`

    db.run(sql,[name,email,paidValue], function(err){
      if(err) return res.status(500).json(err)

      // Envoi email automatique
      const mailOptions = {
        from: 'paremarc911@gmail.com',
        to: email,
        subject: 'Bienvenue au Basket OldTimer!',
        text: `Salut ${name},\n\nTu as été ajouté à la ligue Basket OldTimer.\nStatut: ${paidValue === 1 ? "EN MATCH" : "LISTE D'ATTENTE"}.\n\nAmuse-toi bien !`
      }

      transporter.sendMail(mailOptions,(error, info)=>{
        if(error) console.log("Erreur email:", error)
        else console.log('Email envoyé:', info.response)
      })

      res.json({
        id:this.lastID,
        name,
        email,
        paid: paidValue === 1 ? "EN MATCH" : "LISTE D'ATTENTE"
      })
    })
  })
})

// DELETE PLAYER
app.delete('/players/:id', (req,res)=>{
  const { id } = req.params

  // Récupérer le joueur avant suppression
  db.get("SELECT name,email FROM players WHERE id=?", [id], (err, player)=>{
    if(err) return res.status(500).json(err)
    if(!player) return res.status(404).json({message:"Joueur non trouvé"})

    db.run("DELETE FROM players WHERE id=?", [id], function(err){
      if(err) return res.status(500).json(err)

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

      // Passer joueur en match si possible
      db.get("SELECT COUNT(*) AS count FROM players WHERE paid=1", [], (err,row)=>{
        if(!err && row.count < 2){
          db.get("SELECT id FROM players WHERE paid=0 ORDER BY id ASC LIMIT 1", [], (err,nextPlayer)=>{
            if(!err && nextPlayer){
              db.run("UPDATE players SET paid=1 WHERE id=?", [nextPlayer.id])
              // Email joueur passé en match
              db.get("SELECT name,email FROM players WHERE id=?", [nextPlayer.id], (err, playerNext)=>{
                if(!err && playerNext){
                  const mailOptionsNext = {
                    from: 'paremarc911@gmail.com',
                    to: playerNext.email,
                    subject: 'Tu es passé en match !',
                    text: `Salut ${playerNext.name},\n\nTu es maintenant EN MATCH dans la ligue Basket OldTimer !`
                  }
                  transporter.sendMail(mailOptionsNext,(error,info)=>{
                    if(error) console.log("Erreur email:", error)
                    else console.log('Email envoyé pour passage en match:', info.response)
                  })
                }
              })
            }
          })
        }
      })

      res.json({message:"Joueur supprimé"})
    })
  })
})

// RESET TABLE
app.get('/reset', (req,res)=>{
  db.run("DELETE FROM players", [], function(err){
    if(err) return res.status(500).json(err)
    res.json({message:"Table players réinitialisée"})
  })
})

// TABLEAU CLI
app.get('/players-table', (req,res)=>{
  db.all("SELECT * FROM players ORDER BY paid DESC,id ASC", [], (err,rows)=>{
    if(err) return res.status(400).send("Erreur base de données")

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
})

// DASHBOARD WEB (look original, champs se vident après ajout)
app.get('/dashboard', (req,res)=>{
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
// vider les champs
document.getElementById('name').value=''
document.getElementById('email').value=''
loadPlayers()
})
loadPlayers()
</script>
</body>
</html>
`)
})

// START SERVER
app.listen(PORT,()=>{console.log('Server running on http://localhost:'+PORT)})