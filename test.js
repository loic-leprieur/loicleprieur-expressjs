// test-bodyparser.js
const express = require('express');
const app = express();
const port = 3005; // Un port différent pour éviter les conflits

// 1. Middleware pour parser le JSON
app.use(express.json());

// 2. Une route POST simple pour tester
app.post('/test', (req, res) => {
  console.log('--- REQUÊTE SUR /test ---');
  console.log('Headers reçus:', JSON.stringify(req.headers, null, 2));
  console.log('req.body reçu:', req.body);

  if (req.body && req.body.message) {
    res.status(200).json({
      message: "Données reçues avec succès !",
      dataRecue: req.body
    });
  } else {
    res.status(400).json({
      message: "Le corps de la requête est vide ou le champ 'message' est manquant.",
      bodyRecu: req.body // Pour voir ce qui a été reçu
    });
  }
});

app.listen(port, () => {
  console.log(`Serveur de test démarré sur http://localhost:${port}`);
  console.log(`Essayez : curl -X POST http://localhost:${port}/test -H "Content-Type: application/json" -d '{"message":"Bonjour"}'`);
});