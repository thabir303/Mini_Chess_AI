// models/gameLogic.js
const { evaluateBoard } = require('../utils/evaluation');

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
        makeMove(move) {
            if (!Array.isArray(move.from) || !Array.isArray(move.to) || move.from.length !== 2 || move.to.length !== 2) {
                throw new Error('Invalid move format. Use { from: [x, y], to: [x, y] }.');
            }
            const [fromX, fromY] = move.from;
            const [toX, toY] = move.to;
            if (fromX < 0 || fromY < 0 || toX < 0 || toY < 0 || fromX >= 6 || fromY >= 5 || toX >= 6 || toY >= 5) {
                throw new Error('Move out of bounds.');
            }
            const piece = this.board[fromX][fromY];
            if (piece === '.' || (this.turn === 'w' && piece.toLowerCase() === piece) || (this.turn === 'b' && piece.toUpperCase() === piece)) {
                throw new Error('Invalid move: no valid piece at the source or move not allowed for the current player.');
            }
            
            // Validate move legality
            const validMoves = generatePieceMoves(this, [fromX, fromY]);
            const isValidMove = validMoves.some(m => m.to[0] === toX && m.to[1] === toY);
            if (!isValidMove) {
                throw new Error('Invalid move: the move is not legal for the selected piece.');
            }

            // Execute the move
            this.board[toX][toY] = piece;
            this.board[fromX][fromY] = '.';
            this.moveHistory.push({ from: move.from, to: move.to, piece });
            this.turn = this.turn === 'w' ? 'b' : 'w';
        },
        isGameOver() {
            return this.checkmate() || this.stalemate() || this.draw();
        },
        checkmate() {
            // Implement checkmate logic
            return false; // Placeholder
        },
        stalemate() {
            // Implement stalemate logic
            return false; // Placeholder
        },
        draw() {
            // Implement draw logic
            return false; // Placeholder
        }
    };
};

exports.makeMove = (boardState, move) => {
    try {
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

function generateMoves(game) {
    const moves = [];
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 5; j++) {
            const piece = game.board[i][j];
            if (piece !== '.' && ((game.turn === 'w' && piece === piece.toUpperCase()) || (game.turn === 'b' && piece === piece.toLowerCase()))) {
                moves.push(...generatePieceMoves(game, [i, j]));
            }
        }
    }
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
    return moves;
}

function generatePawnMoves(game, position) {
    const [x, y] = position;
    const moves = [];
    const direction = game.turn === 'w' ? -1 : 1;

    // Single move forward
    if (x + direction >= 0 && x + direction < 6 && game.board[x + direction][y] === '.') {
        moves.push({ from: position, to: [x + direction, y] });
    }

    // Double move from starting position
    if ((game.turn === 'w' && x === 4) || (game.turn === 'b' && x === 1)) {
        if (x + 2 * direction >= 0 && x + 2 * direction < 6 && game.board[x + 2 * direction][y] === '.') {
            moves.push({ from: position, to: [x + 2 * direction, y] });
        }
    }

    // Capture moves
    for (const side of [-1, 1]) {
        if (y + side >= 0 && y + side < 5 && x + direction >= 0 && x + direction < 6) {
            const target = game.board[x + direction][y + side];
            if (target !== '.' && ((game.turn === 'w' && target === target.toLowerCase()) || (game.turn === 'b' && target === target.toUpperCase()))) {
                moves.push({ from: position, to: [x + direction, y + side] });
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
            } else {
                if ((game.turn === 'w' && target === target.toLowerCase()) || (game.turn === 'b' && target === target.toUpperCase())) {
                    moves.push({ from: position, to: [nx, ny] });
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
            } else {
                if ((game.turn === 'w' && target === target.toLowerCase()) || (game.turn === 'b' && target === target.toUpperCase())) {
                    moves.push({ from: position, to: [nx, ny] });
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
            }
        }
    }

    return moves;
}
