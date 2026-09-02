const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/app.html', (req, res) => res.sendFile(path.join(__dirname, 'app.html')));

// ===== NO MORE DB.JSON =====
// Everything is stored in RAM. Resets on server restart
let db = {
  users: [],
  posts: [],
  messages: [],
  friends: []
};
// ===========================

io.on('connection', (socket) => {
  console.log('User connected');
  socket.emit('initData', db);

  socket.on('register', ({email, pass}) => {
    if(db.users.find(u => u.email === email)) return socket.emit('error', 'User exists');
    const newUser = {id: Date.now(), email, pass, bio: '', avatar: '', friends: [], isAdmin: false};
    db.users.push(newUser);
    socket.emit('registerSuccess');
    io.emit('usersUpdate', db.users);
  });

  socket.on('login', ({email, pass}) => {
    const user = db.users.find(u => u.email === email && u.pass === pass);
    if(user) socket.emit('loginSuccess', user);
    else socket.emit('error', 'Invalid credentials');
  });

  socket.on('adminLogin', ({username, password}) => {
    if(username === 'admin' && password === 'admin123') {
      socket.emit('adminSuccess', db);
    } else socket.emit('error', 'Wrong admin');
  });

  socket.on('updateProfile', (user) => {
    const i = db.users.findIndex(u => u.id === user.id);
    if(i!== -1) db.users[i] = user;
    io.emit('usersUpdate', db.users);
  });

  socket.on('newPost', (post) => {
    post.id = Date.now(); post.likes = []; post.comments = [];
    db.posts.unshift(post);
    io.emit('postsUpdate', db.posts);
  });

  socket.on('likePost', ({postId, userId}) => {
    const post = db.posts.find(p => p.id === postId);
    if(post.likes.includes(userId)) post.likes = post.likes.filter(id => id!== userId);
    else post.likes.push(userId);
    io.emit('postsUpdate', db.posts);
  });

  socket.on('commentPost', ({postId, comment}) => {
    const post = db.posts.find(p => p.id === postId);
    post.comments.push(comment);
    io.emit('postsUpdate', db.posts);
  });

  socket.on('newMessage', (msg) => {
    msg.id = Date.now();
    db.messages.push(msg);
    io.emit('message', msg);
  });

  socket.on('sendFriendRequest', ({from, to}) => {
    db.friends.push({from, to, status: 'pending'});
    io.emit('friendsUpdate', db.friends);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));    const newUser = {id: Date.now(), email, pass, bio: '', avatar: '', friends: [], isAdmin: false};
    db.users.push(newUser);
    writeDB(db);
    socket.emit('registerSuccess');
    io.emit('usersUpdate', db.users);
  });

  socket.on('login', ({email, pass}) => {
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.pass === pass);
    if(user) socket.emit('loginSuccess', user);
    else socket.emit('error', 'Invalid credentials');
  });

  socket.on('newMessage', (msg) => {
    const db = readDB();
    msg.id = Date.now();
    db.messages.push(msg);
    writeDB(db);
    io.emit('message', msg);
  });
  // ... keep the rest: newPost, likePost, commentPost, updateProfile, adminLogin
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));    writeDB(db);
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
