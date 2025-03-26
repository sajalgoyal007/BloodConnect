require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
const port = 3000;

const donorsFile = path.join(__dirname, 'donor.json');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = twilio(accountSid, authToken);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve static files from root directory

// Home Page
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// Serve Register Page
app.get('/register', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'register.html'));
});

// Serve Blood Request Page
app.get('/request', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'request.html'));
});

// Load donor data
const loadDonors = () => {
    if (!fs.existsSync(donorsFile)) return [];
    const data = fs.readFileSync(donorsFile);
    return JSON.parse(data);
};

// Save donor data
const saveDonors = (data) => {
    fs.writeFileSync(donorsFile, JSON.stringify(data, null, 2));
};

// Register Donor
app.post('/register', (req, res) => {
    const { name, bloodGroup, contact, city, age, latitude, longitude } = req.body;

    if (!name || !bloodGroup || !contact || !city || !latitude || !longitude) {
        return res.status(400).send('❌ All fields are required');
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).send('❌ Invalid location coordinates.');
    }

    const donors = loadDonors();
    donors.push({ name, bloodGroup, contact, city, age, latitude: lat, longitude: lon });
    saveDonors(donors);

    res.sendFile(path.resolve(__dirname, 'success_page.html'));
});

// Find Nearest Donors
app.post('/submit_request', (req, res) => {
    const { name, bloodGroup, contact, hospital, latitude, longitude } = req.body;

    if (!name || !bloodGroup || !contact || !hospital || !latitude || !longitude) {
        return res.status(400).send('❌ All fields are required');
    }

    const donors = loadDonors();
    const compatibleDonors = donors.filter((donor) => donor.bloodGroup === bloodGroup);

    if (compatibleDonors.length === 0) {
        return res.send('❌ No matching donors found.');
    }

    res.sendFile(path.resolve(__dirname, 'response.html'));
});

app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});