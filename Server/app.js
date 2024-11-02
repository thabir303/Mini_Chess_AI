const express = require('express');
const gameRoutes = require('./routes/gameRoutes');

const app = express();
app.use(express.json());
app.use('/api/game', gameRoutes);

module.exports = app;