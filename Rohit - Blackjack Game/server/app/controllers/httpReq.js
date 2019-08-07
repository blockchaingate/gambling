const Game = require('../models/game_model.js');

// Create and Save a new Game
exports.create = (req, res) => {
    // Validate request
    if(!req.body.address || !req.body.minBet || !req.body.maxBet) {
        return res.status(400).send({
            message: "Game data is invalid"
        });
    }

    // Create a Game
    const game = new Game({
        address: req.body.address, 
        minBet: req.body.minBet,
        maxBet: req.body.maxBet
    });

    // Save Game in the database
    game.save()
    .then(data => {
        res.send(data);
    }).catch(err => {
        res.status(500).send({
            message: err.message || "Some error occurred while creating the Game."
        });
    });
};

// Retrieve and return all games from the database.
exports.findAll = (req, res) => {
    Game.find().sort({$natural:1}).limit(10)
    .then(games => {
        res.send(games);
    }).catch(err => {
        res.status(500).send({
            message: err.message || "Some error occurred while retrieving games."
        });
    });
};

// Find a single game with a gameId
exports.findOne = (req, res) => {
    Game.findById(req.params.gameId)
    .then(game => {
        if(!game) {
            return res.status(404).send({
                message: "Game not found with id " + req.params.gameId
            });            
        }
        res.send(game);
    }).catch(err => {
        if(err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Game not found with id " + req.params.gameId
            });                
        }
        return res.status(500).send({
            message: "Error retrieving game with id " + req.params.gameId
        });
    });
};

// Update a game identified by the gameId in the request
exports.update = (req, res) => {
    // Validate Request
    if(!req.body.address || !req.body.minBet || !req.body.maxBet) {
        return res.status(400).send({
            message: "Game data is invalid"
        });
    }

    // Find game and update it with the request body
    Game.findByIdAndUpdate(req.params.gameId, {
        address: req.body.address, 
        minBet: req.body.minBet,
        maxBet: req.body.maxBet
    }, {new: true})
    .then(game => {
        if(!game) {
            return res.status(404).send({
                message: "Game not found with id " + req.params.gameId
            });
        }
        res.send(game);
    }).catch(err => {
        if(err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Game not found with id " + req.params.gameId
            });                
        }
        return res.status(500).send({
            message: "Error updating game with id " + req.params.gameId
        });
    });
};

// Delete a game with the specified gameId in the request
exports.delete = (req, res) => {
    Game.findOneAndDelete({ address: { $eq: req.params.gameId }})
    .then(game => {
        if(!game) {
            return res.status(404).send({
                message: "Game not found with address " + req.params.gameId
            });
        }
        res.send({message: "Game deleted successfully!"});
    }).catch(err => {
        if(err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "Game not found with address " + req.params.gameId
            });                
        }
        return res.status(500).send({
            message: "Could not delete game with address " + req.params.gameId
        });
    });
};

exports.deleteAll = (req, res) => {
    Game.deleteMany()
    .then(games => {
        res.send(games);
    }).catch(err => {
        res.status(500).send({
            message: err.message || "Some error occurred while deleting games."
        });
    });
};