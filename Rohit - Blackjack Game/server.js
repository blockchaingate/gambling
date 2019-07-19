/*|======================To-do list======================|*\
|*|                                                      |*|
|*| (|) fix min and max bet data types since uint256 !=  |*|
|*|     int64 (setting to string for temp fix)           |*|
|*|                                                      |*|
\*|======================================================|*/

const express = require('express');
const bodyParser = require('body-parser');

// create express app
const app = express();

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// parse requests of content-type - application/json
app.use(bodyParser.json())

// Configuring the database
const dbConfig = require('./config/database.config.js');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

// Connecting to the database
mongoose.connect(dbConfig.url, {
    useNewUrlParser: true
}).then(() => {
    console.log("Successfully connected to the database");    
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...', err);
    process.exit();
});

// define a simple route
app.get('/', (req, res) => {
    res.json({"message": "~Blackjack~"});
});

// Require Games routes
require('./app/routes/game.routes.js')(app);

// listen for requests
app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});

/*var mongoose = require('mongoose');

mongoose.connect('mongodb://192.168.1.112/blackjack', {useNewUrlParser: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("yay");
    
    var gameProperties = new mongoose.Schema({
        name: String,
        minBet: Number,
        maxBet: Number
    });

    gameProperties.methods.test = function () {
        console.log("This is a test: " + this.name);
    }

    var Game = mongoose.model('Game',gameProperties);
    var first = new Game({ name: 'First' });
    console.log(first.name);
    first.test();

    first.save(function (err, first) {
        if (err) return console.error(err);
        //first.test();
    });

    Game.find(function (err, games) {
        if (err) return console.error(err);
        console.log(games);
    });
});*/
