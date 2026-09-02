const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// THIS IS THE KEY CHANGE: Serve files from root instead of 'public'
app.use(express.static(__dirname)); 

const DB_FILE = path.join(__dirname, 'db.json');

// ... rest of your server.js code stays the same ...
// login, signup, socket.io code here

// Also change these 2 lines to point to root
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'app.html')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));