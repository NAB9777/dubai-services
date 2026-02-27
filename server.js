const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'requests.json');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize data file if it doesn't exist
function initializeDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = { requests: [], lastUpdated: new Date().toISOString() };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
}

// Read requests from JSON file
function readRequests() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data file:', error);
        return { requests: [] };
    }
}

// Write requests to JSON file
function writeRequests(data) {
    try {
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing data file:', error);
        return false;
    }
}

// API Routes
app.get('/api/requests', (req, res) => {
    const data = readRequests();
    res.json(data.requests);
});

app.post('/api/requests', (req, res) => {
    const { name, phone, service, location } = req.body;

    // Validation
    if (!name || !phone || !service || !location) {
        return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
    }

    const phoneRegex = /^[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid UAE phone number (9 digits after +971)' });
    }

    // Create new request
    const newRequest = {
        id: Date.now().toString(),
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim(),
        service: service,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    const data = readRequests();
    data.requests.unshift(newRequest);

    if (writeRequests(data)) {
        console.log('🎉 New Service Request Received!');
        console.log(`👤 Name: ${newRequest.name}`);
        console.log(`📞 Phone: +971${newRequest.phone}`);
        console.log(`📍 Location: ${newRequest.location}`);
        console.log(`🔧 Service: ${newRequest.service}`);

        // -------- SEND EMAIL TO DAD AND MYSELF --------
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'nab999777@gmail.com', // your Gmail
                pass: 'YOUR_APP_PASSWORD'    // replace with Gmail App Password
            }
        });

        const mailOptions = {
            from: 'nab999777@gmail.com',       
            to: 'ifthi6633@gmail.com, nab999777@gmail.com', // dad + your Gmail
            subject: `New Dubai Service Request from ${newRequest.name}`,
            text: `Hello,

You have received a new Dubai Service Request:

Name: ${newRequest.name}
Phone: +971${newRequest.phone}
Location: ${newRequest.location}
Service: ${newRequest.service}
Requested At: ${newRequest.createdAt}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('❌ Error sending email:', error);
            } else {
                console.log('✅ Email sent:', info.response);
            }
        });

        // -------- CREATE WHATSAPP LINK --------
        const whatsappMessage = encodeURIComponent(
            `Hello! You have a new Dubai Service Request:\n\nName: ${newRequest.name}\nPhone: +971${newRequest.phone}\nService: ${newRequest.service}\nLocation: ${newRequest.location}\nRequested At: ${newRequest.createdAt}`
        );
        const whatsappNumber = '971585770783'; // dad's WhatsApp number without '+'
        const whatsappURL = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
        console.log(`💬 WhatsApp Link: ${whatsappURL}`);

        // Send response to frontend
        res.json({ success: true, message: 'Service request submitted successfully!', request: newRequest, whatsappLink: whatsappURL });

    } else {
        res.status(500).json({ success: false, message: 'Error saving request. Please try again.' });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
initializeDataFile();
app.listen(PORT, () => {
    console.log('🚀 Dubai Services Server Started!');
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
});