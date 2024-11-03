import { useState, useEffect } from 'react';
import axios from 'axios';

const ChessBoard = () => {
  const [board, setBoard] = useState(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [currentTurn, setCurrentTurn] = useState('w'); // 'w' for white, 'b' for black

  const startNewGame = async () => {
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:5000/api/game/start');
      setBoard(response.data.board);
      setMessage(`Game started! White's turn`);
      setLastMove(null);
      setSelectedPiece(null);
      setCurrentTurn('w'); // Start with white
    } catch (error) {
      setMessage('Error starting game: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startNewGame();
  }, []);

  const handleSquareClick = async (row, col) => {
    if (!board || loading) return;

    if (!selectedPiece) {
      // Selecting a piece
      const piece = board[row][col];
      if (piece !== '.' && (
        (currentTurn === 'w' && piece === piece.toUpperCase()) ||
        (currentTurn === 'b' && piece === piece.toLowerCase())
      )) {
        setSelectedPiece({ row, col });
        setMessage(`Selected piece at [${row}, ${col}]. Choose a destination.`);
        console.log(`Current Turn: ${currentTurn}`);
        console.log(`Selected Piece: ${piece}`);

      } else {
        setMessage('Invalid selection. It is ' + (currentTurn === 'w' ? 'White' : 'Black') + `'s turn.`);
      }
    } else {
      // Making a move
      try {
        setLoading(true);
        const move = {
          from: [selectedPiece.row, selectedPiece.col],
          to: [row, col]
        };

        // In handleSquareClick function, modify the axios.post call:
const response = await axios.post('http://localhost:5000/api/game/move', {
    board: board,
    move: move,
    depth: 3,
    turn: currentTurn // Add this line
});

        setBoard(response.data.board);
        setLastMove(response.data.lastMove);
        setSelectedPiece(null);

        if (response.data.isGameOver) {
          setMessage('Game Over!');
        } else {
          // Switch turn
          const nextTurn = currentTurn === 'w' ? 'b' : 'w';
          setCurrentTurn(nextTurn);
          setMessage(`${nextTurn === 'w' ? 'White' : 'Black'}'s turn.`);
        }
      } catch (error) {
        setMessage('Invalid move: ' + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const isLastMove = (row, col) => {
    if (!lastMove) return false;
    return (
      (lastMove.from[0] === row && lastMove.from[1] === col) ||
      (lastMove.to[0] === row && lastMove.to[1] === col)
    );
  };

  const getPieceSymbol = (piece) => {
    const symbols = {
      'p': '♟', 'P': '♙',
      'r': '♜', 'R': '♖',
      'n': '♞', 'N': '♘',
      'b': '♝', 'B': '♗',
      'q': '♛', 'Q': '♕',
      'k': '♚', 'K': '♔',
    };
    return symbols[piece] || '';
  };

  if (!board) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-2xl font-bold">Loading...</div>
    </div>
  );

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">MiniChess</h1>
        <div className="flex gap-4 mb-4">
          <button 
            onClick={startNewGame}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            disabled={loading}
          >
            New Game
          </button>
        </div>
        <div className={`text-lg mb-4 ${message.includes('Error') ? 'text-red-500' : 'text-gray-700'}`}>
          {message}
        </div>
      </div>

      <div className="inline-block border-4 border-gray-800 rounded-lg">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((piece, colIndex) => {
              const isSelected = selectedPiece && 
                selectedPiece.row === rowIndex && 
                selectedPiece.col === colIndex;
              
              const isLastMovePart = isLastMove(rowIndex, colIndex);
              
              const squareColor = (rowIndex + colIndex) % 2 === 0 ? 
                'bg-board-light' : 'bg-board-dark';

              return (
                <div
                  key={colIndex}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  className={`
                    w-16 h-16 flex items-center justify-center text-4xl
                    cursor-pointer relative
                    ${squareColor}
                    ${isSelected ? 'ring-2 ring-yellow-400' : ''}
                    ${isLastMovePart ? 'ring-2 ring-blue-400' : ''}
                    hover:opacity-90 transition-opacity
                  `}
                >
                  <span className={`
                    chess-piece select-none
                    ${piece === piece.toUpperCase() ? 'text-white' : 'text-black'}
                    ${loading ? 'opacity-50' : 'opacity-100'}
                  `}>
                    {getPieceSymbol(piece)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChessBoard;
