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
//creating variable that will hold the players
var PLAYER_LIST = {};

//creating Player object
var Player = function(id){
    var self = {
        x:250,
        y:250,
        id:id,
        number:""+ Math.floor(10*Math.random()),
        right:false,
        left:false,
        up:false,
        down:false,
        maxSpeed: 10
    }
    //updates the position of the player
    self.updatePosition = function(){
        if(self.right) self.x += self.maxSpeed;
        if(self.left) self.x -= self.maxSpeed;
        if(self.up) self.y -= self.maxSpeed;
        if(self.down) self.y += self.maxSpeed;
    }
    return self;
}

//requiring socket library
var io = require('socket.io')(serv,{});

//initializing connection of socket
io.sockets.on('connection',function(socket){
    //random id for each socket
    socket.id = Math.random();    
    //adding the socket to the array
    SOCKET_LIST[socket.id] = socket;
    //creating the player with the id
    var player = Player(socket.id);
    //adding the player to the list
    PLAYER_LIST[socket.id] = player;

    //deleting the socket and player from the array when it disconnects
    socket.on('disconnect', function(){
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
    });

    //checks if the player moves and updates the state 
    socket.on('keyPress', function(data){
        if(data.inputId==='right') player.right = data.state;
        else if(data.inputId==='left') player.left = data.state;
        else if(data.inputId==='up') player.up = data.state;
        else if(data.inputId==='down') player.down = data.state;
    });
});

//interval each 40ms
setInterval(function(){
    //creating a variable that will hold all players
    var package = [];

    //pushing each socket into the package
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        //updates the position according to the key pressed
        player.updatePosition();
        package.push({
            x:player.x,
            y:player.y,
            number: player.number
        });
    }

    //emitting new position with the package as a parameter
    for(var i in SOCKET_LIST){    
        var socket = SOCKET_LIST[i];   
        socket.emit('newPosition',package);
    }
    
},1000/25);
