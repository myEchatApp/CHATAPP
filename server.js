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
app.use(express.json({limit: '10mb'})); // for images/base64
app.use(express.static(__dirname));

const DB_FILE = path.join(__dirname, 'db.json');

// Helper to read/write db
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/app.html', (req, res) => res.sendFile(path.join(__dirname, 'app.html')));

// Socket.io Logic
io.on('connection', (socket) => {
  console.log('User connected');
  const db = readDB();
  socket.emit('initData', db);

  socket.on('register', ({email, pass}) => {
    const db = readDB();
    if(db.users.find(u => u.email === email)) return socket.emit('error', 'User exists');
    const newUser = {id: Date.now(), email, pass, bio: '', avatar: '', friends: [], isAdmin: false};
    db.users.push(newUser);
    writeDB(db);
    socket.emit('registerSuccess');
  });

  socket.on('login', ({email, pass}) => {
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.pass === pass);
    if(user) socket.emit('loginSuccess', user);
    else socket.emit('error', 'Invalid credentials');
  });

  socket.on('adminLogin', ({username, password}) => {
    if(username === 'admin' && password === 'admin123') { // change this
      const db = readDB();
      socket.emit('adminSuccess', db);
    } else socket.emit('error', 'Wrong admin');
  });

  socket.on('updateProfile', (user) => {
    const db = readDB();
    const i = db.users.findIndex(u => u.id === user.id);
    if(i!== -1) db.users[i] = user;
    writeDB(db);
    io.emit('usersUpdate', db.users);
  });

  socket.on('newPost', (post) => {
    const db = readDB();
    post.id = Date.now(); post.likes = []; post.comments = [];
    db.posts.unshift(post);
    writeDB(db);
    io.emit('postsUpdate', db.posts);
  });

  socket.on('likePost', ({postId, userId}) => {
    const db = readDB();
    const post = db.posts.find(p => p.id === postId);
    if(post.likes.includes(userId)) post.likes = post.likes.filter(id => id!== userId);
    else post.likes.push(userId);
    writeDB(db);
    io.emit('postsUpdate', db.posts);
  });

  socket.on('commentPost', ({postId, comment}) => {
    const db = readDB();
    const post = db.posts.find(p => p.id === postId);
    post.comments.push(comment);
    writeDB(db);
    io.emit('postsUpdate', db.posts);
  });

  socket.on('newMessage', (msg) => {
    const db = readDB();
    msg.id = Date.now();
    db.messages.push(msg);
    writeDB(db);
    io.emit('message', msg);
  });

  socket.on('sendFriendRequest', ({from, to}) => {
    const db = readDB();
    db.friends.push({from, to, status: 'pending'});
    writeDB(db);
    io.emit('friendsUpdate', db.friends);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
