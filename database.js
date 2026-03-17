const sqlite3 = require('sqlite3').verbose();

// créer ou ouvrir la base de données
const db = new sqlite3.Database('./players.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connecté à la base de données SQLite.');
});

// créer la table joueurs si elle n'existe pas
db.run(`
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  games INTEGER DEFAULT 0,
  paid INTEGER DEFAULT 0
)
`);

module.exports = db;