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
const dbConfig = require('./config/database_config.js');
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
    res.sendFile(path.join(__dirname, '../client/webpage/index.html'));
    //res.json({"message": "~Blackjack~"});
});

app.get('/api-web.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../api/api-web.js'));
});

app.get('/client-web.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/webpage/client-web.js'));
});

app.get('/canvas_text_input.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/webpage/canvas_text_input.js'));
});

app.get('/bg.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/images/bg.jpg'));
});

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/images/favicon.ico'));
});

for (let suit = 0; suit < 4; suit ++) {
    for (let value = 1; value <= 13; value++) {
        let card = "";
        if (value == 1) {
            card += "A";
        } else if (value == 11) {
            card += "J";
        } else if (value == 12) {
            card += "Q";
        } else if (value == 13) {
            card += "K";
        } else {
            card += value;
        }
        if (suit == 0) {
            card += "D";
        } else if (suit == 1) {
            card += "C";
        } else if (suit == 2) {
            card += "H";
        } else {
            card += "S";
        }
        app.get('/'+card+'.png', (req, res) => {
            res.sendFile(path.join(__dirname, '../client/images/cards/front/'+card+'.png'));
        });
    }
}

// Require Games routes
require('./app/routes/game_routes.js')(app);

// listen for requests
app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});
