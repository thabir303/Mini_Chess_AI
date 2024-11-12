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
    const [gameResult, setGameResult] = useState(null);
    const [gameMode, setGameMode] = useState('human');
    const [promotionModal, setPromotionModal] = useState({
        isVisible: false,
        move: null,
    });

    const startNewGame = async (mode = 'human') => {
        setLoading(true);
        setGameMode(mode);
        setGameResult(null);
        try {
            const response = await axios.post('http://localhost:5000/api/game/start', { gameMode: mode });
            const { board, turn, message } = response.data;
            setBoard(board);
            setCurrentTurn(turn || 'w');
            setMessage(message || "Game started! White's turn");
            setLastMove(null);
            setSelectedPiece(null);
            setPossibleMoves([]);
            setPromotionModal({ isVisible: false, move: null });

            if (mode === 'ai-vs-ai') handleAIvsAI(board, 'w');
        } catch (error) {
            setMessage('Error starting game: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAIvsAI = async (currentBoard, turn) => {
        if (!currentBoard || gameResult) return;

        setLoading(true);
        try {
            const response = await axios.post('http://localhost:5000/api/game/ai-move', {
                board: currentBoard,
                turn: turn,
                gameMode: 'ai-vs-ai'
            });

            if (response.data) {
                const { board, move, turn, message, gameStatus } = response.data;
                setBoard(board);
                setLastMove(move);
                setCurrentTurn(turn);
                setMessage(message);

                if (gameStatus && gameStatus.isOver) {
                    setGameResult(gameStatus.message);
                } else {
                    handleAIvsAI(board, turn); // Trigger next AI move
                }
            }
        } catch (error) {
            setMessage('Error in AI vs AI game: ' + error.message);
        } finally {
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
            setPossibleMoves([]);
            console.error('Error getting valid moves:', error);
        }
    };

    const handleSquareClick = async (row, col) => {
        if (!board || loading || gameResult || gameMode === 'ai-vs-ai' || (gameMode === 'ai' && currentTurn === 'b')) return;

        const piece = board[row][col];
        if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
            setSelectedPiece(null);
            setPossibleMoves([]);
            setMessage(`${currentTurn === 'w' ? 'White' : 'Black'}'s turn.`);
            return;
        }

        if (!selectedPiece) {
            if (piece !== '.' && (
                (currentTurn === 'w' && piece === piece.toUpperCase()) ||
                (currentTurn === 'b' && piece === piece.toLowerCase())
            )) {
                setSelectedPiece({ row, col });
                await getValidMoves(row, col);
                setMessage(`Selected ${getPieceName(piece)}. Choose a destination.`);
            } else {
                setMessage(`Invalid selection. It is ${currentTurn === 'w' ? 'White' : 'Black'}'s turn.`);
            }
        } else {
            if (!isPossibleMove(row, col)) {
                setMessage('Invalid move. Choose a highlighted square or select a different piece.');
                return;
            }

            const move = { from: [selectedPiece.row, selectedPiece.col], to: [row, col] };
            if (piece.toLowerCase() === 'p' && (row === 0 || row === 5)) {
                setPromotionModal({ isVisible: true, move });
                return;
            }

            await sendMove(move);
        }
    };

    const sendMove = async (move, promotion = null) => {
        setLoading(true);
        try {
            const movePayload = { ...move };
            if (promotion) movePayload.promotion = promotion;

            const response = await axios.post('http://localhost:5000/api/game/move', {
                board: board,
                move: movePayload,
                turn: currentTurn,
                gameMode: gameMode
            });

            setBoard(response.data.board);
            setLastMove(response.data.lastMove);
            setSelectedPiece(null);
            setPossibleMoves([]);
            setMessage(response.data.message);

            if (response.data.gameStatus?.isOver) {
                setGameResult(response.data.gameStatus.message);
            } else {
                setCurrentTurn(response.data.turn);
            }
        } catch (error) {
            setMessage('Invalid move: ' + (error.response?.data?.error || error.message));
            if (error.response?.data.requiresPromotion) {
                setPromotionModal({ isVisible: true, move: error.response.data.move });
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
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-8">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-slate-800 mb-2">Mini Chess</h1>
                <div className="flex gap-4 mb-4 justify-center">
                    <button
                        onClick={() => startNewGame('human')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg 
                                 hover:bg-blue-700 transition-all duration-200 
                                 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 font-semibold"
                        disabled={loading}
                    >
                        Human vs Human
                    </button>
                    <button
                        onClick={() => startNewGame('ai')}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg 
                                 hover:bg-green-700 transition-all duration-200 
                                 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 font-semibold"
                        disabled={loading}
                    >
                        Human vs AI
                    </button>
                    <button
                        onClick={() => startNewGame('ai-vs-ai')}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg 
                                 hover:bg-purple-700 transition-all duration-200 
                                 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 font-semibold"
                        disabled={loading}
                    >
                        AI vs AI
                    </button>
                </div>
                <div className={`text-lg mb-4 px-4 py-2 rounded-lg transition-colors duration-200
                    ${gameResult ? 'bg-green-100 text-green-800 font-bold' :
                    message.includes('Error') || message.includes('Invalid') ? 
                        'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'}`}>
                    {message}
                </div>
                <div className="text-sm text-gray-600">
                    {gameMode === 'ai' && currentTurn === 'b' && !gameResult && 'AI is thinking...'}
                    {gameMode === 'ai-vs-ai' && !gameResult && 'AI vs AI game in progress...'}
                </div>
            </div>
    
            <div className="relative">
                {/* Turn indicator */}
                <div className="absolute -left-40 top-1/2 transform -translate-y-1/2 
                               bg-white p-4 rounded-xl shadow-lg text-center w-32">
                    <div className={`text-lg font-semibold mb-2 
                        ${currentTurn === 'w' ? 'text-slate-800' : 'text-slate-700'}`}>
                        {currentTurn === 'w' ? 'White' : 'Black'}
                    </div>
                    <div className={`w-8 h-8 rounded-full mx-auto 
                        ${currentTurn === 'w' ? 'bg-white' : 'bg-gray-800'} 
                        border-2 border-gray-400 shadow-inner`}></div>
                    <div className="mt-2 text-sm text-gray-600">to move</div>
                </div>
    
                {/* Game mode indicator */}
                <div className="absolute -right-40 top-1/2 transform -translate-y-1/2 
                               bg-white p-4 rounded-xl shadow-lg text-center w-32">
                    <div className="text-sm font-semibold mb-2 text-gray-700">
                        Game Mode
                    </div>
                    <div className="text-base font-medium bg-gray-100 py-1 px-2 rounded">
                        {gameMode === 'human' ? 'Human vs Human' : 
                         gameMode === 'ai' ? 'Human vs AI' : 'AI vs AI'}
                    </div>
                </div>
    
                {/* Chess Board Container */}
                <div className="inline-block bg-slate-800 p-8 rounded-xl shadow-2xl">
                    <div className="relative">
                        {/* Rank numbers */}
                        <div className="absolute right-full pr-3 top-0 bottom-0 flex flex-col justify-around text-gray-300 text-sm font-medium">
                            {[0, 1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 flex items-center">{6 - i}</div>
                            ))}
                        </div>
                        
                        {/* File letters */}
                        <div className="absolute left-0 right-0 bottom-full pb-3 flex justify-around text-gray-300 text-sm font-medium">
                            {['a', 'b', 'c', 'd', 'e'].map(letter => (
                                <div key={letter} className="w-16 text-center">{letter}</div>
                            ))}
                        </div>
    
                        {/* Board squares */}
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
                                                        : 'hover:after:absolute hover:after:inset-0 hover:after:bg-gray-900 hover:after:opacity-10'}
                                                    group
                                                `}
                                            >
                                                <span className={`
                                                    chess-piece select-none transform transition-all duration-200
                                                    relative z-10
                                                    ${piece === piece.toUpperCase() 
                                                        ? 'text-[#FFFFFF] drop-shadow-[2px_2px_1px_rgba(0,0,0,0.5)]' 
                                                        : 'text-[#000000] drop-shadow-[1px_1px_1px_rgba(255,255,255,0.5)]'}
                                                    ${loading ? 'opacity-50' : 'opacity-100'}
                                                    ${isSelected ? 'scale-110' : ''}
                                                    ${isCheck ? 'text-red-500' : ''}
                                                    group-hover:scale-105
                                                `}>
                                                    {getPieceSymbol(piece)}
                                                </span>
    
                                                {isPossible && (
                                                    <div className={`
                                                        absolute inset-0 flex items-center justify-center z-0
                                                        ${piece === '.' 
                                                            ? 'after:content-[""] after:absolute after:w-3 after:h-3 after:rounded-full after:bg-emerald-500 after:opacity-40' 
                                                            : 'ring-2 ring-emerald-500 ring-opacity-60 after:absolute after:inset-0 after:bg-emerald-500 after:opacity-20'}
                                                        transition-all duration-200
                                                    `} />
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
            </div>
    
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
