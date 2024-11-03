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
        const { board, move, turn, gameMode = 'human' } = req.body;  // Default to human mode
        
        // Validate request body
        if (!board || !move || !turn) {
            return res.status(400).json({ 
                error: 'Missing required fields. Need board, move, and turn.' 
            });
        }

        // Validate move object structure
        if (!move.from || !move.to || 
            !Array.isArray(move.from) || !Array.isArray(move.to) ||
            move.from.length !== 2 || move.to.length !== 2) {
            return res.status(400).json({ 
                error: 'Invalid move format. Expected {from: [x, y], to: [x, y]}' 
            });
        }

        // Create game instance with current state
        const game = createGame();
        game.board = board;
        game.turn = turn;

        try {
            // Make the human move and get the game status
            const moveResult = game.makeMove(move);
            
            // Prepare response object
            const response = {
                board: game.board,
                turn: game.turn,  // Next player's turn
                lastMove: move,
                isGameOver: moveResult.isOver,
                message: moveResult.message
            };

            // Add game over details if applicable
            if (moveResult.isOver) {
                response.gameStatus = moveResult.result;
                response.winner = moveResult.winner;
                return res.status(200).json(response);
            }

            // For future AI implementation - keeping the structure but not executing for now
            if (gameMode === 'ai' && !moveResult.isOver) {
                try {
                    // This will be implemented properly in the future
                    const aiResponse = runMinimax(game, 3); // Depth of 3 for now
                    if (aiResponse && aiResponse.bestMove) {
                        // Store AI's move information but don't execute it for now
                        response.aiMove = aiResponse.bestMove;
                        response.evaluation = aiResponse.score;
                    }
                } catch (aiError) {
                    console.log('AI move generation skipped:', aiError.message);
                    // Don't throw error - just continue with human move
                }
            }

            return res.status(200).json(response);

        } catch (moveError) {
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
        
        // Validate request body
        if (!board || !position || !turn) {
            return res.status(400).json({ 
                error: 'Missing required fields. Need board, position, and turn.' 
            });
        }

        // Validate position format
        if (!Array.isArray(position) || position.length !== 2) {
            return res.status(400).json({ 
                error: 'Invalid position format. Expected [x, y]' 
            });
        }

        const game = createGame();
        game.board = board;
        game.turn = turn;
        
        // Get valid moves for the selected piece
        const validMoves = game.getValidMoves(position);
        
        // Validate piece selection
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

        res.status(200).json({
            validMoves,
            message: validMoves.length === 0 ? 
                'No valid moves available for this piece' : 
                `Found ${validMoves.length} valid moves`
        });

    } catch (error) {
        console.error('Error getting valid moves:', error);
        res.status(400).json({ error: error.message });
    }
};