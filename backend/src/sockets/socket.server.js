const { Server, Socket } = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const userModel = require('../model/user.model');
const messageModel = require('../model/message.model');
const aiService = require('../services/ai.service')



function initSocketServer(httpServer) {

    const io = new Server(httpServer, {});

    io.use(async (socket, next) => {

        const cookies = cookie.parse(socket.handshake.headers?.cookie || '');

        if (!cookies.token) {
            next(new Error('Authentication error : no token provided'));
        }

        try {

            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);

            const user = await userModel.findById(decoded.id);

            socket.user = user;

            next();

        } catch (error) {
            next(new Error('Authentication error : invalid token'));
        }
    })

    io.on('connection', (socket) => {

        socket.on('ai-message', async (messagePayload) => {

            const message = await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: messagePayload.content,
                role: 'user'
            })

            const chatHistory = (await messageModel.find({
                chat: messagePayload.chat
            }).sort({ createdAt: -1 }).limit(20).lean()).reverse();


            const response = await aiService.generateResponse(chatHistory.map(item => {
                return {
                    role: item.role,
                    parts: [{ text: item.content }]
                }
            }))


            const responseMessage = await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: response,
                role: 'model'
            })


            socket.emit('ai-response', {
                content: response,
                chat: messagePayload.chat
            })


        })
    })
}

module.exports = initSocketServer;