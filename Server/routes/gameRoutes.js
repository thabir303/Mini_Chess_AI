const express = require('express');
const { playMove, startGame } = require('../controllers/gameController');

const router = express.Router();
router.post('/start', startGame);
router.post('/move', playMove);

module.exports = router;
