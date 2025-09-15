const { Server, Socket } = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const userModel = require('../model/user.model');
const messageModel = require('../model/message.model');
const aiService = require('../services/ai.service')
const {createMemory,queryMemory} = require('../services/vector.service');
const { chat } = require('@pinecone-database/pinecone/dist/assistant/data/chat');
const { text } = require('express');



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

            //user message
            const message = await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: messagePayload.content,
                role: 'user'
            })

            //converting user message into vectors
            const vectors = await aiService.generateVector(messagePayload.content);
            // console.log('vector generated :', vectors);


            //storing in pinecone
            await createMemory({
                vectors,
                messageId:message._id,
                metadata:{
                    chat:messagePayload.chat,
                    user:socket.user._id,
                    text:messagePayload.content
                }
            })

            const chatHistory = (await messageModel.find({
                chat: messagePayload.chat
            }).sort({ createdAt: -1 }).limit(20).lean()).reverse();

            
            //getting ai response
            const response = await aiService.generateResponse(chatHistory.map(item => {
                return {
                    role: item.role,
                    parts: [{ text: item.content }]
                }
            }))

            
            //getting and storing ai response
            const responseMessage = await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: response,
                role: 'model'
            })


            //converting ai response into vextors
            const responseVector = await aiService.generateVector(response);
 

            //storing ai response in pinecone
            await createMemory({
                vectors:responseVector,
                messageId:responseMessage._id,
                metadata:{
                    chat:messagePayload.chat,
                    user:socket.user._id,
                    text:response
                }
            })


            socket.emit('ai-response', {
                content: response,
                chat: messagePayload.chat
            })


        })
    })
}

module.exports = initSocketServer;