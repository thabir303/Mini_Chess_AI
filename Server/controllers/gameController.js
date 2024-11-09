// /Server/controllers/gameController.js

const { createGame, runMinimax } = require('../models/gameLogic');

exports.startGame = (req, res) => {
    try {
        const game = createGame();
        res.status(200).json({ 
            board: game.board,
            turn: game.turn,
            message: "Game started! White's turn.",
            status: 'game_started' 
        });
    } catch (error) {
        console.error('Error starting game:', error);
        res.status(500).json({ error: 'Failed to start game' });
    }
};

exports.playMove = (req, res) => {
    try {
        const { board, move, turn, gameMode = 'human' } = req.body; 
        
        // Validate request body
        if (!board || !move || !turn) {
            return res.status(400).json({ 
                error: 'Missing required fields. Need board, move, and turn.' 
            });
        }

        // Validate move format
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
            // Validate piece selection
            const [fromX, fromY] = move.from;
            const piece = game.board[fromX][fromY];
            if (piece === '.') {
                return res.status(400).json({ error: 'No piece at selected position' });
            }

            // Validate correct player's turn
            if ((turn === 'w' && piece !== piece.toUpperCase()) ||
                (turn === 'b' && piece !== piece.toLowerCase())) {
                return res.status(400).json({ 
                    error: `Invalid piece selection. It is ${turn === 'w' ? 'White' : 'Black'}'s turn.`
                });
            }

            // Get valid moves for the selected piece
            const validMoves = game.getValidMoves(move.from);
            const isValidMove = validMoves.some(validMove => 
                validMove.to[0] === move.to[0] && validMove.to[1] === move.to[1]
            );

            if (!isValidMove) {
                return res.status(400).json({ error: 'Invalid move for this piece' });
            }

            // Make the human move and get game status
            const moveResult = game.makeMove(move);
            console.log('Move result:', moveResult);

            if (moveResult.isOver) {
                console.log(`Game over detected in controller - ${moveResult.message}`);
            }

            // Prepare response object
            const response = {
                board: game.board,
                turn: game.turn,
                lastMove: move,
                isGameOver: moveResult.isOver,
                message: moveResult.message,
                gameStatus: moveResult
            };

            // Handle AI move if in 'ai' mode and game is not over
            if (gameMode === 'ai' && !moveResult.isOver) {
                try {
                    const aiResponse = runMinimax(game, 3); // Depth of 3 for now
                    if (aiResponse && aiResponse.bestMove) {
                        const aiMoveResult = game.makeMove(aiResponse.bestMove);
                        response.board = game.board;
                        response.turn = game.turn;
                        response.lastMove = aiResponse.bestMove;
                        response.isGameOver = aiMoveResult.isOver;
                        response.message = aiMoveResult.message;
                        response.gameStatus = aiMoveResult;
                    }
                } catch (aiError) {
                    console.log('AI move generation skipped:', aiError.message);
                    // Don't throw error - just continue with human move
                }
            }

            return res.status(200).json(response);

        } catch (moveError) {
            // Check if the error is related to promotion
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
};

exports.getValidMoves = (req, res) => {
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

        // Validate piece selection
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
};