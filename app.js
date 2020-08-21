//requiring express library and setting server
var express = require('express');
var app = express();
var serv = require('http').Server(app);

//single route on index
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('client',express.static(__dirname + '/client'));

serv.listen(2000);
console.log('Server Started');

//creating variable that will hold the sockets
var SOCKET_LIST = {};
//requiring socket library
var io = require('socket.io')(serv,{});

//initializing connection of socket
io.sockets.on('connection',function(socket){
    //random id for each player
    socket.id = Math.random();
    //setting same position for each player
    socket.x = 0;
    socket.y = 0;
    //setting a number for each player
    socket.number = "" + Math.floor(10 * Math.random());

    //adding the socket to the array
    SOCKET_LIST[socket.id] = socket;

    //deleting the socket from the array when it disconnects
    socket.on('disconnect', function(){
        delete SOCKET_LIST[socket.id];
    });
});

//interval each 40ms
setInterval(function(){
    //creating a variable that will hold all players
    var package = [];

    //pushing each socket into the package
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.x++;
        socket.y++;
        package.push({
            x:socket.x,
            y:socket.y,
            number: socket.number
        });
    }

    //emitting new position with the package as a parameter
    for(var i in SOCKET_LIST){    
        var socket = SOCKET_LIST[i];   
        socket.emit('newPosition',package);
    }
    
},1000/25);
