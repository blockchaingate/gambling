const mongoose = require('mongoose');

const GameSchema = mongoose.Schema({
    address: String,
    minBet: String,
    maxBet: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Game', GameSchema);