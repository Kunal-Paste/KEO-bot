const express = require('express');
const cookieParser = require('cookie-parser')

const authRoute = require('./router/auth.routes')
const chatRoute = require('./router/chat.routes');

const app = express();

app.use(express.json());
app.use(cookieParser());


app.use('/api/auth', authRoute);
app.use('/api/chat', chatRoute);

module.exports = app;