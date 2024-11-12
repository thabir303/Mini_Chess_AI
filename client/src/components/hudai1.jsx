{/* Chess Board Container */ }
<div className="inline-block bg-slate-800 p-8 rounded-xl shadow-2xl mr-8">
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

{/* Sidebar for captured pieces and game mode */ }
<div className="flex flex-col gap-8">
    {/* Display captured pieces for White */}
    <div className="bg-white p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold text-black mb-2">Captured by White</h2>
        <div className="flex flex-wrap gap-2">
            {capturedWhitePieces.map((piece, index) => (
                <span key={index} className="text-4xl">
                    {getPieceSymbol(piece)}
                </span>
            ))}
        </div>
    </div>

    {/* Display captured pieces for Black */}
    <div className="bg-white p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold text-black mb-2">Captured by Black</h2>
        <div className="flex flex-wrap gap-2">
            {capturedBlackPieces.map((piece, index) => (
                <span key={index} className="text-4xl">
                    {getPieceSymbol(piece)}
                </span>
            ))}
        </div>
    </div>

    {/* Game mode indicator */}
    <div className="bg-white p-4 rounded-lg shadow-lg text-center">
        <h2 className="text-sm font-semibold text-gray-700">Game Mode</h2>
        <p className="text-base font-medium bg-gray-100 py-1 px-2 rounded">
            {gameMode === 'human' ? 'Human vs Human' :
                gameMode === 'ai' ? 'Human vs AI' : 'AI vs AI'}
        </p>
    </div>
</div>