// /Server/controllers/gameController.js

const { createGame, getBestMove, isCheck, generateMoves, cloneGame } = require('../models/gameLogic');

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

            // If the game mode is AI vs AI, make the first AI move automatically
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

            // Validate input fields
            if (!board || !move || !turn) {
                return res.status(400).json({ 
                    error: 'Missing required fields. Need board, move, and turn.' 
                });
            }

            // Validate move structure
            if (!move.from || !move.to || 
                !Array.isArray(move.from) || !Array.isArray(move.to) ||
                move.from.length !== 2 || move.to.length !== 2) {
                return res.status(400).json({ 
                    error: 'Invalid move format. Expected {from: [x, y], to: [x, y], promotion?: "q|r|b|n"}' 
                });
            }

            // Set up game state
            const game = createGame();
            game.board = board;
            game.turn = turn;

            try {
                // Attempt to make the move and get the result, including any captured piece
                const moveResult = game.makeMove(move);
                const capturedPiece = moveResult.captured ? moveResult.captured : null; // Track captured piece if available
                
                const response = {
                    board: game.board,
                    turn: game.turn,
                    lastMove: move,
                    isGameOver: moveResult.isOver,
                    message: moveResult.message,
                    gameStatus: moveResult,
                    capturedPiece, // Include captured piece in response
                };

                // If game over, respond with the current status
                if (moveResult.isOver) {
                    return res.status(200).json(response);
                }

                // For Human vs AI, make AI's move if it's the AI's turn
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
                }
                // For AI vs AI, make both moves automatically
                else if (gameMode === 'ai-vs-ai') {
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
                // Handle promotion requirement by returning additional details
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
            
            // Validate input fields
            if (!board || !position || !turn) {
                return res.status(400).json({ 
                    error: 'Missing required fields' 
                });
            }

            // Validate position format
            if (!Array.isArray(position) || position.length !== 2) {
                return res.status(400).json({ 
                    error: 'Invalid position format' 
                });
            }

            // Set up game state
            const game = createGame();
            game.board = board;
            game.turn = turn;
            
            const [x, y] = position;
            const piece = game.board[x][y];

            // Check if the selected piece belongs to the player
            const isValidPiece = piece !== '.' && (
                (turn === 'w' && piece === piece.toUpperCase()) ||
                (turn === 'b' && piece === piece.toLowerCase())
            );

            // Return error if selected piece is invalid
            if (!isValidPiece) {
                return res.status(400).json({
                    error: `Invalid piece selection. It is ${turn === 'w' ? 'White' : 'Black'}'s turn.`,
                    validMoves: []
                });
            }

            // Generate valid moves for the selected piece
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
            const { board, turn, gameMode } = req.body;

            // Input validation
            if (!board || !turn) {
                return res.status(400).json({ 
                    error: 'Missing required fields' 
                });
            }

            if (!Array.isArray(board) || board.length !== 6 || 
                !board.every(row => Array.isArray(row) && row.length === 5)) {
                return res.status(400).json({ 
                    error: 'Invalid board format' 
                });
            }

            if (turn !== 'w' && turn !== 'b') {
                return res.status(400).json({ 
                    error: 'Invalid turn value' 
                });
            }

            // Initialize game state
            const game = createGame();
            game.board = JSON.parse(JSON.stringify(board));
            game.turn = turn;

            // Check current game status
            const currentStatus = game.getGameStatus();
            if (currentStatus.isOver) {
                return res.status(200).json({
                    board: game.board,
                    turn: game.turn,
                    isGameOver: true,
                    gameStatus: currentStatus,
                    message: currentStatus.message
                });
            }

            let aiMove = null;
            let moveResult = null;
            const maxAttempts = 3;
            const timeLimit = gameMode === 'ai-vs-ai' ? 2000 : 3000;

            // If in check, handle it with priority
            if (isCheck(game, turn)) {
                const allMoves = generateMoves(game, turn);

                // First try moves that capture attacking pieces
                const capturingMoves = allMoves.filter(move => {
                    const targetSquare = game.board[move.to[0]][move.to[1]];
                    return targetSquare !== '.';
                });

                // Try capturing moves first
                for (const move of capturingMoves) {
                    const gameCopy = cloneGame(game);
                    try {
                        gameCopy.makeMove(move);
                        if (!isCheck(gameCopy, turn)) {
                            aiMove = move;
                            moveResult = game.makeMove(move);
                            break;
                        }
                    } catch (error) {
                        continue;
                    }
                }

                // If no capturing moves work, try all other moves
                if (!aiMove) {
                    for (const move of allMoves) {
                        const gameCopy = cloneGame(game);
                        try {
                            gameCopy.makeMove(move);
                            if (!isCheck(gameCopy, turn)) {
                                aiMove = move;
                                moveResult = game.makeMove(move);
                                break;
                            }
                        } catch (error) {
                            continue;
                        }
                    }
                }

                // If still no valid move, it's checkmate
                if (!aiMove) {
                    const status = {
                        isOver: true,
                        result: 'checkmate',
                        winner: turn === 'w' ? 'b' : 'w',
                        message: `Checkmate! ${turn === 'w' ? 'Black' : 'White'} wins!`
                    };
                    return res.status(200).json({
                        board: game.board,
                        turn: game.turn,
                        isGameOver: true,
                        gameStatus: status
                    });
                }
            } else {
                // Not in check, try to make best move
                for (let attempt = 0; attempt < maxAttempts && !aiMove; attempt++) {
                    try {
                        const gameCopy = cloneGame(game);
                        const possibleMove = getBestMove(gameCopy, timeLimit);
                        
                        if (possibleMove) {
                            // Validate move before making it
                            const validMoves = game.getValidMoves([possibleMove.from[0], possibleMove.from[1]]);
                            const isValidMove = validMoves.some(m =>
                                m.to[0] === possibleMove.to[0] && m.to[1] === possibleMove.to[1]
                            );

                            if (isValidMove) {
                                moveResult = game.makeMove(possibleMove);
                                aiMove = possibleMove;
                                break;
                            }
                        }
                    } catch (error) {
                        continue;
                    }
                }

                // If still no move found, try any valid move
                if (!aiMove) {
                    const moves = generateMoves(game, turn);
                    for (const move of moves) {
                        try {
                            const gameCopy = cloneGame(game);
                            gameCopy.makeMove(move);
                            aiMove = move;
                            moveResult = game.makeMove(move);
                            break;
                        } catch (error) {
                            continue;
                        }
                    }
                }
            }

            // Final check if we found a valid move
            if (!aiMove || !moveResult) {
                const status = game.getGameStatus();
                return res.status(200).json({
                    board: game.board,
                    turn: game.turn,
                    isGameOver: status.isOver,
                    gameStatus: status,
                    message: status.message || 'No valid moves available'
                });
            }

            // Success response
            return res.status(200).json({ 
                move: aiMove,
                board: game.board,
                turn: game.turn,
                isGameOver: moveResult.isOver,
                message: moveResult.message,
                gameStatus: moveResult,
                thinking: false
            });

        } catch (error) {
            console.error('Error in getAIMove:', error);
            res.status(500).json({ 
                error: 'Internal server error while generating AI move',
                details: error.message
            });
        }
    }
};

module.exports = gameController;
