const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/app.html', (req, res) => res.sendFile(path.join(__dirname, 'app.html')));

// MEMORY DATABASE - NO FILE
let db = {
  users: [],
  posts: [],
  messages: [],
  friends: []
};

io.on('connection', (socket) => {
  console.log('User connected');
  socket.emit('initData', db);

  socket.on('register', ({ email, pass }) => {
    if (db.users.find(u => u.email === email)) {
      return socket.emit('error', 'User already exists');
    }
    const newUser = { id: Date.now(), email, pass, bio: '', avatar: '', friends: [], isAdmin: false };
    db.users.push(newUser);
    socket.emit('registerSuccess', newUser);
    io.emit('usersUpdate', db.users);
  });

  socket.on('login', ({ email, pass }) => {
    const user = db.users.find(u => u.email === email && u.pass === pass);
    if (user) socket.emit('loginSuccess', user);
    else socket.emit('error', 'Invalid email or password');
  });

  socket.on('adminLogin', ({ username, password }) => {
    if (username === 'admin' && password === 'admin123') {
      socket.emit('adminSuccess', db);
    } else {
      socket.emit('error', 'Wrong admin credentials');
    }
  });

  socket.on('updateProfile', (updatedUser) => {
    const i = db.users.findIndex(u => u.id === updatedUser.id);
    if (i!== -1) db.users[i] = updatedUser;
    io.emit('usersUpdate', db.users);
  });

  socket.on('newPost', (post) => {
    post.id = Date.now();
    post.likes = [];
    post.comments = [];
    db.posts.unshift(post);
    io.emit('postsUpdate', db.posts);
  });

  socket.on('likePost', ({ postId, userId }) => {
    const post = db.posts.find(p => p.id === postId);
    if (!post) return;
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter(id => id!== userId);
    } else {
      post.likes.push(userId);
    }
    io.emit('postsUpdate', db.posts);
  });

  socket.on('commentPost', ({ postId, comment }) => {
    const post = db.posts.find(p => p.id === postId);
    if (!post) return;
    post.comments.push(comment);
    io.emit('postsUpdate', db.posts);
  });

  socket.on('newMessage', (msg) => {
    msg.id = Date.now();
    db.messages.push(msg);
    io.emit('message', msg);
  });

  socket.on('sendFriendRequest', ({ from, to }) => {
    db.friends.push({ from, to, status: 'pending' });
    io.emit('friendsUpdate', db.friends);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
