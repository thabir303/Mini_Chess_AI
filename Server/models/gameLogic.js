// /Server/models/gameLogic.js

const { evaluateBoard } = require('../utils/evaluation');

const transpositionTable = {
    table: new Map(),
    maxSize: 1000000,
    generateHash: (board, turn) => JSON.stringify(board) + turn,
    store: function(board, turn, depth, value, flag, bestMove) {
        const hash = this.generateHash(board, turn);
        this.table.set(hash, { depth, value, flag, bestMove });
        if (this.table.size > this.maxSize) {
            const firstKey = this.table.keys().next().value;
            this.table.delete(firstKey);
        }
    },
    lookup: function(board, turn) {
        const hash = this.generateHash(board, turn);
        return this.table.get(hash);
    },
    clear: function() {
        this.table.clear();
    }
};


function cloneGame(game) {
    const newGame = exports.createGame();
    newGame.board = JSON.parse(JSON.stringify(game.board));
    newGame.turn = game.turn;
    newGame.moveHistory = [...game.moveHistory];
    newGame.winner = game.winner;
    newGame.gameStatus = game.gameStatus;
    return newGame;
}

function isValidPosition(x, y) {
    return x >= 0 && x < 6 && y >= 0 && y < 5;
}

function getKingPosition(game, color) {
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 5; j++) {
            const piece = game.board[i][j];
            if ((color === 'w' && piece === 'K') || 
                (color === 'b' && piece === 'k')) {
                return [i, j];
            }
        }
    }
    return null;
}

/**
 * Determines if the specified player is in check.
 */
function isCheck(game, color) {
    const kingPos = getKingPosition(game, color);
    if (!kingPos) return false;

    const gameCopy = cloneGame(game);
    gameCopy.turn = color === 'w' ? 'b' : 'w';
    const opponentMoves = generateMoves(gameCopy);

    return opponentMoves.some(move =>
        move.to[0] === kingPos[0] && move.to[1] === kingPos[1]
    );
}

function quiescenceSearch(game, alpha, beta, depth, maxDepth = 4) {
    if (depth >= maxDepth) return evaluateBoard(game);

    const standPat = evaluateBoard(game);
    
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;

    const moves = generateMoves(game).filter(move => {
        const [toX, toY] = move.to;
        return game.board[toX][toY] !== '.';
    });
    
    for (const move of moves) {
        const gameCopy = cloneGame(game);
        try {
            gameCopy.makeMove(move);
            const score = -quiescenceSearch(gameCopy, -beta, -alpha, depth + 1, maxDepth);
            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        } catch {
            continue;
        }
    }
    return alpha;
}

function alphaBeta(game, depth, alpha, beta, maximizingPlayer, timeLimit) {
    if (Date.now() >= timeLimit) throw new Error('Time limit exceeded');

    const ttEntry = transpositionTable.lookup(game.board, game.turn);
    if (ttEntry && ttEntry.depth >= depth) {
        if (ttEntry.flag === 'exact') return { score: ttEntry.value, bestMove: ttEntry.bestMove };
        if (ttEntry.flag === 'lowerbound' && ttEntry.value > alpha) alpha = ttEntry.value;
        if (ttEntry.flag === 'upperbound' && ttEntry.value < beta) beta = ttEntry.value;
        if (alpha >= beta) return { score: ttEntry.value, bestMove: ttEntry.bestMove };
    }

    if (depth === 0 || game.isGameOver()) {
        const score = quiescenceSearch(game, alpha, beta, 0);
        return { score };
    }

    const moves = generateMoves(game);
    let bestMove = null;
    let bestScore = maximizingPlayer ? -Infinity : Infinity;
    let flag = 'alpha';

    for (const move of moves) {
        const gameCopy = cloneGame(game);
        try {
            gameCopy.makeMove(move);
            const evaluation = alphaBeta(gameCopy, depth - 1, -beta, -alpha, !maximizingPlayer, timeLimit).score;
            const score = -evaluation;

            if (maximizingPlayer) {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
                if (score > alpha) {
                    alpha = score;
                    flag = 'exact';
                }
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
                if (score < beta) {
                    beta = score;
                    flag = 'exact';
                }
            }

            if (alpha >= beta) {
                flag = maximizingPlayer ? 'lowerbound' : 'upperbound';
                break;
            }
        } catch {
            continue;
        }
    }

    transpositionTable.store(game.board, game.turn, depth, bestScore, flag, bestMove);
    return { score: bestScore, bestMove };
}
function getBestMove(game, timeLimit = 5000) {
    const startTime = Date.now();
    const endTime = startTime + timeLimit;
    let bestMove = null;
    let depth = 1;

    try {
        transpositionTable.clear();
        while (Date.now() < endTime && depth <= 10) {
            const result = alphaBeta(
                game,
                depth,
                -Infinity,
                Infinity,
                true,
                endTime
            );
            if (result.bestMove) {
                bestMove = result.bestMove;
                console.log(`Depth ${depth} completed. Best move:`, bestMove);
            }
            depth++;
        }
    } catch (error) {
        if (error.message !== 'Time limit exceeded') throw error;
    }

    return bestMove;
}

function isCheckmate(game, color) {
    console.log(`\nChecking checkmate for ${color}`);

    if (!isCheck(game, color)) {
        console.log(`${color} king is not in check`);
        return false;
    }

    console.log(`${color} king IS in check - checking for escape moves`);


    const allMoves = generateMoves(game, color);
    console.log(`Found ${allMoves.length} possible moves to try escape check`);

    for (const move of allMoves) {
        const gameCopy = cloneGame(game);
        try {
            gameCopy.turn = color;
            gameCopy.makeMove(move);
            if (!isCheck(gameCopy, color)) {
                console.log(`Not in checkmate - found escape move:`, move);
                return false; // Found a move that escapes check
            }
            console.log(`Move ${JSON.stringify(move)} doesn't escape check`);
        } catch (error) {
            continue;
        }
    }
    console.log(`CHECKMATE CONFIRMED - ${color} has no legal moves to escape check`);

    return true;
}

function isStalemate(game, color) {
    if (isCheck(game, color)) return false;
    const moves = generateMoves(game, color);
    return moves.length === 0;
}

function isInsufficientMaterial(game) {
    const pieces = game.board.flat().filter(piece => piece !== '.');
    
    if (pieces.length <= 2) return true; // Only kings left

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

        makeMove(move) {
            console.log('\nAttempting to make move:', move);
            const { from, to, promotion } = move;
        
            if (!Array.isArray(from) || !Array.isArray(to) ||
                from.length !== 2 || to.length !== 2) {
                throw new Error('Invalid move format');
            }
        
            const [fromX, fromY] = from;
            const [toX, toY] = to;
        
            if (!isValidPosition(fromX, fromY) || !isValidPosition(toX, toY)) {
                throw new Error('Move out of bounds');
            }
        
            const piece = this.board[fromX][fromY];
            if (piece === '.') {
                throw new Error('No piece at selected position');
            }
        
            if ((this.turn === 'w' && piece !== piece.toUpperCase()) ||
                (this.turn === 'b' && piece !== piece.toLowerCase())) {
                throw new Error('Not your turn');
            }
        
            const validMoves = generatePieceMoves(this, [fromX, fromY]);
            const isValidMove = validMoves.some(m =>
                m.to[0] === toX && m.to[1] === toY
            );
        
            if (!isValidMove) {
                console.log('Move not found in valid moves list');
                throw new Error('Invalid move for this piece');
            }
        
            // Store original piece for potential move reversal
            const originalPiece = this.board[toX][toY];
            console.log(`Moving ${piece} from [${fromX},${fromY}] to [${toX},${toY}]`);
            this.board[toX][toY] = piece;
            this.board[fromX][fromY] = '.';
        
            // Handle pawn promotion
            const isPawn = piece.toLowerCase() === 'p';
            const promotionRow = this.turn === 'w' ? 0 : 5;
            
            if (isPawn && toX === promotionRow) {
                console.log('Pawn reached promotion row');
                if (!promotion) {
                    // Revert the move
                    this.board[fromX][fromY] = piece;
                    this.board[toX][toY] = originalPiece;
                    throw new Error('Promotion required');
                }
        
                const validPromotions = ['q', 'r', 'b', 'n'];
                if (!validPromotions.includes(promotion.toLowerCase())) {
                    this.board[fromX][fromY] = piece;
                    this.board[toX][toY] = originalPiece;
                    throw new Error('Invalid promotion piece');
                }
        
                this.board[toX][toY] = this.turn === 'w' ? 
                    promotion.toUpperCase() : promotion.toLowerCase();
                console.log(`Pawn promoted to ${this.board[toX][toY]}`);
            }
        
            // Check if move leaves/puts own king in check
            if (isCheck(this, this.turn)) {
                console.log(`Move would leave/keep king in check - reverting move`);
                this.board[fromX][fromY] = piece;
                this.board[toX][toY] = originalPiece;
                throw new Error('Move would leave king in check');
            }
        
            // Record move in history
            this.moveHistory.push({
                from: move.from,
                to: move.to,
                piece: piece,
                captured: originalPiece !== '.',
                promotion: promotion || null
            });
        
            const oldTurn = this.turn;
            this.turn = this.turn === 'w' ? 'b' : 'w';
            console.log(`Turn switched to ${this.turn}`);
        
         
            if (isCheck(this, this.turn)) {
                console.log(`${this.turn} is in check after move`);
                
                const allPossibleMoves = generateMoves(this, this.turn);
                console.log(`Found ${allPossibleMoves.length} possible moves to escape check`);
                
                let canEscapeCheck = false;
                
                // Try each move in the cloned game
                for (const possibleMove of allPossibleMoves) {
                    const gameCopy = cloneGame(this);
                    gameCopy.turn = this.turn; // Ensure correct turn in copy
                    
                    try {
                        const [fx, fy] = possibleMove.from;
                        const [tx, ty] = possibleMove.to;
                        const movingPiece = gameCopy.board[fx][fy];
                        gameCopy.board[fx][fy] = '.';
                        gameCopy.board[tx][ty] = movingPiece;
                        
                        // If this position is not in check, we found an escape
                        if (!isCheck(gameCopy, this.turn)) {
                            canEscapeCheck = true;
                            console.log('Found escape move:', possibleMove);
                            break;
                        }
                        
                        // Revert the move in copy
                        gameCopy.board[fx][fy] = movingPiece;
                        gameCopy.board[tx][ty] = '.';
                    } catch (error) {
                        continue;
                    }
                }
        
                if (!canEscapeCheck) {
                    console.log('CHECKMATE CONFIRMED - no valid moves to escape check');
                    return {
                        isOver: true,
                        result: 'checkmate',
                        winner: oldTurn,
                        message: `Checkmate! ${oldTurn === 'w' ? 'White' : 'Black'} wins!`
                    };
                }
        
                return {
                    isOver: false,
                    result: null,
                    winner: null,
                    message: `${this.turn === 'w' ? 'White' : 'Black'} is in check!`
                };
            }
        
            // Check for stalemate
            const availableMoves = generateMoves(this, this.turn);
            if (availableMoves.length === 0) {
                console.log('STALEMATE DETECTED');
                return {
                    isOver: true,
                    result: 'stalemate',
                    winner: 'draw',
                    message: 'Game drawn by stalemate!'
                };
            }
        
            // Check for insufficient material
            if (isInsufficientMaterial(this)) {
                console.log('INSUFFICIENT MATERIAL DETECTED');
                return {
                    isOver: true,
                    result: 'insufficient',
                    winner: 'draw',
                    message: 'Game drawn by insufficient material!'
                };
            }
        
            // Return normal game status
            return {
                isOver: false,
                result: null,
                winner: null,
                message: `${this.turn === 'w' ? 'White' : 'Black'} to move`
            };
        },
        makeAIMove() {
            const move = getBestMove(this);
            if (move) {
                return this.makeMove(move);
            }
            return null;
        },

        getGameStatus() {
            const opponent = this.turn;
            const current = opponent === 'w' ? 'b' : 'w';
            console.log(`Checking game status: Turn = ${this.turn}, Opponent = ${opponent}`);

            if (isCheckmate(this, opponent)) {
                console.log(`Game over - Checkmate! ${current} wins`);

                return {
                    isOver: true,
                    result: 'checkmate',
                    winner: current,
                    message: `Checkmate! ${current === 'w' ? 'White' : 'Black'} wins!`
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

            // Check if current player is in check
            if (isCheck(this, opponent)) {
                return {
                    isOver: false,
                    result: null,
                    winner: null,
                    message: `${opponent === 'w' ? 'White' : 'Black'} is in check!`
                };
            }

            return {
                isOver: false,
                result: null,
                winner: null,
                message: `${opponent === 'w' ? 'White' : 'Black'} to move`
            };
        },

        isGameOver() {
            const status = this.getGameStatus();
            return status.isOver;
        },

        getValidMoves(position) {
            const moves = generatePieceMoves(this, position);
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

// /**
//  * Executes the Minimax algorithm to determine the best move.
//  * @param {Object} game - The current game instance.
//  * @param {number} depth - The depth of the search tree.
//  * @param {number} alpha - Alpha value for pruning.
//  * @param {number} beta - Beta value for pruning.
//  * @param {boolean} maximizingPlayer - True if maximizing player, else false.
//  * @returns {Object} - The evaluation score and best move.
//  */
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
        return { score: minEval,bestMove };
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
    makeMove: (boardState, move) => {
        const game = exports.createGame();
        game.board = boardState;
        game.turn = 'w';
        return game.makeMove(move);
    },
    runMinimax: exports.runMinimax,
    getBestMove,
    evaluatePosition: evaluateBoard,
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
