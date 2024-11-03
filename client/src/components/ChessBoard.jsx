import { useState, useEffect } from 'react';
import axios from 'axios';

const ChessBoard = () => {
  const [board, setBoard] = useState(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [currentTurn, setCurrentTurn] = useState('w');
  const [possibleMoves, setPossibleMoves] = useState([]);

  const startNewGame = async () => {
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:5000/api/game/start');
      setBoard(response.data.board);
      setMessage('Game started! White\'s turn');
      setLastMove(null);
      setSelectedPiece(null);
      setPossibleMoves([]);
      setCurrentTurn('w');
    } catch (error) {
      setMessage('Error starting game: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startNewGame();
  }, []);

  const getValidMoves = async (row, col) => {
    try {
      const response = await axios.post('http://localhost:5000/api/game/valid-moves', {
        board: board,
        position: [row, col],
        turn: currentTurn
      });
      setPossibleMoves(response.data.validMoves);
    } catch (error) {
      console.error('Error getting valid moves:', error);
      setPossibleMoves([]);
    }
  };

  const handleSquareClick = async (row, col) => {
    if (!board || loading) return;

    // If clicking on the same piece, deselect it
    if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
      setSelectedPiece(null);
      setPossibleMoves([]);
      setMessage(`${currentTurn === 'w' ? 'White' : 'Black'}'s turn.`);
      return;
    }

    if (!selectedPiece) {
      // Selecting a piece
      const piece = board[row][col];
      if (piece !== '.' && (
        (currentTurn === 'w' && piece === piece.toUpperCase()) ||
        (currentTurn === 'b' && piece === piece.toLowerCase())
      )) {
        setSelectedPiece({ row, col });
        await getValidMoves(row, col);
        setMessage(`Selected ${piece === piece.toUpperCase() ? 'white' : 'black'} ${getPieceName(piece)}. Choose a destination.`);
      } else {
        setPossibleMoves([]);
        setMessage(`Invalid selection. It is ${currentTurn === 'w' ? 'White' : 'Black'}'s turn.`);
      }
    } else {
      // Making a move
      if (!isPossibleMove(row, col)) {
        setMessage('Invalid move. Choose a highlighted square or select a different piece.');
        return;
      }

      try {
        setLoading(true);
        const move = {
          from: [selectedPiece.row, selectedPiece.col],
          to: [row, col]
        };

        const response = await axios.post('http://localhost:5000/api/game/move', {
          board: board,
          move: move,
          depth: 3,
          turn: currentTurn
        });

        setBoard(response.data.board);
        setLastMove(response.data.lastMove);
        setSelectedPiece(null);
        setPossibleMoves([]);

        if (response.data.isGameOver) {
          setMessage('Game Over!');
        } else {
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

  const isPossibleMove = (row, col) => {
    return possibleMoves.some(move =>
      move.to[0] === row && move.to[1] === col
    );
  };

  const getPieceName = (piece) => {
    const pieceNames = {
      'p': 'pawn', 'P': 'pawn',
      'r': 'rook', 'R': 'rook',
      'n': 'knight', 'N': 'knight',
      'b': 'bishop', 'B': 'bishop',
      'q': 'queen', 'Q': 'queen',
      'k': 'king', 'K': 'king'
    };
    return pieceNames[piece] || piece;
  };

  const getPieceSymbol = (piece) => {
    const symbols = {
      'p': '♟', 'P': '♙', //pawn 
      'r': '♜', 'R': '♖', // rook/nouka
      'n': '♞', 'N': '♘', // knight
      'b': '♝', 'B': '♗', //bishop
      'q': '♛', 'Q': '♕', //queen
      'k': '♚', 'K': '♔' // king
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
        <div className={`text-lg mb-4 ${message.includes('Error') || message.includes('Invalid') ? 'text-red-500' : 'text-gray-700'}`}>
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
              const isPossible = isPossibleMove(rowIndex, colIndex);

              const squareColor = (rowIndex + colIndex) % 2 === 0 ?
                'bg-[#F0D9B5]' : 'bg-[#B58863]';

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
                  {isPossible && (
                    <div className={`
                      absolute inset-0 flex items-center justify-center
                      ${piece === '.' ? 'bg-green-400 opacity-50 rounded-full w-4 h-4 mx-auto' : 'ring-2 ring-green-400'}
                    `} />
                  )}
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