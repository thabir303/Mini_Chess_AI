// /Server/models/gameLogic.js

const { evaluateBoard } = require('../utils/evaluation');

/**
 * Clones the current game state to avoid mutations.
 * @param {Object} game - The current game instance.
 * @returns {Object} - A cloned copy of the game.
 */
function cloneGame(game) {
    const newGame = exports.createGame();
    newGame.board = JSON.parse(JSON.stringify(game.board));
    newGame.turn = game.turn;
    newGame.moveHistory = [...game.moveHistory];
    newGame.winner = game.winner;
    newGame.gameStatus = game.gameStatus;
    newGame.checkmateTime = game.checkmateTime; // Preserve checkmateTime
    return newGame;
}

function isValidPosition(x, y) {
    return x >= 0 && x < 6 && y >= 0 && y < 5;
}

function getKingPosition(game, color) {
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 5; j++) {
            const piece = game.board[i][j];
            if ((color === 'w' && piece === 'K') || (color === 'b' && piece === 'k')) {
                return [i, j];
            }
        }
    }
    return null;
}

/**
 * Determines if the specified player is in check.
 * @param {Object} game - The current game instance.
 * @param {string} color - 'w' for White or 'b' for Black.
 * @returns {boolean} - True if in check, else false.
 */
function isCheck(game, color) {
    const kingPos = getKingPosition(game, color);
    if (!kingPos) return false; // No king found, technically not in check

    // Clone the game to avoid mutating the original game.turn
    const gameCopy = cloneGame(game);
    gameCopy.turn = color === 'w' ? 'b' : 'w'; // Switch to opponent's turn
    const opponentMoves = generateMoves(gameCopy);

    // Check if any opponent move can capture the king
    return opponentMoves.some(move =>
        move.to[0] === kingPos[0] && move.to[1] === kingPos[1]
    );
}

function isCheckmate(game, color) {
    if (!isCheck(game, color)) return false; // Must be in check to be in checkmate

    const allMoves = generateMoves(game, color);
    for (const move of allMoves) {
        const gameCopy = cloneGame(game);
        try {
            gameCopy.makeMove(move);
            if (!isCheck(gameCopy, color)) {
                return false; // Found a move that escapes check
            }
        } catch (error) {
            // Invalid move, skip
            continue;
        }
    }
    return true; // No moves can escape check
}

function isStalemate(game, color) {
    if (isCheck(game, color)) return false; // Must not be in check for stalemate
    const moves = generateMoves(game, color);
    return moves.length === 0;
}

function isInsufficientMaterial(game) {
    const pieces = game.board.flat().filter(piece => piece !== '.');
    if (pieces.length <= 2) return true; // Only kings left

    // Check for king and minor piece vs king
    if (pieces.length === 3) {
        const nonKings = pieces.filter(p => p.toLowerCase() !== 'k');
        if (nonKings.length === 1) {
            const piece = nonKings[0].toLowerCase();
            return piece === 'n' || piece === 'b';
        }
    }

    return false;
}

/**
 * Creates a new game instance with the initial board setup.
 * @returns {Object} - A new game instance.
 */
exports.createGame = () => {
    return {
        board: [
            ['r', 'n', 'b', 'q', 'k'],
            ['p', 'p', 'p', 'p', 'p'],
            ['.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.'],
            ['P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K']
        ],
        turn: 'w',
        moveHistory: [],
        winner: null,
        gameStatus: null,

        /**
         * Executes a move on the board.
         * @param {Object} move - The move to execute.
         * @returns {Object} - The updated game status.
         */
        makeMove(move) {
            console.log("Promotion: ", move?.promotion);
            const { from, to, promotion } = move;

            // Validate move structure
            if (!Array.isArray(from) || !Array.isArray(to) ||
                from.length !== 2 || to.length !== 2) {
                throw new Error('Invalid move format. Use { from: [x, y], to: [x, y], promotion: "q|r|b|n" }.');
            }

            const [fromX, fromY] = from;
            const [toX, toY] = to;

            // Validate positions
            if (!isValidPosition(fromX, fromY) || !isValidPosition(toX, toY)) {
                throw new Error('Move out of bounds.');
            }

            const piece = this.board[fromX][fromY];
            if (piece === '.') {
                throw new Error('No piece at the selected position.');
            }

            // Validate piece ownership
            if ((this.turn === 'w' && piece !== piece.toUpperCase()) ||
                (this.turn === 'b' && piece !== piece.toLowerCase())) {
                throw new Error('Invalid piece selection. It is not your turn to move this piece.');
            }

            // Generate valid moves for the selected piece
            const validMoves = generatePieceMoves(this, [fromX, fromY]);
            const isValidMove = validMoves.some(m =>
                m.to[0] === toX && m.to[1] === toY
            );

            if (!isValidMove) {
                throw new Error('Invalid move for this piece.');
            }

            const originalPiece = this.board[toX][toY];
            this.board[toX][toY] = piece;
            this.board[fromX][fromY] = '.';

            // Handle pawn promotion
            const isPawn = piece.toLowerCase() === 'p';
            const promotionRow = this.turn === 'w' ? 0 : 5;
            if (isPawn && toX === promotionRow) {
                if (!promotion) {
                    // Revert the move
                    this.board[fromX][fromY] = piece;
                    this.board[toX][toY] = originalPiece;
                    throw new Error('Promotion required. Please specify a promotion piece.');
                }

                const validPromotions = ['q', 'r', 'b', 'n'];
                if (!validPromotions.includes(promotion.toLowerCase())) {
                    // Revert the move
                    this.board[fromX][fromY] = piece;
                    this.board[toX][toY] = originalPiece;
                    throw new Error('Invalid promotion piece. Choose from q, r, b, n.');
                }

                // Promote the pawn
                const promotedPiece = this.turn === 'w' ? promotion.toUpperCase() : promotion.toLowerCase();
                this.board[toX][toY] = promotedPiece;
            }

            // Check if the move leaves the player's own king in check
            if (isCheck(this, this.turn)) {
                // Revert the move
                this.board[fromX][fromY] = piece;
                this.board[toX][toY] = originalPiece;
                throw new Error('Move would put or leave your king in check.');
            }

            // Record the move
            this.moveHistory.push({
                from: move.from,
                to: move.to,
                piece: piece,
                captured: originalPiece !== '.',
                promotion: promotion || null
            });

            // Switch turn to the opponent
            this.turn = this.turn === 'w' ? 'b' : 'w';

            // Update game status after move
            const status = this.getGameStatus();
            this.gameStatus = status;
            if (status.isOver) {
                this.winner = status.winner;
            }

            return status;
        },

        /**
         * Retrieves the current game status.
         * @returns {Object} - The game status.
         */
        getGameStatus() {
            const opponent = this.turn === 'w' ? 'b' : 'w';

            if (isCheckmate(this, opponent)) {
                return {
                    isOver: true,
                    result: 'checkmate',
                    winner: this.turn,
                    message: `Checkmate! ${this.turn === 'w' ? 'White' : 'Black'} wins!`
                };
            }

            if (isStalemate(this, opponent)) {
                return {
                    isOver: true,
                    result: 'stalemate',
                    winner: 'draw',
                    message: 'Game drawn by stalemate!'
                };
            }

            if (isInsufficientMaterial(this)) {
                return {
                    isOver: true,
                    result: 'insufficient',
                    winner: 'draw',
                    message: 'Game drawn by insufficient material!'
                };
            }

            if (this.moveHistory.length >= 100) {
                return {
                    isOver: true,
                    result: '50-move-rule',
                    winner: 'draw',
                    message: 'Game drawn by 50-move rule!'
                };
            }

            return {
                isOver: false,
                result: null,
                winner: null,
                message: `${this.turn === 'w' ? 'White' : 'Black'} to move`
            };
        },

        isGameOver() {
            const status = this.getGameStatus();
            return status.isOver;
        },
        getValidMoves(position) {
            const moves = generatePieceMoves(this, position);
            console.log("Valid moves: ", moves);
            return moves.filter(move => {
                const gameCopy = cloneGame(this);
                try {
                    gameCopy.makeMove(move);
                    return !isCheck(gameCopy, this.turn);
                } catch {
                    return false;
                }
            });
        }
    };
};
/**
 * Processes a move based on the current board state and the move object.
 * @param {Array} boardState - The current board state as a 6x5 array.
 * @param {Object} move - The move to execute.
 * @returns {Object} - The updated board state and game status.
 */
exports.makeMove = (boardState, move) => {
    try {
        console.log('Making move with board state:', boardState, 'and move:', move);
        if (!Array.isArray(boardState) || boardState.length !== 6 || !Array.isArray(boardState[0]) || boardState[0].length !== 5) {
            throw new Error('Invalid board state format. Ensure it is a 6x5 array.');
        }
        const game = exports.createGame();
        game.board = boardState;
        // Determine whose turn it is based on move history or external input
        // For simplicity, assuming 'w' to move. Adjust as necessary.
        game.turn = 'w'; // You might need to pass the current turn as part of the board state or separately
        const status = game.makeMove(move);
        const isGameOver = game.isGameOver();
        return { board: game.board, isGameOver, status };
    } catch (error) {
        throw new Error(`Error processing move: ${error.message}`);
    }
};

/**
 * Executes the Minimax algorithm to determine the best move.
 * @param {Object} game - The current game instance.
 * @param {number} depth - The depth of the search tree.
 * @param {number} alpha - Alpha value for pruning.
 * @param {number} beta - Beta value for pruning.
 * @param {boolean} maximizingPlayer - True if maximizing player, else false.
 * @returns {Object} - The evaluation score and best move.
 */
exports.runMinimax = (game, depth, alpha = -Infinity, beta = Infinity, maximizingPlayer = true) => {
    console.log(`Running minimax at depth ${depth} for ${maximizingPlayer ? 'maximizing' : 'minimizing'} player.`);
    if (depth <= 0 || game.isGameOver()) {
        return { score: evaluatePosition(game) };
    }
    if (maximizingPlayer) {
        let maxEval = -Infinity;
        let bestMove = null;
        const moves = generateMoves(game, game.turn);
        for (const move of moves) {
            const gameCopy = cloneGame(game);
            try {
                gameCopy.makeMove(move);
                const evaluation = exports.runMinimax(gameCopy, depth - 1, alpha, beta, false).score;
                if (evaluation > maxEval) {
                    maxEval = evaluation;
                    bestMove = move;
                }
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            } catch (err) {
                console.error('Error during minimax move generation:', err);
            }
        }
        return { score: maxEval, bestMove };
    } else {
        let minEval = Infinity;
        let bestMove = null;
        const moves = generateMoves(game, game.turn);
        for (const move of moves) {
            const gameCopy = cloneGame(game);
            try {
                gameCopy.makeMove(move);
                const evaluation = exports.runMinimax(gameCopy, depth - 1, alpha, beta, true).score;
                if (evaluation < minEval) {
                    minEval = evaluation;
                    bestMove = move;
                }
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            } catch (err) {
                console.error('Error during minimax move generation:', err);
            }
        }
        return { score: minEval };
    }
};

/**
 * Evaluates the current board position.
 * @param {Object} game - The current game instance.
 * @returns {number} - The evaluation score.
 */
function evaluatePosition(game) {
    console.log('Evaluating position.');
    let score = evaluateBoard(game);

    // Add positional bonuses
    if (game.gameStatus && game.gameStatus.isOver && game.gameStatus.result === 'checkmate') {
        score += (game.turn === 'b' ? 20000 : -20000);
    }

    if (game.gameStatus && (game.gameStatus.result === 'stalemate' || game.gameStatus.result === 'insufficient')) {
        score = 0;
    }

    return score;
}

/**
 * Generates all possible moves for the specified player.
 * @param {Object} game - The current game instance.
 * @param {string} color - 'w' for White or 'b' for Black.
 * @returns {Array} - Array of move objects.
 */
function generateMoves(game, color = game.turn) {
    console.log('Generating moves for the current game state.');
    const moves = [];
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 5; j++) {
            const piece = game.board[i][j];
            if (piece !== '.' && ((color === 'w' && piece === piece.toUpperCase()) || (color === 'b' && piece === piece.toLowerCase()))) {
                moves.push(...generatePieceMoves(game, [i, j]));
            }
        }
    }
    console.log(`Total moves generated: ${moves.length}`);
    return moves;
}

/**
 * Generates all possible moves for a specific piece.
 * @param {Object} game - The current game instance.
 * @param {Array} position - [x, y] position of the piece.
 * @returns {Array} - Array of move objects.
 */
function generatePieceMoves(game, position) {
    const [x, y] = position;
    const piece = game.board[x][y].toLowerCase();
    const moves = [];

    switch (piece) {
        case 'p':
            moves.push(...generatePawnMoves(game, position));
            break;
        case 'n':
            moves.push(...generateKnightMoves(game, position));
            break;
        case 'b':
            moves.push(...generateBishopMoves(game, position));
            break;
        case 'r':
            moves.push(...generateRookMoves(game, position));
            break;
        case 'q':
            moves.push(...generateQueenMoves(game, position));
            break;
        case 'k':
            moves.push(...generateKingMoves(game, position));
            break;
    }
    console.log(`Generated ${moves.length} moves for piece ${piece} at position ${position}.`);
    return moves;
}

/**
 * Generates all possible pawn moves from a given position.
 * @param {Object} game - The current game instance.
 * @param {Array} position - [x, y] position of the pawn.
 * @returns {Array} - Array of move objects.
 */
function generatePawnMoves(game, position) {
    const [x, y] = position;
    const moves = [];
    const direction = game.turn === 'w' ? -1 : 1;  // White moves up (-1), Black moves down (+1)
    const promotionRow = game.turn === 'w' ? 0 : 5; // Row where promotion happens

    // Single step forward
    if (x + direction >= 0 && x + direction < 6) {
        if (game.board[x + direction][y] === '.') {  // Check if the square directly in front is empty
            if (x + direction === promotionRow) {
                // Move to the promotion row, add promotion move
                moves.push({ from: position, to: [x + direction, y], promotion: 'q' });
            } else {
                // Regular forward move
                moves.push({ from: position, to: [x + direction, y] });
            }
        }
    }

    // Double step forward from the starting position
    const canDoubleMove = (game.turn === 'w' && x === 4) || (game.turn === 'b' && x === 1);
    if (canDoubleMove && game.board[x + direction][y] === '.' && game.board[x + 2 * direction][y] === '.') {
        moves.push({ from: position, to: [x + 2 * direction, y] });
    }

    // Captures (diagonal moves)
    for (const side of [-1, 1]) { 
        if (y + side >= 0 && y + side < 5 && x + direction >= 0 && x + direction < 6) {
            const targetPiece = game.board[x + direction][y + side];
            if (targetPiece !== '.' &&
                ((game.turn === 'w' && targetPiece === targetPiece.toLowerCase()) ||
                 (game.turn === 'b' && targetPiece === targetPiece.toUpperCase()))) {
                if (x + direction === promotionRow) {
                    // Capture and promote on the last row
                    moves.push({ from: position, to: [x + direction, y + side], promotion: 'q' });
                } else {
                    // Regular capture
                    moves.push({ from: position, to: [x + direction, y + side] });
                }
            }
        }
    }

    return moves;
}

/**
 * Generates all possible knight moves from a given position.
 * @param {Object} game - The current game instance.
 * @param {Array} position - [x, y] position of the knight.
 * @returns {Array} - Array of move objects.
 */
function generateKnightMoves(game, position) {
    const [x, y] = position;
    const moves = [];
    const knightMoves = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2]
    ];

    for (const [dx, dy] of knightMoves) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < 6 && ny >= 0 && ny < 5) {
            const target = game.board[nx][ny];
            if (target === '.' || (game.turn === 'w' && target === target.toLowerCase()) || (game.turn === 'b' && target === target.toUpperCase())) {
                moves.push({ from: position, to: [nx, ny] });
                console.log(`Knight move to [${nx}, ${ny}] added.`);
            }
        }
    }

    return moves;
}

/**
 * Generates all possible queen moves from a given position.
 * @param {Object} game - The current game instance.
 * @param {Array} position - [x, y] position of the queen.
 * @returns {Array} - Array of move objects.
 */
function generateQueenMoves(game, position) {
    console.log('Generating queen moves.');
    const rookMoves = generateRookMoves(game, position);
    const bishopMoves = generateBishopMoves(game, position);

    return rookMoves.concat(bishopMoves);
}

/**
 * Generates all possible rook moves from a given position.
 * @param {Object} game - The current game instance.
 * @param {Array} position - [x, y] position of the rook.
 * @returns {Array} - Array of move objects.
 */
function generateRookMoves(game, position) {
    const [x, y] = position;
    const moves = [];
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]; // Down, Up, Right, Left

    for (const [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        while (nx >= 0 && nx < 6 && ny >= 0 && ny < 5) { // Ensure the position is within board bounds
            const target = game.board[nx][ny];
            if (target === '.') { // Empty square
                moves.push({ from: position, to: [nx, ny] });
                console.log(`Rook move to [${nx}, ${ny}] added.`);
            } else {
                // If it's an opponent's piece, we can capture it
                if ((game.turn === 'w' && target === target.toLowerCase()) || (game.turn === 'b' && target === target.toUpperCase())) {
                    moves.push({ from: position, to: [nx, ny] });
                    console.log(`Rook capture move to [${nx}, ${ny}] added.`);
                }
                break; 
            }
            nx += dx;
            ny += dy;
        }
    }

    return moves;
}

/**
 * Generates all possible bishop moves from a given position.
 * @param {Object} game - The current game instance.
 * @param {Array} position - [x, y] position of the bishop.
 * @returns {Array} - Array of move objects.
 */
function generateBishopMoves(game, position) {
    const [x, y] = position;
    const moves = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; 

    for (const [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        while (nx >= 0 && nx < 6 && ny >= 0 && ny < 5) {  
            const target = game.board[nx][ny];
            if (target === '.') { // Empty square
                moves.push({ from: position, to: [nx, ny] });
                console.log(`Bishop move to [${nx}, ${ny}] added.`);
            } else {
                // If it's an opponent's piece, we can capture it
                if ((game.turn === 'w' && target === target.toLowerCase()) || (game.turn === 'b' && target === target.toUpperCase())) {
                    moves.push({ from: position, to: [nx, ny] });
                    console.log(`Bishop capture move to [${nx}, ${ny}] added.`);
                }
                break; // Stop moving in this direction after encountering a piece
            }
            nx += dx;
            ny += dy;
        }
    }

    return moves;
}

/**
 * Generates all possible king moves from a given position.
 * @param {Object} game - The current game instance.
 * @param {Array} position - [x, y] position of the king.
 * @returns {Array} - Array of move objects.
 */
function generateKingMoves(game, position) {
    const [x, y] = position;
    const moves = [];
    const kingMoves = [
        [1, 0], [-1, 0], [0, 1], [0, -1], // Horizontal and vertical moves
        [1, 1], [1, -1], [-1, 1], [-1, -1] // Diagonal moves
    ];

    for (const [dx, dy] of kingMoves) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < 6 && ny >= 0 && ny < 5) { // Ensure within bounds
            const target = game.board[nx][ny];
            if (target === '.' || (game.turn === 'w' && target === target.toLowerCase()) || (game.turn === 'b' && target === target.toUpperCase())) {
                moves.push({ from: position, to: [nx, ny] });
                console.log(`King move to [${nx}, ${ny}] added.`);
            }
        }
    }

    return moves;
}

// Export all necessary functions
module.exports = {
    createGame: exports.createGame,
    makeMove: exports.makeMove,
    runMinimax: exports.runMinimax,
    // Internal functions that need to be exported
    generatePieceMoves,
    cloneGame,
    isCheck,
    isCheckmate,
    isStalemate,
    isInsufficientMaterial,
    evaluatePosition,
    generateMoves,
    isValidPosition,
    generatePawnMoves,
    generateKnightMoves,
    generateBishopMoves,
    generateRookMoves,
    generateQueenMoves,
    generateKingMoves
};
