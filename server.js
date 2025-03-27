const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;
const donorsFile = path.join(__dirname, 'donors.json');

// Initialize donors.json if it doesn't exist
if (!fs.existsSync(donorsFile)) {
    fs.writeFileSync(donorsFile, '[]');
}

// Helper functions for JSON file operations
const loadDonors = () => {
    try {
        const data = fs.readFileSync(donorsFile, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading donors file:', err);
        return [];
    }
};

const saveDonors = (donors) => {
    fs.writeFileSync(donorsFile, JSON.stringify(donors, null, 2));
};

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/request', (req, res) => res.sendFile(path.join(__dirname, 'request.html')));

// Handle donor registration
app.post('/register', (req, res) => {
    const { name, bloodGroup, contact, city, age, latitude, longitude } = req.body;

    // Basic validation
    if (!name || !bloodGroup || !contact || !city || !latitude || !longitude) {
        return res.status(400).send('❌ All fields are required');
    }

    const donors = loadDonors();
    
    // Add new donor
    donors.push({
        name,
        bloodGroup,
        contact,
        city,
        age: age || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date().toISOString()
    });

    saveDonors(donors);
    res.sendFile(path.join(__dirname, 'success_page.html'));
});

// Handle blood requests
app.post('/submit_request', (req, res) => {
    const { bloodGroup } = req.body;

    if (!bloodGroup) {
        return res.status(400).send('❌ Blood group is required');
    }

    const donors = loadDonors();
    const matchingDonors = donors.filter(donor => donor.bloodGroup === bloodGroup);

    if (matchingDonors.length === 0) {
        return res.send('❌ No matching donors found.');
    }

    res.sendFile(path.join(__dirname, 'response.html'));
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📁 Donor data stored in: ${donorsFile}`);
});