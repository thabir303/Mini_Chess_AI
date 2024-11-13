// /Client/ChessBoard.js

import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaRobot, FaUserFriends } from 'react-icons/fa';
import ChessLogo from './Chess1.png';

const ChessBoard = () => {
    const [board, setBoard] = useState(null);
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastMove, setLastMove] = useState(null);
    const [currentTurn, setCurrentTurn] = useState('w');
    const [possibleMoves, setPossibleMoves] = useState([]);
    const [gameResult, setGameResult] = useState(null);
    const [gameMode, setGameMode] = useState('human');
    const [capturedWhitePieces, setCapturedWhitePieces] = useState([]);
    const [capturedBlackPieces, setCapturedBlackPieces] = useState([]);
    const [evaluation, setEvaluation] = useState(null);

    const startNewGame = async (mode = 'human') => {
        try {
            setLoading(true);
            setGameMode(mode);
            setGameResult(null);
            setCapturedWhitePieces([]);
            setCapturedBlackPieces([]);
            setEvaluation(null);
            const response = await axios.post('http://localhost:5000/api/game/start', {
                gameMode: mode
            });
            setBoard(response.data.board);
            setMessage(response.data.message || 'Game started! White\'s turn');
            setLastMove(null);
            setSelectedPiece(null);
            setPossibleMoves([]);
            setCurrentTurn(response.data.turn || 'w');

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

                if (response.data.capturedPiece) {
                    updateCapturedPieces(response.data.capturedPiece);
                }
                if (response.data.evaluation !== undefined) {
                    setEvaluation(response.data.evaluation);
                }

                if (response.data.gameStatus && response.data.gameStatus.isOver) {
                    setGameResult(response.data.gameStatus.message);
                    setLoading(false);
                    return;
                }

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

    useEffect(() => {
        startNewGame('human');
    }, []);

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

    const handleSquareClick = async (row, col) => {
        if (!board || loading || gameResult) return;
        if (gameMode === 'ai-vs-ai') return;
        if (gameMode === 'ai' && currentTurn === 'b') return;

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

          // Include promotion if present in possibleMoves
          const matchingMove = possibleMoves.find(m =>
            m.from[0] === move.from[0] && m.from[1] === move.from[1] &&
            m.to[0] === move.to[0] && m.to[1] === move.to[1]
        );

        if (matchingMove && matchingMove.promotion) {
            move.promotion = matchingMove.promotion;
        }

        await sendMove(move);
    }
};

    const updateCapturedPieces = (capturedPiece) => {
        if (capturedPiece === capturedPiece.toUpperCase()) {
            // Captured piece is White, so it was captured by Black
            setCapturedBlackPieces(prev => [...prev, capturedPiece]);
        } else {
            // Captured piece is Black, so it was captured by White
            setCapturedWhitePieces(prev => [...prev, capturedPiece]);
        }
    };
    

    const sendMove = async (move) => {
        try {
            setLoading(true);

            const response = await axios.post('http://localhost:5000/api/game/move', {
                board: board,
                move: move,
                turn: currentTurn,
                gameMode: gameMode
            });

            if (response.data.capturedPiece) {
                updateCapturedPieces(response.data.capturedPiece);
            }

            setBoard(response.data.board);
            setLastMove(response.data.lastMove);
            setSelectedPiece(null);
            setPossibleMoves([]);

            if (response.data.evaluation !== undefined) {
                setEvaluation(response.data.evaluation);
            }

            if (response.data.gameStatus && response.data.gameStatus.isOver) {
                setGameResult(response.data.gameStatus.message);
                setMessage(response.data.gameStatus.message);
                return;
            }

            setCurrentTurn(response.data.turn);
            setMessage(response.data.message);

            if (gameMode === 'ai' && response.data.turn === 'b') {
                setMessage('AI is thinking...');
                await new Promise(resolve => setTimeout(resolve, 500));
                const aiResponse = await axios.post('http://localhost:5000/api/game/ai-move', {
                    board: response.data.board,
                    turn: 'b',
                    gameMode: 'ai'
                });

                if (aiResponse.data.capturedPiece) {
                    updateCapturedPieces(aiResponse.data.capturedPiece);
                }

                setBoard(aiResponse.data.board);
                setLastMove(aiResponse.data.move);
                setCurrentTurn(aiResponse.data.turn);
                setMessage(aiResponse.data.message);
                if (aiResponse.data.evaluation !== undefined) {
                    setEvaluation(aiResponse.data.evaluation);
                }
                if (aiResponse.data.gameStatus && aiResponse.data.gameStatus.isOver) {
                    setGameResult(aiResponse.data.gameStatus.message);
                    setMessage(aiResponse.data.gameStatus.message);
                    return;
                }
            }

        } catch (error) {
            setMessage('Invalid move: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
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
        return possibleMoves.some(move => move.to[0] === row && move.to[1] === col);
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

    if (!board) return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 to-slate-200">
            <div className="text-3xl font-bold text-slate-800 animate-pulse">Loading...</div>
        </div>
    );

    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-8 relative"
            style={{
                backgroundImage: "url('/chess-background.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundBlendMode: "overlay",
            }}>
            
            <img
                src={ChessLogo}
                alt="Chess Logo"
                className="absolute top-4 left-4 w-29 h-20 z-50"
                style={{ filter: 'drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.5))' }}
            />
            
            <div className="relative w-full max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-gray-800 mb-8">
                        {Array.from("Chess Attack").map((letter, index) => (
                            <span
                                key={index}
                                className="inline-block hover:text-blue-600 transition-colors duration-300"
                                style={{
                                    animation: `bounce 1s ease-in-out ${index * 0.1}s infinite`,
                                }}
                            >
                                {letter === " " ? "\u00A0" : letter}
                            </span>
                        ))}
                    </h1>
                </div>
    
                <div className="flex gap-4 mb-8 justify-center">
                    {[
                        { mode: 'human', icon: FaUserFriends, text: 'Human vs Human' },
                        { mode: 'ai', icon: FaRobot, text: 'Human vs AI' },
                        { mode: 'ai-vs-ai', icon: FaRobot, text: 'AI vs AI' }
                    ].map(({ mode, icon: Icon, text }) => (
                        <button
                            key={mode}
                            onClick={() => startNewGame(mode)}
                            className="group flex items-center gap-2 px-6 py-3 bg-gray-800/90 text-white rounded-xl
                                hover:bg-gray-700 transition-all duration-300 
                                shadow-lg hover:shadow-xl transform hover:-translate-y-1
                                font-semibold backdrop-blur-sm"
                            disabled={loading}
                        >
                            <Icon size={20} className="group-hover:scale-110 transition-transform" />
                            <span>{text}</span>
                        </button>
                    ))}
                </div>
    
                <div className="space-y-4 mb-8">
                    <div className={`text-lg px-6 py-3 rounded-xl transition-all duration-300
                        ${gameResult ? 'bg-green-100/90 text-green-800 font-bold' :
                        message.includes('Error') || message.includes('Invalid') ?
                            'bg-red-100/90 text-red-800' :
                            'bg-blue-100/90 text-blue-800'}
                        backdrop-blur-sm shadow-md`}>
                        {message}
                    </div>
                    
                    {/* {evaluation !== null && (
                        <div className="text-md px-6 py-3 rounded-xl bg-yellow-100/90 text-yellow-800 backdrop-blur-sm shadow-md">
                            {evaluation > 0 ? `Advantage for White: +${evaluation.toFixed(2)}` :
                            evaluation < 0 ? `Advantage for Black: -${(-evaluation).toFixed(2)}` :
                            'Position is equal'}
                        </div>
                    )} */}
                </div>
    
                <div className="relative flex justify-center items-center gap-8">
                    <div className="absolute -left-48 top-1/2 transform -translate-y-1/2 w-40">
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                            <div className="text-center">
                                <div className="text-xl font-bold mb-2 text-gray-800">
                                    {currentTurn === 'w' ? 'White' : 'Black'}
                                </div>
                                <div className={`w-10 h-10 rounded-full mx-auto border-4
                                    ${currentTurn === 'w' 
                                        ? 'bg-white border-gray-300' 
                                        : 'bg-gray-800 border-gray-600'}`} 
                                />
                                <div className="mt-2 font-medium text-gray-600">to move</div>
                            </div>
                        </div>
                    </div>
    
                    <div className="flex items-center gap-8">
                        <div className="bg-white/90 backdrop-blur-sm w-48 rounded-xl p-4 shadow-lg">
                            <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                                Captured by White
                            </h2>
                            <div className="grid grid-cols-4 gap-2">
                                {capturedWhitePieces.map((piece, index) => (
                                    <div 
                                        key={index} 
                                        className="w-8 h-8 flex items-center justify-center text-3xl transition-transform hover:scale-110"
                                    >
                                        {getPieceSymbol(piece)}
                                    </div>
                                ))}
                            </div>
                        </div>
    
                        <div className="bg-slate-800/95 p-8 rounded-xl shadow-2xl backdrop-blur-sm">
                            <div className="relative">
                                <div className="absolute right-full pr-3 top-0 bottom-0 flex flex-col justify-around">
                                    {[0, 1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-16 flex items-center text-gray-300 font-medium">
                                            {6 - i}
                                        </div>
                                    ))}
                                </div>
    
                                <div className="absolute left-0 right-0 bottom-full pb-3 flex justify-around">
                                    {['a', 'b', 'c', 'd', 'e'].map(letter => (
                                        <div key={letter} className="w-16 text-center text-gray-300 font-medium">
                                            {letter}
                                        </div>
                                    ))}
                                </div>
    
                                <div className="relative">
                                    {board.map((row, rowIndex) => (
                                        <div key={rowIndex} className="flex">
                                            {row.map((piece, colIndex) => {
                                                const isSelected = selectedPiece?.row === rowIndex && 
                                                                 selectedPiece?.col === colIndex;
                                                const isLastMovePart = isLastMove(rowIndex, colIndex);
                                                const isPossible = isPossibleMove(rowIndex, colIndex);
                                                const isCheck = piece.toLowerCase() === 'k' &&
                                                    ((currentTurn === 'w' && piece === 'K') ||
                                                    (currentTurn === 'b' && piece === 'k')) &&
                                                    message.includes('check');
    
                                                return (
                                                    <div
                                                        key={colIndex}
                                                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                                                        className={`
                                                            w-16 h-16 flex items-center justify-center
                                                            relative transition-all duration-200
                                                            ${(rowIndex + colIndex) % 2 === 0 ? 'bg-[#F0D9B5]' : 'bg-[#B58863]'}
                                                            ${isSelected ? 'ring-2 ring-yellow-400 ring-inset' : ''}
                                                            ${isLastMovePart ? 'ring-2 ring-blue-400 ring-inset' : ''}
                                                            ${(gameMode === 'ai-vs-ai' || (gameMode === 'ai' && currentTurn === 'b'))
                                                                ? 'cursor-not-allowed'
                                                                : 'hover:brightness-110 cursor-pointer'}
                                                        `}
                                                    >
                                                        <span className={`
                                                            text-4xl select-none transition-all duration-200
                                                            ${piece === piece.toUpperCase() ? 'text-white' : 'text-black'}
                                                            ${loading ? 'opacity-50' : 'opacity-100'}
                                                            ${isSelected ? 'scale-110' : ''}
                                                            ${isCheck ? 'text-red-500' : ''}
                                                            hover:scale-105
                                                        `}>
                                                            {getPieceSymbol(piece)}
                                                        </span>
    
                                                        {isPossible && (
                                                            <div className={`
                                                                absolute inset-0 flex items-center justify-center
                                                                ${piece === '.' ? 
                                                                    'after:content-[""] after:w-3 after:h-3 after:rounded-full after:bg-green-500 after:opacity-40' : 
                                                                    'ring-2 ring-green-500 ring-opacity-60'}
                                                            `} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
    
                        <div className="bg-white/90 backdrop-blur-sm w-48 rounded-xl p-4 shadow-lg">
                            <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                                Captured by Black
                            </h2>
                            <div className="grid grid-cols-4 gap-2">
                                {capturedBlackPieces.map((piece, index) => (
                                    <div 
                                        key={index} 
                                        className="w-8 h-8 flex items-center justify-center text-3xl transition-transform hover:scale-110"
                                    >
                                        {getPieceSymbol(piece)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
    
                    <div className="absolute -right-48 top-1/2 transform -translate-y-1/2 w-40 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                        <div className="text-center">
                            <div className="text-sm font-semibold mb-2">Game Mode</div>
                            <div className="text-base font-medium bg-gray-100 py-1 px-2 rounded">
                                {gameMode === 'human' ? 'Human vs Human' :
                                 gameMode === 'ai' ? 'Human vs AI' : 'AI vs AI'}
                            </div>
                        </div>
                    </div>
                </div>
    
                {gameResult && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                        <div className="w-96 bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Over!</h2>
                            <p className="text-gray-700 mb-6">{gameResult}</p>
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => startNewGame('human')}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg 
                                             hover:bg-blue-700 transition-all duration-200 
                                             shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    New Human Game
                                </button>
                                <button
                                    onClick={() => startNewGame('ai')}
                                    className="px-6 py-3 bg-green-600 text-white rounded-lg 
                                             hover:bg-green-700 transition-all duration-200 
                                             shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    Play vs AI
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
    
            <style jsx global>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
            `}</style>
        </div>
    );
};

export default ChessBoard;
