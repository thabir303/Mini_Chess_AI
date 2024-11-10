// /Server/controllers/gameController.js

const { createGame, getBestMove } = require('../models/gameLogic');

const gameController = {
    startGame: (req, res) => {
        try {
            const { gameMode = 'human' } = req.body;
            if (!['human', 'ai', 'ai-vs-ai'].includes(gameMode)) {
                return res.status(400).json({ error: 'Invalid game mode' });
            }

            const game = createGame();
            const response = { 
                board: game.board,
                turn: game.turn,
                gameMode: gameMode,
                message: "Game started! White's turn.",
                status: 'game_started' 
            };

            if (gameMode === 'ai-vs-ai') {
                const aiMove = getBestMove(game);
                if (aiMove) {
                    const moveResult = game.makeMove(aiMove);
                    response.board = game.board;
                    response.turn = game.turn;
                    response.lastMove = aiMove;
                    response.message = moveResult.message;
                }
            }

            res.status(200).json(response);
        } catch (error) {
            console.error('Error starting game:', error);
            res.status(500).json({ error: 'Failed to start game' });
        }
    },

    playMove: async (req, res) => {
        try {
            const { board, move, turn, gameMode = 'human' } = req.body;

            if (!board || !move || !turn) {
                return res.status(400).json({ 
                    error: 'Missing required fields. Need board, move, and turn.' 
                });
            }

            if (!move.from || !move.to || 
                !Array.isArray(move.from) || !Array.isArray(move.to) ||
                move.from.length !== 2 || move.to.length !== 2) {
                return res.status(400).json({ 
                    error: 'Invalid move format. Expected {from: [x, y], to: [x, y], promotion?: "q|r|b|n"}' 
                });
            }

            const game = createGame();
            game.board = board;
            game.turn = turn;

            try {
                const moveResult = game.makeMove(move);
                const response = {
                    board: game.board,
                    turn: game.turn,
                    lastMove: move,
                    isGameOver: moveResult.isOver,
                    message: moveResult.message,
                    gameStatus: moveResult
                };

                if (moveResult.isOver) {
                    return res.status(200).json(response);
                }

                if (gameMode === 'ai' && game.turn === 'b') {
                    const aiMove = getBestMove(game);
                    if (aiMove) {
                        const aiMoveResult = game.makeMove(aiMove);
                        response.board = game.board;
                        response.turn = game.turn;
                        response.lastMove = aiMove;
                        response.isGameOver = aiMoveResult.isOver;
                        response.message = aiMoveResult.message;
                        response.gameStatus = aiMoveResult;
                    }
                } else if (gameMode === 'ai-vs-ai') {
                    const aiMove = getBestMove(game);
                    if (aiMove) {
                        const aiMoveResult = game.makeMove(aiMove);
                        response.board = game.board;
                        response.turn = game.turn;
                        response.lastMove = aiMove;
                        response.isGameOver = aiMoveResult.isOver;
                        response.message = aiMoveResult.message;
                        response.gameStatus = aiMoveResult;
                    }
                }

                return res.status(200).json(response);

            } catch (moveError) {
                if (moveError.message.includes('Promotion required')) {
                    return res.status(400).json({ 
                        error: moveError.message,
                        requiresPromotion: true,
                        validPromotions: ['q', 'r', 'b', 'n'],
                        move: move
                    });
                }

                return res.status(400).json({ 
                    error: moveError.message || 'Invalid move'
                });
            }

        } catch (error) {
            console.error('Error processing move:', error);
            res.status(500).json({ 
                error: 'Internal server error while processing move'
            });
        }
    },

    getValidMoves: (req, res) => {
        try {
            const { board, position, turn } = req.body;
            
            if (!board || !position || !turn) {
                return res.status(400).json({ 
                    error: 'Missing required fields' 
                });
            }

            if (!Array.isArray(position) || position.length !== 2) {
                return res.status(400).json({ 
                    error: 'Invalid position format' 
                });
            }

            const game = createGame();
            game.board = board;
            game.turn = turn;
            
            const [x, y] = position;
            const piece = game.board[x][y];

            const isValidPiece = piece !== '.' && (
                (turn === 'w' && piece === piece.toUpperCase()) ||
                (turn === 'b' && piece === piece.toLowerCase())
            );

            if (!isValidPiece) {
                return res.status(400).json({
                    error: `Invalid piece selection. It is ${turn === 'w' ? 'White' : 'Black'}'s turn.`,
                    validMoves: []
                });
            }

            const validMoves = game.getValidMoves(position);
            
            res.status(200).json({
                validMoves,
                message: validMoves.length === 0 ? 
                    'No valid moves available' : 
                    `Found ${validMoves.length} valid moves`
            });

        } catch (error) {
            console.error('Error getting valid moves:', error);
            res.status(400).json({ error: error.message });
        }
    },

    getAIMove: async (req, res) => {
        try {
            const { board, turn } = req.body;

            if (!board || !turn) {
                return res.status(400).json({ 
                    error: 'Missing required fields' 
                });
            }

            const game = createGame();
            game.board = board;
            game.turn = turn;

            const aiMove = getBestMove(game);
            
            if (!aiMove) {
                return res.status(400).json({ 
                    error: 'No valid AI move found' 
                });
            }

            const moveResult = game.makeMove(aiMove);

            res.status(200).json({ 
                move: aiMove,
                board: game.board,
                turn: game.turn,
                isGameOver: moveResult.isOver,
                message: moveResult.message,
                gameStatus: moveResult
            });

        } catch (error) {
            console.error('Error generating AI move:', error);
            res.status(500).json({ 
                error: 'Failed to generate AI move' 
            });
        }
    }
};

module.exports = gameController;