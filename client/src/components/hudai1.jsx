{/* Main game container */ }
<div className="flex items-start justify-center gap-8">
    {/* Turn indicator */}
    <div className="bg-white rounded-xl shadow-xl p-6 w-48">
        <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 mb-4 
                  flex items-center justify-center text-white text-2xl">
                {currentTurn === 'w' ? '♔' : '♚'}
            </div>
            <span className="text-lg font-semibold text-gray-800">
                {currentTurn === 'w' ? 'White' : 'Black'}
            </span>
            <span className="text-sm text-gray-500 mt-1">to move</span>
        </div>
    </div>

    {/* Chess board */}
    <div className="relative bg-slate-800 p-8 rounded-xl shadow-2xl">
        {/* Board coordinates */}
        <div className="absolute right-full pr-3 top-0 bottom-0 flex flex-col justify-around">
            {[6, 5, 4, 3, 2, 1].map(num => (
                <div key={num} className="h-16 flex items-center text-slate-400">
                    {num}
                </div>
            ))}
        </div>

        <div className="absolute left-0 right-0 bottom-full pb-3 flex justify-around">
            {['a', 'b', 'c', 'd', 'e'].map(letter => (
                <div key={letter} className="w-16 text-center text-slate-400">
                    {letter}
                </div>
            ))}
        </div>

        {/* Board squares */}
        <div className="relative">
            {board.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                    {row.map((piece, colIndex) => {
                        const isLight = (rowIndex + colIndex) % 2 === 0;
                        return (
                            <div
                                key={colIndex}
                                onClick={() => handleSquareClick(rowIndex, colIndex)}
                                className={`
                w-16 h-16 flex items-center justify-center text-4xl
                ${isLight ? 'bg-[#F0D9B5]' : 'bg-[#B58863]'}
                relative transition-all duration-200
                ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}
                hover:after:absolute hover:after:inset-0 
                hover:after:bg-black hover:after:bg-opacity-10
              `}
                            >
                                <span className={`
                relative z-10 transition-transform duration-200
                ${piece === piece.toUpperCase() ? 'text-white' : 'text-black'}
                hover:scale-110
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

    {/* Side panel */}
    <div className="flex flex-col gap-6 w-64">
        {/* Captured pieces sections */}
        <div className="bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                Captured by White
            </h3>
            <div className="flex flex-wrap gap-2">
                {capturedWhitePieces.map((piece, i) => (
                    <span key={i} className="text-3xl">
                        {getPieceSymbol(piece)}
                    </span>
                ))}
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                Captured by Black
            </h3>
            <div className="flex flex-wrap gap-2">
                {capturedBlackPieces.map((piece, i) => (
                    <span key={i} className="text-3xl">
                        {getPieceSymbol(piece)}
                    </span>
                ))}
            </div>
        </div>

        {/* Game mode indicator */}
        <div className="bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Game Mode
            </h3>
            <div className="px-4 py-2 bg-slate-100 rounded-lg text-center text-slate-700">
                {gameMode === 'human' ? 'Human vs Human' :
                    gameMode === 'ai' ? 'Human vs AI' : 'AI vs AI'}
            </div>
        </div>
    </div>

</div>