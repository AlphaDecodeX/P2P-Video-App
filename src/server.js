const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(path.join(__dirname, '../public')));

let usersConnected = [];

io.on('connection', socket => {
  usersConnected.push(socket.id);
  socket.on('disconnect', () => {
    usersConnected = usersConnected.filter(user => user !== socket.id)
    socket.broadcast.emit('updateUserList', { usersInfo: usersConnected })
  })

  socket.on('offerMedia', data => {
    socket.to(data.to).emit('offerMedia', {
      from: data.from,
      offer: data.offer
    });
  });
  
  socket.on('answerMedia', data => {
    socket.to(data.to).emit('answerMedia', {
      from: data.from,
      answer: data.answer
    });
  });

  socket.on('iceCandidate', data => {
    socket.to(data.to).emit('peerIceCandidate', {
      candidate: data.candidate
    })
  })

  socket.on('requestUserList', () => {
    socket.emit('updateUserList', { usersInfo: usersConnected });
    socket.broadcast.emit('updateUserList', { usersInfo: usersConnected });
  });
});

http.listen(3000, () => {
  console.log('listening http://localhost:3000');
});