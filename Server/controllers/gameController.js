const { createGame, makeMove, runMinimax } = require('../models/gameLogic');

exports.startGame = (req, res) => {
    try {
        const game = createGame();
        res.status(200).json({ 
            board: game.board,
            turn: game.turn,
            status: 'game_started' 
        });
    } catch (error) {
        console.error('Error starting game:', error);
        res.status(500).json({ error: 'Failed to start game' });
    }
};

exports.playMove = (req, res) => {
    try {
        const { board, move, depth = 3 } = req.body;
        
        if (!board || !move) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create a game instance with the current board state
        const game = createGame();
        game.board = board;
        
        // Make the player's move
        game.makeMove(move);
        
        // If game is over after player's move
        if (game.isGameOver()) {
            return res.status(200).json({
                board: game.board,
                isGameOver: true,
                winner: 'player'
            });
        }

        // Get AI's move
        const aiResponse = runMinimax(game, depth);
        
        if (aiResponse.bestMove) {
            // Make AI's move
            game.makeMove(aiResponse.bestMove);
        }

        res.status(200).json({
            board: game.board,
            isGameOver: game.isGameOver(),
            lastMove: aiResponse.bestMove,
            evaluation: aiResponse.score
        });
    } catch (error) {
        console.error('Error processing move:', error);
        res.status(400).json({ error: error.message });
    }
};