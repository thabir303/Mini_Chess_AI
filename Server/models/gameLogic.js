const { evaluateBoard } = require('../utils/evaluation');

function cloneGame(game) {
    console.log('Cloning game state.');
    const newGame = exports.createGame();
    newGame.board = JSON.parse(JSON.stringify(game.board));
    newGame.turn = game.turn;
    newGame.moveHistory = [...game.moveHistory];
    return newGame;
}

function isValidPosition(x, y) {
    return x >= 0 && x < 6 && y >= 0 && y < 5;
}

function isCheck(game) {
    console.log('Checking for check status.');
    const turn = game.turn;
    let kingPos = null;

    // Find king position
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 5; j++) {
            const piece = game.board[i][j];
            if ((turn === 'w' && piece === 'K') || (turn === 'b' && piece === 'k')) {
                kingPos = [i, j];
                break;
            }
        }
        if (kingPos) break;
    }

    // Switch turn to check opponent's moves
    game.turn = turn === 'w' ? 'b' : 'w';
    const opponentMoves = generateMoves(game);
    game.turn = turn; // Switch back

    // Check if any opponent move can capture the king
    return opponentMoves.some(move =>
        move.to[0] === kingPos[0] && move.to[1] === kingPos[1]
    );
}

exports.createGame = () => {
    console.log('Creating a new game.');
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
        makeMove(move) {
            console.log(`Making move from ${move.from} to ${move.to}.`);
            if (!Array.isArray(move.from) || !Array.isArray(move.to) ||
                move.from.length !== 2 || move.to.length !== 2) {
                throw new Error('Invalid move format. Use { from: [x, y], to: [x, y] }.');
            }
        
            const [fromX, fromY] = move.from;
            const [toX, toY] = move.to;
        
            if (!isValidPosition(fromX, fromY) || !isValidPosition(toX, toY)) {
                throw new Error('Move out of bounds.');
            }
        
            const piece = this.board[fromX][fromY];
        
            if (piece === '.') {
                throw new Error('No piece at the selected position.');
            }
        
            // Check if the piece belongs to the current turn
            if ((this.turn === 'w' && piece !== piece.toUpperCase()) || // Uppercase check for white
                (this.turn === 'b' && piece !== piece.toLowerCase())) { // Lowercase check for black
                console.log(`Error: Piece at [${fromX}, ${fromY}] (${piece}) does not belong to the current turn (${this.turn}).`);
                throw new Error('Invalid piece selection. It is not your turn to move this piece.');
            }
        
            // Generate valid moves and check legality
            const validMoves = generatePieceMoves(this, [fromX, fromY]);
            const isValidMove = validMoves.some(m => m.to[0] === toX && m.to[1] === toY);
        
            if (!isValidMove) {
                console.log(`Error: The move to [${toX}, ${toY}] is not valid for piece at [${fromX}, ${fromY}].`);
                throw new Error('Invalid move for this piece.');
            }
        
            // Make the move temporarily
            const originalPiece = this.board[toX][toY];
            this.board[toX][toY] = piece;
            this.board[fromX][fromY] = '.';
        
            // Check if the move puts/leaves the king in check
            if (isCheck(this)) {
                console.log('Move puts king in check. Undoing move.');
                this.board[fromX][fromY] = piece;
                this.board[toX][toY] = originalPiece;
                throw new Error('Move would put or leave king in check.');
            }
        
            // Record the move
            this.moveHistory.push({
                from: move.from,
                to: move.to,
                piece: piece,
                captured: originalPiece !== '.'
            });
            // Ensure turn is switched after a valid move
            this.turn = this.turn === 'w' ? 'b' : 'w';
            console.log(`Turn changed to: ${this.turn}`); // Confirm turn change
        },
        isGameOver() {
            console.log('Checking if the game is over.');
            return this.checkmate() || this.stalemate() || this.draw();
        },
        checkmate() {
            console.log('Checking for checkmate.');
            if (!isCheck(this)) return false;
            return generateMoves(this).length === 0;
        },
        stalemate() {
            console.log('Checking for stalemate.');
            if (isCheck(this)) return false;
            return generateMoves(this).length === 0;
        },
        draw() {
            console.log('Checking for draw.');
            // Implement basic draw conditions: insufficient material, threefold repetition, etc.
            // For simplicity, checking only insufficient material
            const material = this.board.flat().filter(piece => piece !== '.').map(piece => piece.toLowerCase());
            const uniquePieces = [...new Set(material)];
            if (uniquePieces.length === 1 && (uniquePieces[0] === 'k' || uniquePieces[0] === 'n' || uniquePieces[0] === 'b')) {
                return true; // Insufficient material (e.g., king vs. king, king vs. king and knight, etc.)
            }
            return false;
        }
    };
};

exports.makeMove = (boardState, move) => {
    try {
        console.log('Making move with board state:', boardState, 'and move:', move);
        if (!Array.isArray(boardState) || boardState.length !== 6 || !Array.isArray(boardState[0]) || boardState[0].length !== 5) {
            throw new Error('Invalid board state format. Ensure it is a 6x5 array.');
        }
        const game = exports.createGame();
        game.board = boardState;
        game.makeMove(move);
        const isGameOver = game.isGameOver();
        return { board: game.board, isGameOver };
    } catch (error) {
        throw new Error(`Error processing move: ${error.message}`);
    }
};


exports.runMinimax = (game, depth, alpha = -Infinity, beta = Infinity, maximizingPlayer = true) => {
    console.log(`Running minimax at depth ${depth} for ${maximizingPlayer ? 'maximizing' : 'minimizing'} player.`);
    if (depth <= 0 || game.isGameOver()) {
        return { score: evaluateBoard(game) };
    }
    if (maximizingPlayer) {
        let maxEval = -Infinity;
        let bestMove = null;
        const moves = generateMoves(game);
        for (const move of moves) {
            const gameCopy = JSON.parse(JSON.stringify(game));
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
        const moves = generateMoves(game);
        for (const move of moves) {
            const gameCopy = JSON.parse(JSON.stringify(game));
            try {
                gameCopy.makeMove(move);
                const evaluation = exports.runMinimax(gameCopy, depth - 1, alpha, beta, true).score;
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            } catch (err) {
                console.error('Error during minimax move generation:', err);
            }
        }
        return { score: minEval };
    }
};

function evaluatePosition(game) {
    console.log('Evaluating position.');
    let score = evaluateBoard(game);

    // Add positional bonuses
    if (game.checkmate()) {
        score += (game.turn === 'b' ? 20000 : -20000); 
    }

    if (game.stalemate() || game.draw()) {
        score = 0; 
    }

    return score;
}

function generateMoves(game) {
    console.log('Generating moves for the current game state.');
    const moves = [];
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 5; j++) {
            const piece = game.board[i][j];
            if (piece !== '.' && ((game.turn === 'w' && piece === piece.toUpperCase()) || (game.turn === 'b' && piece === piece.toLowerCase()))) {
                moves.push(...generatePieceMoves(game, [i, j]));
            }
        }
    }
    console.log(`Total moves generated: ${moves.length}`);
    return moves;
}

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

function generatePawnMoves(game, position) {
    const [x, y] = position;
    const moves = [];
    const direction = game.turn === 'w' ? -1 : 1;

    if (x + direction >= 0 && x + direction < 6 && game.board[x + direction][y] === '.') {
        moves.push({ from: position, to: [x + direction, y] });
        console.log(`Pawn move to [${x + direction}, ${y}] added.`);
    }

    if ((game.turn === 'w' && x === 4) || (game.turn === 'b' && x === 1)) {
        if (x + 2 * direction >= 0 && x + 2 * direction < 6 && game.board[x + 2 * direction][y] === '.') {
            moves.push({ from: position, to: [x + 2 * direction, y] });
            console.log(`Pawn double move to [${x + 2 * direction}, ${y}] added.`);
        }
    }

    for (const side of [-1, 1]) {
        if (y + side >= 0 && y + side < 5 && x + direction >= 0 && x + direction < 6) {
            const target = game.board[x + direction][y + side];
            if (target !== '.' && ((game.turn === 'w' && target === target.toLowerCase()) || (game.turn === 'b' && target === target.toUpperCase()))) {
                moves.push({ from: position, to: [x + direction, y + side] });
                console.log(`Pawn capture move to [${x + direction}, ${y + side}] added.`);
            }
        }
    }

    return moves;
}

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

function generateBishopMoves(game, position) {
    const [x, y] = position;
    const moves = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

    for (const [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        while (nx >= 0 && nx < 6 && ny >= 0 && ny < 5) {
            const target = game.board[nx][ny];
            if (target === '.') {
                moves.push({ from: position, to: [nx, ny] });
                console.log(`Bishop move to [${nx}, ${ny}] added.`);
            } else {
                if ((game.turn === 'w' && target === target.toLowerCase()) || (game.turn === 'b' && target === target.toUpperCase())) {
                    moves.push({ from: position, to: [nx, ny] });
                    console.log(`Bishop capture move to [${nx}, ${ny}] added.`);
                }
                break;
            }
            nx += dx;
            ny += dy;
        }
    }

    return moves;
}

function generateRookMoves(game, position) {
    const [x, y] = position;
    const moves = [];
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (const [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        while (nx >= 0 && nx < 6 && ny >= 0 && ny < 5) {
            const target = game.board[nx][ny];
            if (target === '.') {
                moves.push({ from: position, to: [nx, ny] });
                console.log(`Rook move to [${nx}, ${ny}] added.`);
            } else {
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

function generateQueenMoves(game, position) {
    return generateRookMoves(game, position).concat(generateBishopMoves(game, position));
}

function generateKingMoves(game, position) {
    const [x, y] = position;
    const moves = [];
    const kingMoves = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];

    for (const [dx, dy] of kingMoves) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < 6 && ny >= 0 && ny < 5) {
            const target = game.board[nx][ny];
            if (target === '.' || (game.turn === 'w' && target === target.toLowerCase()) || (game.turn === 'b' && target === target.toUpperCase())) {
                moves.push({ from: position, to: [nx, ny] });
                console.log(`King move to [${nx}, ${ny}] added.`);
            }
        }
    }

    return moves;
}
// Add this at the very end of gameLogic.js, after all function definitions
module.exports = {
    createGame: exports.createGame,
    makeMove: exports.makeMove,
    runMinimax: exports.runMinimax,
    // Internal functions that need to be exported
    generatePieceMoves,
    cloneGame,
    isCheck,
    generateMoves,
    isValidPosition,
    evaluatePosition,
    // Piece movement generators
    generatePawnMoves,
    generateKnightMoves,
    generateBishopMoves,
    generateRookMoves,
    generateQueenMoves,
    generateKingMoves
};