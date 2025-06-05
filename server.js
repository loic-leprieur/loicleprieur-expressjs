// Importer les modules nécessaires
const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors');

// Charger les variables d'environnement depuis .env
require('dotenv').config();

// Initialiser l'application Express
const app = express();
const port = process.env.PORT || 3001;

// Configuration du pool de connexions MariaDB
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 5
});

// Middlewares
app.use(cors());
app.use(express.json());

// --- Définition des Routes CRUD pour /api/messages ---

// CREATE (POST) - Créer un nouvel élément
app.post('/api/messages', async (req, res) => {
  // Utiliser les variables déstructurées de req.body
  const { name, email, phone } = req.body;

  // Validations (vos validations sont bien ici)
  if (!name) {
    return res.status(400).json({ message: "Le champ 'name' est requis." });
  }
  if (!email) {
    return res.status(400).json({ message: "Le champ 'email' est requis." });
  }
  if (!phone) {
    return res.status(400).json({ message: "Le champ 'phone' est requis." });
  }

  // Requête SQL corrigée pour vérifier les doublons :
  // Vérifie si un message identique (même name, email, phone)
  // a été envoyé récemment (dans les 12 dernières heures).
  const checkDuplicateSql = `
    SELECT id FROM messages 
    WHERE email = ? OR name = ? OR phone = ? 
    AND createdAt >= NOW() - INTERVAL 12 HOUR 
    LIMIT 1;`;

  let conn;
  try {
    conn = await pool.getConnection();
    // Utiliser les variables name, email, phone pour la vérification
    const recentDuplicates = await conn.query(checkDuplicateSql, [email, name, phone]);

    if (recentDuplicates.length > 0) {
      // Un doublon récent existe, ne pas insérer
      return res.status(429).json({ message: "Vous avez envoyé un message identique trop récemment." });
    } else {
      // Aucun doublon récent, procéder à l'insertion
      const insertSql = "INSERT INTO messages (name, email, phone) VALUES (?, ?, ?)";
      // Utiliser les variables name, email, phone pour l'insertion
      const result = await conn.query(insertSql, [name, email, phone]);
      
      // Renvoyer une réponse complète avec les données insérées
      return res.status(201).json({ 
        id: Number(result.insertId), 
        name: name,        // Utiliser la variable 'name'
        email: email,      // Utiliser la variable 'email'
        phone: phone       // Utiliser la variable 'phone'
      });
    }
  } catch (err) {
    console.error("Erreur dans POST /api/messages:", err); // Log d'erreur plus spécifique
    // Envoyer une réponse JSON en cas d'erreur
    if (!res.headersSent) { // Vérifier si une réponse n'a pas déjà été envoyée
        return res.status(500).json({ message: "Erreur interne du serveur lors de la création du message.", error: err.message });
    }
  } finally {
    if (conn) conn.release();
  }
}); // <<< Accolade fermante et parenthèse manquantes ici

// READ (GET) - Récupérer tous les messages
app.get('/api/messages', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    // Modifié pour récupérer tous les champs pertinents, y compris email et phone
    const rows = await conn.query("SELECT id, name, email, phone, createdAt FROM messages ORDER BY createdAt DESC");
    res.status(200).json(rows);
  } catch (err) {
    console.error("Erreur GET /api/messages:", err);
    if (!res.headersSent) {
        res.status(500).json({ message: "Erreur lors de la récupération des messages.", error: err.message });
    }
  } finally {
    if (conn) conn.release();
  }
});

// Route par défaut pour tester si le serveur fonctionne
app.get('/api', (req, res) => {
  res.send('Bienvenue sur l\'API loic-leprieur.fr');
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur API démarré sur http://localhost:${port}`);
  if (pool) { // Vérifier si le pool est initialisé avant de logger
    console.log('Pool MariaDB configuré et prêt.');
  } else {
    console.error('Erreur: Pool MariaDB non initialisé !');
  }
});

// Gestionnaire pour la fermeture propre du pool lors de l'arrêt du serveur
process.on('SIGINT', async () => {
  console.log('Fermeture du pool MariaDB...');
  if (pool) { // Vérifier si le pool existe avant d'essayer de le fermer
    await pool.end();
    console.log('Pool MariaDB fermé.');
  }
  process.exit(0);
});