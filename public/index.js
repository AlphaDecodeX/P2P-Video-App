const connectionStats = () => {
  peer.getStats(null).then((stats) => {
    let statsOutput = "";
    stats.forEach((report) => {
      if (report.type === "inbound-rtp" && report.kind === "video") {
        Object.keys(report).forEach((statName) => {
          statsOutput += `<tr><td>${statName}:</td> <td>${report[statName]}</td></tr>`;
        });
      }
    });
    document.querySelector(".stats-box").innerHTML = statsOutput;
  });
}

const peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.stunprotocol.org" }]
  });

  try {
    statsInterval = setInterval(connectionStats, 1000);
  } catch (err) {
    console.error(`Error: ${err}`);
  }
  
  const socket = io('http://localhost:3000');
  
  const onSocketConnected = async () => {
    const options = {
      audio: true,
      video: true
    };
    const curStream = await navigator.mediaDevices.getUserMedia(options);
    document.querySelector('#currVideo').srcObject = curStream;
    curStream.getTracks().forEach(curTrack => peer.addTrack(curTrack, curStream));
  }
  
  let callBtn = document.querySelector('#call');
  
  // Calling button
  callBtn.addEventListener('click', async () => {
    const currPeerOffer = await peer.createOffer();
    await peer.setLocalDescription(new RTCSessionDescription(currPeerOffer));
    sendMediaDataOffer(currPeerOffer);
  });
  
  // Creating Media Offer
  socket.on('offerMedia', async (data) => {
    await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answerOfPeer = await peer.createAnswer();
    await peer.setLocalDescription(new RTCSessionDescription(answerOfPeer));
  
    sendMediaAnswer(answerOfPeer, data);
  });
  
  // Creating Media Answer
  socket.on('answerMedia', async (data) => {
    await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
  });
  
  // ICE candidate send
  peer.onicecandidate = (event) => {
    sendIceCandidateData(event);
  }
  
  socket.on('peerIceCandidate', async (data) => {
    try {
      const candidate = new RTCIceCandidate(data.candidate);
      await peer.addIceCandidate(candidate);
    } catch (error) {
      console.log(error)
    }
  })
  

  peer.addEventListener('track', (event) => {
    const [stream] = event.streams;
    document.querySelector('#remoteVideo').srcObject = stream;
    
  })
  
  let selectedUser="";
  
  const sendMediaAnswer = (answerOfPeer, data) => {
    socket.emit('answerMedia', {
      answer: answerOfPeer,
      from: socket.id,
      to: data.from
    })
  }
  
  const sendMediaDataOffer = (localPeerOffer) => {
    socket.emit('offerMedia', {
      offer: localPeerOffer,
      from: socket.id,
      to: selectedUser
    });
  };
  
  const sendIceCandidateData = (event) => {
    socket.emit('iceCandidate', {
      to: selectedUser,
      candidate: event.candidate,
    });
  }
  
  const updateUserList = ({ usersInfo }) => {
    const users = document.querySelector('#listOfUsers');
    const displayUser = usersInfo.filter(id => id !== socket.id);
  
    users.innerHTML = '';
    
    displayUser.forEach(user => {
      const item = document.createElement('div');
      item.innerHTML = user;
      item.className = 'item';
      item.addEventListener('click', () => {
        const elements = document.querySelectorAll('.item');
        elements.forEach((element) => {
          element.classList.remove('clicked');
        })
        item.classList.add('clicked');
        selectedUser = user;
      });
      users.appendChild(item);
    });
  };
  socket.on('updateUserList', updateUserList);
  
  const handleSocketConnected = async () => {
    onSocketConnected();
    socket.emit('requestUserList');
  };
  
  socket.on('connect', handleSocketConnected);
  