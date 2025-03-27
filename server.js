require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// ========================
// FIREBASE CONFIGURATION
// ========================
admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle newline characters properly
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });

const db = admin.database();
const donorsRef = db.ref('donors');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ========================
// ROUTES (Keep your existing routes)
// ========================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/request', (req, res) => res.sendFile(path.join(__dirname, 'request.html')));

app.post('/register', async (req, res) => {
  // Keep your existing registration handler
});

app.post('/submit_request', async (req, res) => {
  // Keep your existing request handler
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
