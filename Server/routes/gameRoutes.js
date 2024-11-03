const express = require('express');
const { playMove, startGame, getValidMoves } = require('../controllers/gameController');

const router = express.Router();
router.post('/start', startGame);
router.post('/move', playMove);
router.post('/valid-moves', getValidMoves);
module.exports = router;
