exports.evaluateBoard = (game) => {
    let score = 0;
    const board = game.board;

    // Define piece values and additional heuristic values
    const pieceValues = {
        'p': 1,
        'n': 3,
        'b': 3.3,
        'r': 5,
        'q': 9,
        'k': 0
    };

    const positionBonuses = {
        'p': [
            [0, 0, 0, 0, 0],
            [0.5, 0.5, 0.5, 0.5, 0.5],
            [0.2, 0.2, 0.3, 0.2, 0.2],
            [0.1, 0.1, 0.2, 0.1, 0.1],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0]
        ],
        'n': [
            [0, 0.1, 0.2, 0.1, 0],
            [0.1, 0.2, 0.4, 0.2, 0.1],
            [0.2, 0.3, 0.5, 0.3, 0.2],
            [0.2, 0.3, 0.5, 0.3, 0.2],
            [0.1, 0.2, 0.4, 0.2, 0.1],
            [0, 0.1, 0.2, 0.1, 0]
        ],
        'b': [
            [0, 0.1, 0.2, 0.1, 0],
            [0.1, 0.2, 0.3, 0.2, 0.1],
            [0.1, 0.3, 0.4, 0.3, 0.1],
            [0.1, 0.3, 0.4, 0.3, 0.1],
            [0.1, 0.2, 0.3, 0.2, 0.1],
            [0, 0.1, 0.2, 0.1, 0]
        ],
        'r': [
            [0.2, 0.3, 0.3, 0.3, 0.2],
            [0.3, 0.4, 0.4, 0.4, 0.3],
            [0.1, 0.2, 0.2, 0.2, 0.1],
            [0.1, 0.2, 0.2, 0.2, 0.1],
            [0.1, 0.2, 0.2, 0.2, 0.1],
            [0, 0, 0, 0, 0]
        ],
        'q': [
            [0.2, 0.3, 0.3, 0.3, 0.2],
            [0.3, 0.4, 0.4, 0.4, 0.3],
            [0.2, 0.3, 0.3, 0.3, 0.2],
            [0.2, 0.3, 0.3, 0.3, 0.2],
            [0.1, 0.2, 0.2, 0.2, 0.1],
            [0, 0.1, 0.2, 0.1, 0]
        ],
        'k': [
            [-0.3, -0.4, -0.4, -0.4, -0.3],
            [-0.4, -0.5, -0.5, -0.5, -0.4],
            [-0.4, -0.5, -0.5, -0.5, -0.4],
            [-0.4, -0.5, -0.5, -0.5, -0.4],
            [-0.3, -0.4, -0.4, -0.4, -0.3],
            [0, 0, 0, 0, 0]
        ]
    };

    // Loop through each piece on the board
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            const piece = board[i][j];
            if (piece && piece !== '.') {
                const pieceType = piece.toLowerCase();
                let value = pieceValues[pieceType];

                // Adjust score based on position bonuses
                if (positionBonuses[pieceType]) {
                    const posValue = positionBonuses[pieceType][i][j];
                    value += posValue;
                }

                // Add score based on piece color
                score += piece === piece.toUpperCase() ? value : -value;
            }
        }
    }

    // Mobility heuristic: Count available moves for each side
    const whiteMoves = generateMoves(game, 'w').length;
    const blackMoves = generateMoves(game, 'b').length;
    score += (whiteMoves - blackMoves) * 0.1; // Encourage mobility

    // Additional adjustments for king safety, pawn structure, etc., can be added here

    return score;
};
