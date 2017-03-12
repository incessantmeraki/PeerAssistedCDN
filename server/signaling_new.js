var randPerm = require('../util/random.js')
// require our websocket library
var WebSocketServer = require('ws').Server;
// creating a websocket server at port 9090
var wss = new WebSocketServer({port: 9090});

// all connected to the server users
var users = {};
var trackers = {};

// when new user connects to our sever
wss.on('connection', function(connection) {

  console.log("New user connected");

  //when server gets a message from a connected user
  connection.on('message', function(message) {
    var data;
    //accepting only JSON messages
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log("Invalid JSON");
      data = {};
    }
    if(!connection.name && (data.type!='login'))
    {
      sendTo(connection,{type:"error",
                         message:"Havent captured username"});
      return;
    }
    //switching type of the user message
    switch (data.type) {
      //when a user tries to login

      case "login":
      onLogin();
      break;
      case "offer":
      onOffer()
      break;

      case "answer":
      onAnswer()
      break;

      case "candidate":
      onCandidate()
      break;

      case "leave":
      onLeave()
      break;

      case "status":
      onRequest()
      break;

      case "seed":
      onSeed();
      break;

      default:
      onDefault();
      break;
    }

    //functions handling above cases
    function onDefault() {
      sendTo(connection, {
        type: "error",
        message: "Invalid message type: " + data.type
      });
    }

    function onOffer() {
      //for ex. UserA wants to call UserB
      //if UserB exists then send him offer details
      var conn = users[data.name].connection;
      if(conn != null) {
        console.log("Sending offer from ", connection.name," to ",data.name);
        sendTo(conn, {type: "offer",
                      offer: data.offer,
                      name: connection.name});
      }
      else
      {
        console.log("Received offer for invalid peer");
      }
    }

    function onAnswer() {
      console.log("Sending answer to: ", data.name,"from "
      ,connection.name);
      //for ex. UserB answers UserA
      var conn = users[data.name].connection;

      if(conn != null) {
        connection.otherName = data.name;
        sendTo(conn, {
          type: "answer",
          answer: data.answer,
          name: connection.name
        });
      }
    }

    function onCandidate() {
      console.log("Sending candidate to:",data.name);
      var conn = users[data.name].connection;
      if(conn != null) {
        sendTo(conn, {
          type: "candidate",
          candidate: data.candidate,
          name:connection.name
        });
      }
    }

    function onLeave() {
      console.log("Disconnecting from", data.name);
    }

    function onRequest() {
      var result = {};
      result.type = 'response';
      result.answer = {};
      // Page wise mode
      if(data.mode == 1)
      {
        result.answer[data.infoHashes[0][0]] = getPeers(data.infoHashes[0][0]);
        addPeer(data.infoHashes[0][0], connection.name);
      }
      else
      {
        for (i  = 0; i < data.infoHashes.length; i++) {
          var infohash = data.infoHashes[i];
          result.answer[infohash] = getPeers(infohash);
          addPeer(infohash, connection.name);
        }
      }
      sendTo(connection, result);
    }


    function onLogin() {
      console.log("User requested for ", data.name);
      var newPeer = addNewPeer(data.name, connection);
      if(newPeer)
      {
        sendTo(connection, {type: "login",success: true});
        console.log("Added new peer:",data.name);
      }
      else
      {
        sendTo(connection, {type: "login",success: false});
        console.log("Failed to add new peer:",data.name);
      }
    }

    function onSeed() {
      for (i  = 0; i < data.infoHashes.length; i++) {
        var infohash = data.infoHashes[i];
        addPeer(infohash, connection.name)
      }
    }

  });

  connection.on("close", function() {
    if(connection.name)
    {
      delete users[connection.name];
    }
  });

  function sendTo(connection, message) {
    connection.send(JSON.stringify(message));
  }
});

// Add a new peer
function addNewPeer(peer,connection){
  if(users[peer])
    return null;
  connection.name = peer;
  users[peer] = { connection:connection ,infoHash:[] };
  return users[peer]
}

// Adds peer to infohash
// If infohash doesnt exist start tracking it
function addPeer(infohash, peer) {
  if(!trackers[infohash])
  {
    trackers[infohash] = [];
  }
  if(trackers[infohash].indexOf(peer) < 0)
  {
    trackers[infohash].push(peer);
  }
  if(users[peer].infoHash.indexOf(infohash) < 0)
  {
    users[peer].infoHash.push(infohash);
  }
}

/*TODO : i have sent all peers (which include me also)
         how do i fix above without breaking getPeers(infoHash) API
         so i wanted that thing to be handled in client
*/

// Get list of peers from infohash
function getPeers(infoHash) {
  if (!trackers[infoHash])
    return []
  //total no. of peers available
  var count = trackers[infoHash].length

  // if no of peers is less than 10 then return all peers
  var result  = [] //stores final value 

  //randPerm(n) returns array with value 0 to n shuffled randomly
  var permTable = randomPerm(count) 

  //sends all peers if count is less than 10
  if (count < 10) {
    permTable.forEach(function (val) {
      result.push(trackers[infoHash][val])
    })
    return result
  }
  else {
    //selecting and sending 10 random peers
    slectedPerm = permTable.slice(0, 10)
    slectedPerm.forEach(function (val) {
      result.push(trackers[infoHash][val])
    })
    return result
  }
}

// Adds infohash to tracker list
function addInfohash(infoHash) {
  return;
}

// Remove peer if it's dead
function removePeer(peer) {

}
