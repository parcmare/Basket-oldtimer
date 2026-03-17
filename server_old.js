// server.js - version complète testée
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const Table = require('cli-table3');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// --- Base SQLite ---
const db = new sqlite3.Database('./players.db', (err) => {
  if (err) console.error(err.message);
  else console.log('Connecté à la base de données SQLite.');
});

// Créer la table si elle n'existe pas
db.run(`CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  games INTEGER DEFAULT 0,
  paid INTEGER DEFAULT 0
)`);

// --- Routes ---
app.get('/players', (req, res) => {
  db.all("SELECT * FROM players", [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/players', (req, res) => {
  const { name, email } = req.body;
  db.all("SELECT COUNT(*) AS count FROM players WHERE paid=1", [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    const paidValue = rows[0].count < 2 ? 1 : 0;
    db.run("INSERT INTO players (name,email,games,paid) VALUES (?,?,0,?)",
      [name, email, paidValue],
      function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, name, email, paid: paidValue === 1 ? "en match" : "liste d'attente" });
      });
  });
});

app.delete('/players/:id', (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM players WHERE id=?", [id], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    // Passer un joueur en attente en match si possible
    db.get("SELECT COUNT(*) AS count FROM players WHERE paid=1", [], (err, row) => {
      if (!err && row.count < 2) {
        db.get("SELECT id FROM players WHERE paid=0 ORDER BY id ASC LIMIT 1", [], (err, nextPlayer) => {
          if (!err && nextPlayer) db.run("UPDATE players SET paid=1 WHERE id=?", [nextPlayer.id]);
        });
      }
    });
    res.json({ message: "Joueur supprimé" });
  });
});

app.get('/reset', (req, res) => {
  db.run("DELETE FROM players", [], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Table players réinitialisée" });
  });
});

// --- Tableau visuel des joueurs ---
app.get('/players-table', (req, res) => {
  db.all("SELECT * FROM players ORDER BY paid DESC, id ASC", [], (err, rows) => {
    if (err) return res.status(400).send("Erreur base de données");
    const table = new Table({
      head: ['ID', 'Nom', 'Email', 'Jeu'],
      colWidths: [5, 20, 30, 15]
    });
    rows.forEach(player => {
      table.push([player.id, player.name, player.email, player.paid === 1 ? 'EN MATCH' : 'EN ATTENTE']);
    });
    console.log(table.toString());
    res.send('<pre>' + table.toString() + '</pre>');
  });
});

// --- Démarrage serveur ---
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});