module.exports = (app) => {
    const games = require('../controllers/httpReq.js');

    // Create a new Game
    app.post('/games', games.create);

    // Retrieve all Games
    app.get('/games', games.findAll);

    // Retrieve a single Game with gameId
    app.get('/games/:gameId', games.findOne);

    // Update a Game with gameId
    app.put('/games/:gameId', games.update);

    // Delete all Games
    app.delete('/games', games.deleteAll);

    // Delete a Game with gameId
    app.delete('/games/:gameId', games.delete);
}