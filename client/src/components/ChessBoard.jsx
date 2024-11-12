import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaChess, FaRobot, FaUserFriends } from 'react-icons/fa';
import ChessLogo from './Chess1.png';
import Profile from './profile.jpg';

const ChessBoard = () => {
    // State declarations
    const [board, setBoard] = useState(null);
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastMove, setLastMove] = useState(null);
    const [currentTurn, setCurrentTurn] = useState('w');
    const [possibleMoves, setPossibleMoves] = useState([]);
    const [gameResult, setGameResult] = useState(null);
    const [gameMode, setGameMode] = useState('human');
    const [promotionModal, setPromotionModal] = useState({
        isVisible: false,
        move: null,
    });
    const [capturedWhitePieces, setCapturedWhitePieces] = useState([]); // Captured pieces for white
    const [capturedBlackPieces, setCapturedBlackPieces] = useState([]); // Captured pieces for black

    // Function to start a new game
    const startNewGame = async (mode = 'human') => {
        try {
            setLoading(true);
            setGameMode(mode);
            setGameResult(null);
            setCapturedWhitePieces([]); // Clear captured pieces
            setCapturedBlackPieces([]);
            const response = await axios.post('http://localhost:5000/api/game/start', {
                gameMode: mode
            });
            setBoard(response.data.board);
            setMessage(response.data.message || 'Game started! White\'s turn');
            setLastMove(null);
            setSelectedPiece(null);
            setPossibleMoves([]);
            setCurrentTurn(response.data.turn || 'w');
            setPromotionModal({ isVisible: false, move: null });

            // If AI vs AI, start the game loop
            if (mode === 'ai-vs-ai') {
                setTimeout(() => {
                    handleAIvsAI(response.data.board, 'w');
                }, 1000);
            }
            setLoading(false);
        } catch (error) {
            setMessage('Error starting game: ' + error.message);
            setLoading(false);
        }
    };

    // Function to handle AI vs AI gameplay
    const handleAIvsAI = async (currentBoard, turn) => {
        if (!currentBoard || loading || gameResult) return;

        try {
            setLoading(true);
            const response = await axios.post('http://localhost:5000/api/game/ai-move', {
                board: currentBoard,
                turn: turn,
                gameMode: 'ai-vs-ai'
            });

            if (response.data) {
                setBoard(response.data.board);
                setLastMove(response.data.move);
                setCurrentTurn(response.data.turn);
                setMessage(response.data.message);

                // Update captured pieces if any in AI vs AI
                if (response.data.capturedPiece) {
                    updateCapturedPieces(response.data.capturedPiece);
                }

                // Handle game end condition
                if (response.data.gameStatus && response.data.gameStatus.isOver) {
                    setGameResult(response.data.gameStatus.message);
                    setLoading(false);
                    return;
                }

                // Add a small delay between moves
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (!response.data.gameStatus?.isOver) {
                    setLoading(false);
                    handleAIvsAI(response.data.board, response.data.turn);
                }
            }
        } catch (error) {
            console.error('Error in AI vs AI game:', error);
            setMessage('Error in AI vs AI game: ' + error.message);
            setLoading(false);
        }
    };

    // Cleanup effect
    useEffect(() => {
        let mounted = true;

        const cleanup = () => {
            mounted = false;
            setLoading(false);
        };

        return cleanup;
    }, []);

    // Start a new game on component mount
    useEffect(() => {
        startNewGame('human');
    }, []);

    // Function to get valid moves for a selected piece
    const getValidMoves = async (row, col) => {
        if (gameMode !== 'human' && currentTurn === 'b') return;

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

    // Function to handle square clicks
    const handleSquareClick = async (row, col) => {
        if (!board || loading || gameResult) return;
        if (gameMode === 'ai-vs-ai') return; // Disable clicks in AI vs AI mode
        if (gameMode === 'ai' && currentTurn === 'b') return; // Disable clicks during AI turn

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
            const piece = board[selectedPiece.row][selectedPiece.col];
            const isPawn = piece.toLowerCase() === 'p';
            const promotionRow = currentTurn === 'w' ? 0 : 5;
            const isPromotionMove = isPawn && row === promotionRow;

            if (isPromotionMove) {
                setPromotionModal({
                    isVisible: true,
                    move: move
                });
                return;
            }

            await sendMove(move);
        }
    };

    // Helper function to update captured pieces
    const updateCapturedPieces = (capturedPiece) => {
        if (capturedPiece === capturedPiece.toUpperCase()) {
            setCapturedBlackPieces(prev => [...prev, capturedPiece]); // Black captured
        } else {
            setCapturedWhitePieces(prev => [...prev, capturedPiece]); // White captured
        }
    };

    // Function to send a move to the backend
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
                turn: currentTurn,
                gameMode: gameMode
            });

            // Update captured pieces if any
            if (response.data.capturedPiece) {
                updateCapturedPieces(response.data.capturedPiece);
            }

            setBoard(response.data.board);
            setLastMove(response.data.lastMove);
            setSelectedPiece(null);
            setPossibleMoves([]);

            if (response.data.gameStatus && response.data.gameStatus.isOver) {
                setGameResult(response.data.gameStatus.message);
                setMessage(response.data.gameStatus.message);
                return;
            }

            setCurrentTurn(response.data.turn);
            setMessage(response.data.message);

        } catch (error) {
            if (error.response?.data.requiresPromotion) {
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

    // Function to handle promotion choice
    const handlePromotionChoice = (promotion) => {
        sendMove(promotionModal.move, promotion);
        setPromotionModal({ isVisible: false, move: null });
    };

    // Function to check if a square was part of the last move
    const isLastMove = (row, col) => {
        if (!lastMove) return false;
        return (
            (lastMove.from[0] === row && lastMove.from[1] === col) ||
            (lastMove.to[0] === row && lastMove.to[1] === col)
        );
    };

    // Function to check if a move is possible
    const isPossibleMove = (row, col) => {
        return possibleMoves.some(move => move.to[0] === row && move.to[1] === col);
    };

    // Function to get the name of a piece
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

    // Function to get the symbol of a piece
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

    // Loading state
    if (!board) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 to-slate-200">
                <div className="text-3xl font-bold text-slate-800 animate-pulse">Loading...</div>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col items-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-8"
            style={{
                backgroundImage: "url('/chess-background.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backdropFilter: "blur(8px)", // Adjust blur intensity here
                WebkitBackdropFilter: "blur(80px)"
            }}
        >
            {/* Chess Logo */}
            <img
                src={ChessLogo}
                alt="Chess Logo"
                className="absolute top-4 left-4 w-29 h-20"
                style={{
                    filter: 'drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.5))'
                }}
            />

            {/* Header Section */}
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold mb-2">
                    {Array.from("ChessAttack").map((letter, index) => (
                        <span
                            key={index}
                            className="inline-block"
                            style={{
                                animation: `color-change 1.5s infinite ${index * 0.2}s`, // Staggered delay for each letter
                                display: "inline-block",
                            }}
                        >
                            {letter}
                        </span>
                    ))}
                </h1>

                {/* Keyframes for color change animation */}
                <style jsx>{`
                    @keyframes color-change {
                        0%, 100% {
                            color: #ffffff; /* White */
                        }
                        80% {
                            color: #0e86d4; 
                        }
                    }
                `}</style>

                {/* Game Mode Buttons */}
                <div className="flex gap-4 mb-4 justify-center">
                    <button
                        onClick={() => startNewGame('human')}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg 
                                   hover:bg-gray-600 transition-all duration-200 
                                   shadow-md hover:shadow-lg transform hover:-translate-y-0.5
                                   font-semibold"
                        disabled={loading}
                    >
                        <FaUserFriends size={20} />
                        Human vs Human
                    </button>
                    <button
                        onClick={() => startNewGame('ai')}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg 
                                   hover:bg-gray-600 transition-all duration-200 
                                   shadow-md hover:shadow-lg transform hover:-translate-y-0.5
                                   font-semibold"
                        disabled={loading}
                    >
                        <FaRobot size={20} />
                        Human vs AI
                    </button>
                    <button
                        onClick={() => startNewGame('ai-vs-ai')}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg 
                                   hover:bg-gray-600 transition-all duration-200 
                                   shadow-md hover:shadow-lg transform hover:-translate-y-0.5
                                   font-semibold"
                        disabled={loading}
                    >
                        <FaRobot size={20} />
                        AI vs AI
                    </button>
                </div>

                {/* Message Display */}
                <div
                    className={`text-lg mb-4 px-4 py-2 rounded-lg transition-colors duration-200
                                ${gameResult ? 'bg-green-100 text-green-800 font-bold' :
                            message.includes('Error') || message.includes('Invalid') ?
                                'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'}`}
                >
                    {message}
                </div>

                {/* Additional Information */}
                <div className="text-sm text-gray-600">
                    {gameMode === 'ai' && currentTurn === 'b' && !gameResult && 'AI is thinking...'}
                    {gameMode === 'ai-vs-ai' && !gameResult && 'AI vs AI game in progress...'}
                </div>
            </div>

            {/* Main Chess Area */}
            <div className="relative">
                {/* Wrapper div to shift everything slightly to the right */}
                <div className="flex items-center justify-center min-h-screen"> {/* Added ml-10 to shift content to the right */}

                    {/* Main container with background */}
                    <div
                        className="flex items-start min-h-screen p-8 bg-gradient-to-br from-slate-100 to-slate-200 justify-end"
                        style={{
                            backgroundImage: "url('/Chess.png')",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            backdropFilter: "blur(8px)", // Adjust blur intensity here
                            WebkitBackdropFilter: "blur(8px)"
                        }}
                    >
                        {/* Turn Indicator with Player Picture */}
                        <div
                            className="absolute -left-52 top-1/4 transform -translate-y-1/2 bg-white p-4 rounded-xl shadow-lg text-center w-32"
                        > {/* Adjusted from -left-56 to -left-52 to move slightly right */}
                            {/* Player Picture */}
                            <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden shadow-lg">
                                <img
                                    src={Profile}
                                    alt="Profile picture"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Turn Indicator Content */}
                            <div
                                className={`text-lg font-semibold mb-2 ${currentTurn === 'w' ? 'text-slate-800' : 'text-slate-700'
                                    }`}
                            >
                                {currentTurn === 'w' ? 'White' : 'Black'}
                            </div>
                            <div
                                className={`w-8 h-8 rounded-full mx-auto ${currentTurn === 'w' ? 'bg-white' : 'bg-gray-800'
                                    } border-2 border-gray-400 shadow-inner`}
                            ></div>
                            <div className="mt-2 text-sm text-gray-600">to move</div>
                        </div>

                        {/* Chess Board Container */}
                        <div
                            className="inline-block bg-slate-800 p-8 rounded-xl shadow-2xl ml-8 mr-12"
                        > {/* Increased ml from ml-auto to ml-8 and mr-8 to mr-12 for subtle right shift */}
                            <div className="relative">
                                {/* Rank Numbers */}
                                <div className="absolute right-full pr-3 top-0 bottom-0 flex flex-col justify-around text-gray-300 text-sm font-medium">
                                    {[0, 1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-16 flex items-center">{6 - i}</div>
                                    ))}
                                </div>

                                {/* File Letters */}
                                <div className="absolute left-0 right-0 bottom-full pb-3 flex justify-around text-gray-300 text-sm font-medium">
                                    {['a', 'b', 'c', 'd', 'e'].map(letter => (
                                        <div key={letter} className="w-16 text-center">{letter}</div>
                                    ))}
                                </div>

                                {/* Board Squares */}
                                <div className="relative">
                                    {board.map((row, rowIndex) => (
                                        <div key={rowIndex} className="flex">
                                            {row.map((piece, colIndex) => {
                                                const isSelected = selectedPiece &&
                                                    selectedPiece.row === rowIndex &&
                                                    selectedPiece.col === colIndex;

                                                const isLastMovePart = isLastMove(rowIndex, colIndex);
                                                const isPossible = isPossibleMove(rowIndex, colIndex);
                                                const isCheck = piece.toLowerCase() === 'k' &&
                                                    ((currentTurn === 'w' && piece === 'K') ||
                                                        (currentTurn === 'b' && piece === 'k')) &&
                                                    message.includes('check');

                                                const squareColor = (rowIndex + colIndex) % 2 === 0
                                                    ? 'bg-[#F0D9B5]'
                                                    : 'bg-[#B58863]';

                                                return (
                                                    <div
                                                        key={colIndex}
                                                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                                                        className={`
                                                w-16 h-16 flex items-center justify-center text-4xl
                                                cursor-pointer relative transition-all duration-200
                                                ${squareColor}
                                                ${isSelected ? 'after:absolute after:inset-0 after:bg-yellow-400 after:opacity-30' : ''}
                                                ${isLastMovePart ? 'after:absolute after:inset-0 after:bg-indigo-500 after:opacity-20' : ''}
                                                ${(gameMode === 'ai-vs-ai' || (gameMode === 'ai' && currentTurn === 'b'))
                                                                ? 'cursor-not-allowed'
                                                                : 'hover:after:absolute hover:after:inset-0 hover:after:bg-gray-900 hover:after:opacity-10'
                                                            }
                                                group
                                            `}
                                                    >
                                                        <span
                                                            className={`
                                                    chess-piece select-none transform transition-all duration-200
                                                    relative z-10
                                                    ${piece === piece.toUpperCase()
                                                                    ? 'text-[#FFFFFF] drop-shadow-[2px_2px_1px_rgba(0,0,0,0.5)]'
                                                                    : 'text-[#000000] drop-shadow-[1px_1px_1px_rgba(255,255,255,0.5)]'
                                                                }
                                                    ${loading ? 'opacity-50' : 'opacity-100'}
                                                    ${isSelected ? 'scale-110' : ''}
                                                    ${isCheck ? 'text-red-500' : ''}
                                                    group-hover:scale-105
                                                `}
                                                        >
                                                            {getPieceSymbol(piece)}
                                                        </span>

                                                        {isPossible && (
                                                            <div
                                                                className={`
                                                        absolute inset-0 flex items-center justify-center z-0
                                                        ${piece === '.'
                                                                        ? 'after:content-[""] after:absolute after:w-3 after:h-3 after:rounded-full after:bg-emerald-500 after:opacity-40'
                                                                        : 'ring-2 ring-emerald-500 ring-opacity-60 after:absolute after:inset-0 after:bg-emerald-500 after:opacity-20'
                                                                    }
                                                        transition-all duration-200
                                                    `}
                                                            />
                                                        )}

                                                        {isLastMovePart && (
                                                            <>
                                                                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-indigo-400 opacity-40"></div>
                                                                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-indigo-400 opacity-40"></div>
                                                                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-indigo-400 opacity-40"></div>
                                                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-indigo-400 opacity-40"></div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar for Captured Pieces and Game Mode */}
                        <div className="flex flex-col gap-8 ml-24"> {/* Increased ml from ml-20 to ml-24 to shift sidebar slightly right */}
                            {/* Captured Pieces by White */}
                            <div className="bg-white p-8 rounded-lg shadow-lg w-80 h-65 flex flex-col">
                                {/* Label */}
                                <div className="bg-blue-100 p-2 rounded-md mb-4 shadow-sm">
                                    <h2 className="text-lg font-semibold text-blue-700">Captured by White</h2>
                                </div>

                                {/* Captured Pieces */}
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {capturedWhitePieces.map((piece, index) => (
                                        <span key={index} className="text-4xl">
                                            {getPieceSymbol(piece)}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Captured Pieces by Black */}
                            <div className="bg-white p-8 rounded-lg shadow-lg w-80 h-65 flex flex-col">
                                {/* Label */}
                                <div className="bg-red-100 p-2 rounded-md mb-4 shadow-sm">
                                    <h2 className="text-lg font-semibold text-red-700">Captured by Black</h2>
                                </div>

                                {/* Captured Pieces */}
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {capturedBlackPieces.map((piece, index) => (
                                        <span key={index} className="text-4xl">
                                            {getPieceSymbol(piece)}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Game Mode Indicator */}
                            <div className="bg-white p-4 rounded-lg shadow-lg text-center">
                                <h2 className="text-sm font-semibold text-gray-700">Game Mode</h2>
                                <p className="text-base font-medium bg-gray-100 py-1 px-2 rounded">
                                    {gameMode === 'human' ? 'Human vs Human' :
                                        gameMode === 'ai' ? 'Human vs AI' : 'AI vs AI'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Game Result Modal */}
            {gameResult && (
                <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 
                               rounded-xl border border-yellow-200 shadow-lg text-center
                               transform animate-fadeIn w-96">
                    <h2 className="text-2xl font-bold text-yellow-800 mb-3">Game Over!</h2>
                    <p className="text-yellow-900 mb-4">{gameResult}</p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => startNewGame('human')}
                            className="px-6 py-3 bg-yellow-600 text-white rounded-lg 
                                       hover:bg-yellow-700 transition-all duration-200 
                                       shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                                       font-semibold"
                        >
                            New Human Game
                        </button>
                        <button
                            onClick={() => startNewGame('ai')}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg 
                                       hover:bg-green-700 transition-all duration-200 
                                       shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                                       font-semibold"
                        >
                            Play vs AI
                        </button>
                    </div>
                </div>
            )}

            {/* Promotion Modal */}
            {promotionModal.isVisible && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold mb-4">Choose Promotion</h2>
                        <div className="flex gap-4 justify-center">
                            {['q', 'r', 'b', 'n'].map(piece => (
                                <button
                                    key={piece}
                                    onClick={() => handlePromotionChoice(piece)}
                                    className="px-6 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600
                                             transition-all duration-200 shadow-md hover:shadow-lg
                                             transform hover:-translate-y-0.5"
                                >
                                    <span className="text-3xl">
                                        {getPieceSymbol(currentTurn === 'w' ? piece.toUpperCase() : piece)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChessBoard;
