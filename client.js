// ====== CONFIG SPACE - PASTE YOUR RENDER URL HERE ======
const API = "https://echating-3.onrender.com";
const EMAILJS_PUBLIC_KEY ="6vVk9Mkld2FxNK2F6";
const EMAILJS_SERVICE_ID = "service_bnml7gq";
const EMAILJS_TEMPLATE_ID = "template_4t07p1d";
// =======================================================

const socket = io(API);
let currentUser = JSON.parse(localStorage.getItem('echatUser'));
let verifyCode = 0; let allUsers = [], allPosts = [], allFriends = [];
let recorder, chunks = [];

(function(){ emailjs.init(EMAILJS_PUBLIC_KEY); })();

async function sendCode(){
  const email = document.getElementById('email').value;
  if(!email.includes('@gmail.com')) return alert('Please use a Gmail address');
  verifyCode = Math.floor(100000 + Math.random()*900000);
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { to_email: email, code: verifyCode });
    alert('Verification code sent to ' + email);
    document.getElementById('verifyBox').classList.remove('hidden');
  } catch(err) { alert('Email failed: ' + err.text); }
}

function signup(){
  const code = document.getElementById('code').value;
  const email = document.getElementById('email').value;
  const pass = document.getElementById('pass').value;
  if(code!= verifyCode) return alert('Wrong code');
  socket.emit('register', {email:email, pass:pass});
}
socket.on('registerSuccess', ()=>alert('Account created. Login now'));

function login(){ socket.emit('login', {email:loginEmail.value, pass:loginPass.value}); }
socket.on('loginSuccess', user=>{ localStorage.setItem('echatUser', JSON.stringify(user)); window.location = 'app.html'; });
socket.on('error', msg=>alert(msg));

function adminLogin(){ socket.emit('adminLogin', {username:adminUser.value, password:adminPass.value}); }
socket.on('adminSuccess', data=>{ localStorage.setItem('echatUser', JSON.stringify({isAdmin:true})); window.location = 'app.html'; setTimeout(()=>loadAdmin(data), 500); });

socket.on('initData', data=>{ allPosts=data.posts; allUsers=data.users; allFriends=data.friends; renderFeed(); renderPeople(); });

function loadApp(){
  if(!currentUser) return window.location = 'index.html';
  if(currentUser.isAdmin) document.getElementById('adminPanel').classList.remove('hidden');
  bio.value = currentUser.bio || ""; if(currentUser.avatar) avatar.src = currentUser.avatar;
  loadChatHistory();
}
if(window.location.pathname.includes('app.html')) loadApp();

function saveProfile(){
  currentUser.bio = bio.value; socket.emit('updateProfile', currentUser);
  localStorage.setItem('echatUser', JSON.stringify(currentUser)); alert('Profile saved');
}
avatarUpload.onchange = e=>{ const reader = new FileReader(); reader.onload = ()=>{ currentUser.avatar = reader.result; saveProfile(); avatar.src = reader.result; } reader.readAsDataURL(e.target.files[0]); }

// FRIENDS
function renderPeople(){
  peopleList.innerHTML = allUsers.filter(u=>u.id!==currentUser.id).map(u=>{
    const isFriend = currentUser.friends?.includes(u.id);
    const pending = allFriends.find(f=>f.from===currentUser.id && f.to===u.id && f.status==='pending');
    let btn = isFriend? 'Friends' : pending? 'Pending' : `<button class="btn-small" onclick="sendFriend(${u.id})">Add</button>`;
    return `<div class="user-item"><span>${u.email}</span>${btn}</div>`;
  }).join('');
}
function sendFriend(toId){ socket.emit('sendFriendRequest', {from: currentUser.id, to: toId}); }
socket.on('friendsUpdate', f=>{ allFriends=f; renderPeople(); });
socket.on('usersUpdate', u=>{ allUsers=u; currentUser=u.find(x=>x.id===currentUser.id); localStorage.setItem('echatUser', JSON.stringify(currentUser)); renderPeople(); });

// POSTS + LIKES + COMMENTS
function createPost(){
  const file = postImg.files[0];
  if(file){ const reader = new FileReader(); reader.onload = ()=> socket.emit('newPost', {authorId:currentUser.id, author:currentUser.email, text:postText.value, img:reader.result}); reader.readAsDataURL(file); }
  else socket.emit('newPost', {authorId:currentUser.id, author:currentUser.email, text:postText.value, img:''});
  postText.value=''; postImg.value='';
}
function renderFeed(){
  feed.innerHTML = allPosts.map(p=>{
    const liked = p.likes.includes(currentUser.id);
    return `<div class="post">
      <b>${p.author}</b><p>${p.text}</p>
      ${p.img?`<img src="${p.img}" style="max-width:100%;border-radius:12px;margin:8px 0">`:''}
      <button class="btn-small" onclick="likePost(${p.id})">${liked?'Unlike':'Like'} (${p.likes.length})</button>
      <div>${p.comments.map(c=>`<div class="comment"><b>${c.author}:</b> ${c.text}</div>`).join('')}</div>
      <input id="comment-${p.id}" placeholder="Write a comment"><button class="btn-small" onclick="commentPost(${p.id})">Comment</button>
    </div>`;
  }).join('');
}
function likePost(id){ socket.emit('likePost', {postId:id, userId:currentUser.id}); }
function commentPost(id){ const text=document.getElementById(`comment-${id}`).value; if(!text) return; socket.emit('commentPost', {postId:id, comment:{author:currentUser.email, text}}); document.getElementById(`comment-${id}`).value=''; }
socket.on('postsUpdate', p=>{ allPosts=p; renderFeed(); });

// CHAT
function sendMsg(){
  const file = msgFile.files[0];
  if(file){ const reader = new FileReader(); reader.onload = ()=> socket.emit('newMessage', {from:currentUser.email, content:reader.result, type:file.type}); reader.readAsDataURL(file); }
  else if(msgInput.value.trim()) socket.emit('newMessage', {from:currentUser.email, content:msgInput.value, type:'text'});
  msgInput.value=''; msgFile.value='';
}
socket.on('message', msg=>{ addMsgToUI(msg); saveChatHistory(msg); });
socket.on('messagesUpdate', msgs=>{ chatBox.innerHTML=''; msgs.forEach(addMsgToUI); });
function addMsgToUI(msg){
  const div = document.createElement('div'); div.className = 'msg ' + (msg.from===currentUser.email?'me':'');
  if(msg.type.startsWith('image/')) div.innerHTML = `<img src="${msg.content}" style="max-width:200px;border-radius:10px">`;
  else if(msg.type.startsWith('audio/')) div.innerHTML = `<audio controls src="${msg.content}"></audio>`;
  else div.innerText = msg.from.split('@')[0] + ': ' + msg.content;
  chatBox.appendChild(div); chatBox.scrollTop = chatBox.scrollHeight;
}
function startVoice(){ navigator.mediaDevices.getUserMedia({audio:true}).then(s=>{recorder=new MediaRecorder(s);recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();})}
function stopVoice(){ if(recorder) recorder.stop(); recorder.onstop=()=>{const blob=new Blob(chunks,{type:'audio/webm'});const reader=new FileReader();reader.onload=()=>socket.emit('newMessage',{from:currentUser.email,content:reader.result,type:'audio/webm'});reader.readAsDataURL(blob);chunks=[]}}
function saveChatHistory(msg){ let hist = JSON.parse(localStorage.getItem('echatHistory')||'[]'); hist.push(msg); localStorage.setItem('echatHistory', JSON.stringify(hist)); }
function loadChatHistory(){ let hist = JSON.parse(localStorage.getItem('echatHistory')||'[]'); hist.forEach(addMsgToUI); }

// ADMIN
function loadAdmin(data){
  adminUsers.innerHTML = data.users.map(u=>`<div class="admin-item">${u.email} <button class="btn-small" onclick="socket.emit('adminDeleteUser',${u.id})">Delete</button></div>`).join('');
  adminPosts.innerHTML = data.posts.map(p=>`<div class="admin-item">${p.text.slice(0,20)}... <button class="btn-small" onclick="socket.emit('adminDeletePost',${p.id})">Delete</button></div>`).join('');
  adminMsgs.innerHTML = data.messages.map(m=>`<div class="admin-item">${m.content.slice(0,20)}... <button class="btn-small" onclick="socket.emit('adminDeleteMsg',${m.id})">Delete</button></div>`).join('');
}