// /client/src/components/ChessBoard.jsx

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ChessBoard = () => {
    const [board, setBoard] = useState(null);
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastMove, setLastMove] = useState(null);
    const [currentTurn, setCurrentTurn] = useState('w');
    const [possibleMoves, setPossibleMoves] = useState([]);
    const [gameResult, setGameResult] = useState(null);
    const [promotionModal, setPromotionModal] = useState({
        isVisible: false,
        move: null,
    });
    const [timer, setTimer] = useState(null); // New state for timer
    const timerRef = useRef(null); // Ref to store interval ID

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
            setGameResult(null);
            setPromotionModal({ isVisible: false, move: null });
            setTimer(null); // Reset timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
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
            console.log(possibleMoves);
        } catch (error) {
            console.error('Error getting valid moves:', error);
            setPossibleMoves([]);
        }
    };

    const handleSquareClick = async (row, col) => {
        if (!board || loading || gameResult || timer) return; // Disable moves during timer

        if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
            setSelectedPiece(null);
            setPossibleMoves([]);
            setMessage(`${currentTurn === 'w' ? 'White' : 'Black'}'s turn.`);
            return;
        }

        if (!selectedPiece) {
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
            if (!isPossibleMove(row, col)) {
                setMessage('Invalid move. Choose a highlighted square or select a different piece.');
                return;
            }

            const move = {
                from: [selectedPiece.row, selectedPiece.col],
                to: [row, col]
            };

            // Check if the move is a pawn moving to the last rank
            const piece = board[selectedPiece.row][selectedPiece.col];
            const isPawn = piece.toLowerCase() === 'p';
            const promotionRow = currentTurn === 'w' ? 0 : 5;
            const isPromotionMove = isPawn && row === promotionRow;

            if (isPromotionMove) {
                // Show promotion modal
                setPromotionModal({
                    isVisible: true,
                    move: move
                });
                return;
            }

            // Proceed with the move without promotion
            await sendMove(move);
        }
    };

    const sendMove = async (move, promotion = null) => {
        try {
            setLoading(true);
            const movePayload = { ...move };
            if (promotion) {
                movePayload.promotion = promotion;
            }

            const response = await axios.post('http://localhost:5000/api/game/move', {
                board: board,
                move: movePayload,
                turn: currentTurn
            });

            setBoard(response.data.board);
            setLastMove(response.data.lastMove);
            setSelectedPiece(null);
            setPossibleMoves([]);

            if (response.data.isGameOver) {
                setGameResult(response.data.message);
                if (response.data.status.result === 'checkmate') {
                    setMessage(response.data.message);
                } else {
                    setMessage(response.data.message);
                }
            } else {
                const nextTurn = currentTurn === 'w' ? 'b' : 'w';
                setCurrentTurn(nextTurn);
                setMessage(`${nextTurn === 'w' ? 'White' : 'Black'}'s turn.`);
            }

            // Handle checkmate_pending status for timer
            if (response.data.gameStatus && response.data.gameStatus.result === 'checkmate_pending') {
                const remainingTime = response.data.gameStatus.remainingTime;
                setTimer(remainingTime);
                startCountdown(remainingTime);
            } else {
                // Clear any existing timer if not in checkmate_pending
                setTimer(null);
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            }
        } catch (error) {
            if (error.response?.data.requiresPromotion) {
                // Handle promotion requirement
                const pendingMove = error.response.data.move;
                setPromotionModal({
                    isVisible: true,
                    move: pendingMove
                });
            } else {
                setMessage('Invalid move: ' + (error.response?.data?.error || error.message));
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePromotionChoice = (promotion) => {
        sendMove(promotionModal.move, promotion);
        setPromotionModal({ isVisible: false, move: null });
    };

    const isLastMove = (row, col) => {
        if (!lastMove) return false;
        return (
            (lastMove.from[0] === row && lastMove.from[1] === col) ||
            (lastMove.to[0] === row && lastMove.to[1] === col)
        );
    };

    const isPossibleMove = (row, col) => {
        return possibleMoves.some(move =>{
            console.log(move);
            return move.to[0] === row && move.to[1] === col;
        });
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
            'p': '♟', 'P': '♙',
            'r': '♜', 'R': '♖',
            'n': '♞', 'N': '♘',
            'b': '♝', 'B': '♗',
            'q': '♛', 'Q': '♕',
            'k': '♚', 'K': '♔'
        };
        return symbols[piece] || '';
    };

    /**
     * Starts the countdown timer.
     * @param {number} initialTime - Initial time in seconds.
     */
    const startCountdown = (initialTime) => {
        setTimer(initialTime);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        timerRef.current = setInterval(() => {
            setTimer(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(timerRef.current);
                    setGameResult(`${currentTurn === 'w' ? 'White' : 'Black'} wins by checkmate timer!`);
                    setMessage(`${currentTurn === 'w' ? 'White' : 'Black'} wins by checkmate timer!`);
                    return null;
                }
                return prevTime - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        // Poll the game status every second to handle timer updates
        const interval = setInterval(async () => {
            try {
                const response = await axios.post('http://localhost:5000/api/game/status', {
                    board: board,
                    turn: currentTurn
                });
                const status = response.data.gameStatus;

                if (status) {
                    if (status.result === 'checkmate_pending') {
                        setTimer(status.remainingTime);
                        startCountdown(status.remainingTime);
                    } else if (status.result === 'checkmate') {
                        setGameResult(status.message);
                        setMessage(status.message);
                        setTimer(null);
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                        }
                    }
                }
            } catch (error) {
                console.error('Error polling game status:', error);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [board, currentTurn]);

    if (!board) return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 to-slate-200">
            <div className="text-3xl font-bold text-slate-800 animate-pulse">Loading...</div>
        </div>
    );

    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-8">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-slate-800 mb-2">MiniChess</h1>
                <div className="flex gap-4 mb-4 justify-center">
                    <button
                        onClick={startNewGame}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg 
                                 hover:bg-blue-700 transition-all duration-200 
                                 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 font-semibold"
                        disabled={loading}
                    >
                        New Game
                    </button>
                </div>
                <div className={`text-lg mb-4 px-4 py-2 rounded-lg transition-colors duration-200
                    ${gameResult ? 'bg-green-100 text-green-800 font-bold' :
                    message.includes('Error') || message.includes('Invalid') ? 
                        'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'}`}>
                    {message}
                </div>
                {timer !== null && !gameResult && (
                    <div className="text-xl font-semibold text-red-600">
                        Time remaining: {timer} seconds
                    </div>
                )}
            </div>

            <div className="relative">
                {/* Turn indicator */}
                <div className="absolute -left-32 top-1/2 transform -translate-y-1/2 
                               bg-white p-4 rounded-xl shadow-lg text-center w-24">
                    <div className={`text-lg font-semibold mb-2 
                        ${currentTurn === 'w' ? 'text-slate-800' : 'text-slate-700'}`}>
                        {currentTurn === 'w' ? 'White' : 'Black'}
                    </div>
                    <div className={`w-8 h-8 rounded-full mx-auto 
                        ${currentTurn === 'w' ? 'bg-white' : 'bg-gray-800'} 
                        border-2 border-gray-400 shadow-inner`}></div>
                </div>

                <div className="inline-block bg-slate-800 p-6 rounded-xl shadow-2xl">
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
                                            cursor-pointer relative transition-all duration-200
                                            ${squareColor}
                                            ${isSelected ? 'ring-4 ring-yellow-400 ring-opacity-70 shadow-inner' : ''}
                                            ${isLastMovePart ? 'ring-2 ring-blue-400 ring-opacity-60' : ''}
                                            hover:brightness-110
                                        `}
                                    >
                                        <span className={`
                                            chess-piece select-none transform transition-transform
                                            ${piece === piece.toUpperCase() 
                                                ? 'text-[#FFFFFF] drop-shadow-[2px_2px_1px_rgba(0,0,0,0.5)]' 
                                                : 'text-[#000000] drop-shadow-[1px_1px_1px_rgba(255,255,255,0.5)]'}
                                            ${loading ? 'opacity-50' : 'opacity-100'}
                                            ${isSelected ? 'scale-110' : ''}
                                            hover:scale-105
                                        `}>
                                            {getPieceSymbol(piece)}
                                        </span>
                                        {isPossible && (
                                            <div className={`
                                                absolute inset-0 flex items-center justify-center
                                                ${piece === '.' 
                                                    ? 'bg-green-500 opacity-40 rounded-full w-4 h-4 mx-auto' 
                                                    : 'ring-4 ring-green-500 ring-opacity-60'}
                                                transition-all duration-200
                                            `} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {gameResult && (
                <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 
                               rounded-xl border border-yellow-200 shadow-lg text-center
                               transform animate-fadeIn w-80">
                    <h2 className="text-2xl font-bold text-yellow-800 mb-3">Game Over!</h2>
                    <p className="text-yellow-900 mb-4">{message}</p>
                    <button 
                        onClick={startNewGame}
                        className="px-6 py-3 bg-yellow-600 text-white rounded-lg 
                                 hover:bg-yellow-700 transition-all duration-200 
                                 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                                 font-semibold"
                    >
                        Play Again
                    </button>
                </div>
            )}

            {promotionModal.isVisible && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold mb-4">Choose Promotion</h2>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => handlePromotionChoice('q')} className="px-4 py-2 bg-blue-500 text-white rounded">Queen</button>
                            <button onClick={() => handlePromotionChoice('r')} className="px-4 py-2 bg-blue-500 text-white rounded">Rook</button>
                            <button onClick={() => handlePromotionChoice('b')} className="px-4 py-2 bg-blue-500 text-white rounded">Bishop</button>
                            <button onClick={() => handlePromotionChoice('n')} className="px-4 py-2 bg-blue-500 text-white rounded">Knight</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChessBoard;
