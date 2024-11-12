const express = require('express');
const gameRoutes = require('./routes/gameRoutes');
const cors = require('cors');

const app = express();

// Enable CORS to allow requests from the frontend running on port 5173
app.use(cors({ origin: 'http://localhost:5173' }));

app.use(express.json());
app.use('/api/game', gameRoutes);

module.exports = app;