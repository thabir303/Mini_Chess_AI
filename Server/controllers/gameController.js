const { createGame, makeMove, runMinimax, generatePieceMoves, cloneGame, isCheck } = require('../models/gameLogic');

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
        const { board, move, depth = 3, turn } = req.body;
        
        if (!board || !move) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const game = createGame();
        game.board = board;
        game.turn = turn;
        
        game.makeMove(move);
        
        if (game.isGameOver()) {
            return res.status(200).json({
                board: game.board,
                isGameOver: true,
                winner: 'player'
            });
        }

        const aiResponse = runMinimax(game, depth);
        
        if (aiResponse.bestMove) {
            game.makeMove(aiResponse.bestMove);
        }

        res.status(200).json({
            board: game.board,
            isGameOver: game.isGameOver(),
            lastMove: aiResponse.bestMove,
            evaluation: aiResponse.score,
            turn: game.turn
        });
    } catch (error) {
        console.error('Error processing move:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.getValidMoves = (req, res) => {
    try {
        const { board, position, turn } = req.body;
        
        if (!board || !position) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const game = createGame();
        game.board = board;
        game.turn = turn;
        
        const moves = generatePieceMoves(game, position);
        
        // Filter out moves that would put the king in check
        const validMoves = moves.filter(move => {
            const gameCopy = cloneGame(game);
            try {
                gameCopy.makeMove(move);
                return !isCheck(gameCopy);
            } catch (error) {
                return false;
            }
        });

        res.status(200).json({ validMoves });
    } catch (error) {
        console.error('Error getting valid moves:', error);
        res.status(400).json({ error: error.message });
    }
};