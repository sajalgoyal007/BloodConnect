require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
const port = 3000;

// Updated donor.json path to root directory
const donorsFile = path.join(__dirname, 'donor.json');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = twilio(accountSid, authToken);

// Middleware for parsing request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Haversine Formula to calculate distance (in km)
function getDistance(lat1, lon1, lat2, lon2) {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // Radius of Earth in km

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

// Load donor data
const loadDonors = () => {
    try {
        if (!fs.existsSync(donorsFile)) return [];
        const data = fs.readFileSync(donorsFile);
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading donor data:', error);
        return [];
    }
};

// Save donor data
const saveDonors = (data) => {
    try {
        fs.writeFileSync(donorsFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error saving donor data:', error);
    }
};

// Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve Register Page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Serve Blood Request Page
app.get('/request', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'request.html'));
});

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

    console.log('✅ New donor registered:', { name, bloodGroup });

    res.sendFile(path.join(__dirname, 'public', 'success_page.html'), (err) => {
        if (err) {
            console.error('❌ Error sending success page:', err);
            res.status(500).send('❌ Error loading success page!');
        }
    });
});

// Find Nearest Donors
app.post('/submit_request', (req, res) => {
    const { name, bloodGroup, contact, hospital, latitude, longitude } = req.body;

    if (!name || !bloodGroup || !contact || !hospital || !latitude || !longitude) {
        return res.status(400).send('❌ All fields are required');
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).send('❌ Invalid location coordinates.');
    }

    const donors = loadDonors();

    // Filter compatible blood group donors
    const compatibleDonors = donors.filter((donor) => donor.bloodGroup === bloodGroup);

    if (compatibleDonors.length === 0) {
        console.log('❌ No matching donors found for:', bloodGroup);
        return res.send('❌ No matching donors found.');
    }

    // Calculate distance and sort by nearest
    const nearestDonors = compatibleDonors.map((donor) => {
        const distance = getDistance(lat, lon, parseFloat(donor.latitude), parseFloat(donor.longitude));
        return { ...donor, distance };
    }).sort((a, b) => a.distance - b.distance);

    if (nearestDonors.length > 0) {
        const nearest = nearestDonors[0];
        const message = `🩸 Urgent Blood Request!\nPatient: ${name}\nHospital: ${hospital}\nContact: ${contact}\n\nYou are the nearest ${bloodGroup} donor.`;

        twilioClient.messages.create({
            body: message,
            from: twilioNumber,
            to: nearest.contact,
        }).then(() => {
            console.log(`✅ SMS sent to: ${nearest.contact}`);
            res.sendFile(path.join(__dirname, 'public', 'response.html'), (err) => {
                if (err) {
                    console.error('❌ Error sending response page:', err);
                    res.status(500).send('❌ Error loading response page!');
                }
            });
        }).catch((err) => {
            console.error('❌ Error sending SMS:', err);
            res.status(500).send('❌ Failed to send message.');
        });
    } else {
        console.log('❌ No donors available nearby.');
        res.send('❌ No donors available nearby.');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});