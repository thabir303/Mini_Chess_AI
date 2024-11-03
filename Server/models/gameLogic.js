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

function isCheck(game) {
    const kingPos = getKingPosition(game, game.turn);
    if (!kingPos) return false;

    // Switch turn to check opponent's moves
    game.turn = game.turn === 'w' ? 'b' : 'w';
    const opponentMoves = generateMoves(game);
    game.turn = game.turn === 'w' ? 'b' : 'w'; // Switch back

    return opponentMoves.some(move =>
        move.to[0] === kingPos[0] && move.to[1] === kingPos[1]
    );
}

function isCheckmate(game) {
    if (!isCheck(game)) return false;
    
    const allMoves = generateMoves(game);
    for (const move of allMoves) {
        const gameCopy = cloneGame(game);
        try {
            gameCopy.makeMove(move);
            if (!isCheck(gameCopy)) {
                return false;
            }
        } catch (error) {
            continue;
        }
    }
    return true;
}

function isStalemate(game) {
    if (isCheck(game)) return false;
    return generateMoves(game).length === 0;
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

            if ((this.turn === 'w' && piece !== piece.toUpperCase()) ||
                (this.turn === 'b' && piece !== piece.toLowerCase())) {
                throw new Error('Invalid piece selection. It is not your turn to move this piece.');
            }

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

            if (isCheck(this)) {
                this.board[fromX][fromY] = piece;
                this.board[toX][toY] = originalPiece;
                throw new Error('Move would put or leave king in check.');
            }

            this.moveHistory.push({
                from: move.from,
                to: move.to,
                piece: piece,
                captured: originalPiece !== '.'
            });

            this.turn = this.turn === 'w' ? 'b' : 'w';

            // Update game status after move
            const status = this.getGameStatus();
            this.gameStatus = status;
            if (status.isOver) {
                this.winner = status.winner;
            }

            return status;
        },

        getGameStatus() {
            if (isCheckmate(this)) {
                const winner = this.turn === 'w' ? 'b' : 'w';
                return {
                    isOver: true,
                    result: 'checkmate',
                    winner: winner,
                    message: `Checkmate! ${winner === 'w' ? 'White' : 'Black'} wins!`
                };
            }

            if (isStalemate(this)) {
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
            return moves.filter(move => {
                const gameCopy = cloneGame(this);
                try {
                    gameCopy.makeMove(move);
                    return !isCheck(gameCopy);
                } catch {
                    return false;
                }
            });
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
    const direction = game.turn === 'w' ? -1 : 1;  // White moves up (-1), Black moves down (+1)

    // Single step forward
    if (x + direction >= 0 && x + direction < 6) {
        // Check if the square directly in front is empty
        if (game.board[x + direction][y] === '.') {
            moves.push({ from: position, to: [x + direction, y] });
            
            // Double step from starting position
            // White pawns can move two steps from row 4, Black from row 1
            const canDoubleMove = (game.turn === 'w' && x === 4) || (game.turn === 'b' && x === 1);
            if (canDoubleMove && game.board[x + 2 * direction][y] === '.') {
                moves.push({ from: position, to: [x + 2 * direction, y] });
            }
        }
    }

    // Captures (diagonal moves)
    for (const side of [-1, 1]) {  // Check both left and right diagonals
        if (y + side >= 0 && y + side < 5 && x + direction >= 0 && x + direction < 6) {
            const targetPiece = game.board[x + direction][y + side];
            // Can capture enemy pieces
            if (targetPiece !== '.' && 
                ((game.turn === 'w' && targetPiece === targetPiece.toLowerCase()) || 
                 (game.turn === 'b' && targetPiece === targetPiece.toUpperCase()))) {
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
    isCheckmate,
    isStalemate,
    isInsufficientMaterial,
    generatePieceMoves,
    evaluatePosition,
    generateMoves,
    isValidPosition,
    evaluatePosition,
    generatePawnMoves,
    generateKnightMoves,
    generateBishopMoves,
    generateRookMoves,
    generateQueenMoves,
    generateKingMoves
};