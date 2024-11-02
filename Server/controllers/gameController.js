// controllers/gameController.js
const { createGame, makeMove, runMinimax } = require('../models/gameLogic');

const formatBoard = (board) => {
    return board.map(row => row.join(' ')).join('\n');
};

exports.startGame = (req, res) => {
    try {
        const game = createGame();
        res.status(200).json({ board: formatBoard(game.board) });
    } catch (error) {
        console.error('Error starting game:', error);
        res.status(500).json({ error: 'Failed to start the game' });
    }
};

exports.playMove = (req, res) => {
    try {
        const { board, move, depth } = req.body;
        const game = createGame();
        game.board = board;
        game.makeMove(move);
        const bestMove = runMinimax(game, depth);
        res.status(200).json({ board: formatBoard(game.board), isGameOver: game.isGameOver(), bestMove });
    } catch (error) {
        console.error('Error processing move:', error);
        res.status(400).json({ error: error.message });
    }
};