//requiring express library and setting server
var express = require('express');
var app = express();
var serv = require('http').Server(app);

//single route on index
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('client',express.static(__dirname + '/client'));

// vars and listener to start the Server
var ip = process.env.IP || "0.0.0.0";
var port = process.env.PORT || 3000;

serv.listen(port, ip, function(){
    console.log("Server Started on ip: " + ip + " and port " + port);
});

//creating variable that will hold the sockets
var SOCKET_LIST = {};

//creating an Entity with general parameters for the objects
var Entity = function(){
    var self ={
        x:250,
        y:250,
        speedX: 0,
        speedY: 0,
        id: "",
    }
    self.update = function(){
        self.updatePosition();
    }
    self.updatePosition = function(){
        self.x += self.speedX;
        self.y += self.speedY;
    }
    return self;
}

//creating Player object
var Player = function(id){
    //inherits from Entity
    var self = Entity();
    self.id = id;
    self.number = ""+ Math.floor(10*Math.random());
    self.right=false;
    self.left=false;
    self.up=false;
    self.down=false;
    self.maxSpeed = 10;

    //updates the player
    var super_update = self.update;

    self.update = function(){
        self.updateSpeed();
        super_update();
    }
    
    //updates the speed of the player
    self.updateSpeed = function(){
        if(self.right) 
            self.speedX = self.maxSpeed;
        else if(self.left) 
            self.speedX = -self.maxSpeed;
        else
            self.speedX = 0;
        
        if(self.up) 
            self.speedY = -self.maxSpeed;
        else if(self.down) 
            self.speedY = self.maxSpeed;
        else 
            self.speedY = 0;
    }
    Player.list[id]=self;
    return self;
}

Player.list = {};
Player.onConnect = function(socket){
    var player = Player(socket.id);

    //checks if the player moves and updates the state 
    socket.on('keyPress', function(data){
        if(data.inputId==='right') player.right = data.state;
        else if(data.inputId==='left') player.left = data.state;
        else if(data.inputId==='up') player.up = data.state;
        else if(data.inputId==='down') player.down = data.state;
    });
}

Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
}

Player.update = function(){
    //creating a variable that will hold all players
    var package = [];

    //pushing each socket into the package
    for(var i in Player.list){
        var player = Player.list[i];
        //updates the position according to the key pressed
        player.update();
        package.push({
            x:player.x,
            y:player.y,
            number: player.number
        });
    }
    return package;
}

//Creating object Bullet
var Bullet = function(angle){
    //inherits from Entity
    var self = Entity();
    self.id = Math.random();
    //speed of bullets
    self.speedX = Math.cos(angle/180*Math.PI)*10;
    self.speedY = Math.sin(angle/180*Math.PI)*10;
    //setting timer and var to remove bullets after some time
    self.timer = 0;
    self.toRemove = false;
    var super_update = self.update;
    self.update = function(){
        if(self.timer++>100)
            self.toRemove = true;
        super_update();
    }
    Bullet.list[self.id] = self;
    return self;
}

Bullet.list = {};

Bullet.update = function(){
    //creates a bullet with a random angle
    if(Math.random()<0.1){
        Bullet(Math.random()*360);
    }
    //creating a variable that will hold all players
    var package = [];

    //pushing each socket into the package
    for(var i in Bullet.list){
        var bullet = Bullet.list[i];
        //updates the position according to the key pressed
        bullet.update();
        package.push({
            x:bullet.x,
            y:bullet.y
        });
    }
    return package;
}

//requiring socket library
var io = require('socket.io')(serv,{});

//initializing connection of socket
io.sockets.on('connection',function(socket){
    //random id for each socket
    socket.id = Math.random();    
    //adding the socket to the array
    SOCKET_LIST[socket.id] = socket;
    
    Player.onConnect(socket);
    
    //deleting the socket and player from the array when it disconnects
    socket.on('disconnect', function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);        
    });  
    //sending messages
    socket.on('sendMsgToServer', function(data){
        var playerName = ("" + socket.id).slice(2,7);
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat', playerName + ': ' + data);
        }              
    });  
    //eval
    socket.on('evalServer', function(data){
        var res = eval(data);
        socket.emit('evalAnswer', res);
    })

});

//interval each 40ms
setInterval(function(){
    //updating the package and its objects
    var package = {
        player: Player.update(),
        bullet: Bullet.update()
    }

    //emitting new position with the package as a parameter
    for(var i in SOCKET_LIST){    
        var socket = SOCKET_LIST[i];   
        socket.emit('newPosition',package);
    }
    
},1000/25);
