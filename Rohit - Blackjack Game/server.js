/*|======================To-do list======================|*\
|*|                                                      |*|
|*| (|) fix min and max bet data types since uint256 !=  |*|
|*|     int64 (setting to string for temp fix)           |*|
|*|                                                      |*|
\*|======================================================|*/

const express = require('express');
const bodyParser = require('body-parser');
const fs = require("fs");
const path = require("path");
// create express app
const app = express();

// parse requests of content-type - application/x-www-form-urlencoded
//app.use(bodyParser.urlencoded({ extended: true }))

// parse requests of content-type - application/json
app.use(bodyParser.json());

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
    //console.log(path.join(__dirname, '/index.html'));
    res.sendFile(path.join(__dirname, '/index.html'));
    //res.json({"message": "~Blackjack~"});
});

app.get('/bundle.js', (req, res) => {
    res.sendFile(path.join(__dirname, '/bundle.js'));
});

app.get('/bundle.js', (req, res) => {
    res.sendFile(path.join(__dirname, './CanvasInput-master/CanvasInput.js'));
});

app.get('/bg.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, '/bg.jpg'));
});

// Require Games routes
require('./app/routes/game.routes.js')(app);

// listen for requests
app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});
