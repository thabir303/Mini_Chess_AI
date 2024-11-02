// utils/evaluation.js
exports.evaluateBoard = (game) => {
    let score = 0;
    const board = game.board;

    board.forEach(row => {
        row.forEach(piece => {
            if (piece) {
                const value = (piece.toLowerCase() === 'p' ? 1 : piece.toLowerCase() === 'n' ? 3 : piece.toLowerCase() === 'b' || piece.toLowerCase() === 'r' ? 5 : piece.toLowerCase() === 'q' ? 9 : 0);
                score += piece === piece.toUpperCase() ? value : -value;
            }
        });
    });

    return score;
};