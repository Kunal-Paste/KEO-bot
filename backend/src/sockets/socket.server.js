const { Server, Socket } = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const userModel = require('../model/user.model');
const messageModel = require('../model/message.model');
const aiService = require('../services/ai.service')
const { createMemory, queryMemory } = require('../services/vector.service');
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

            const [message, vectors] = await Promise.all([
                messageModel.create({
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    content: messagePayload.content,
                    role: 'user'
                }),
                aiService.generateVector(messagePayload.content),
            ])

            //storing in pinecone
            await createMemory({
                vectors,
                messageId: message._id,
                metadata: {
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    text: messagePayload.content
                }
            })



            const [memory, chatHistory] = await Promise.all([
                queryMemory({
                    queryVector: vectors,
                    limit: 3,
                    metadata: {
                        user: socket.user._id
                    }
                }),
                messageModel.find({
                    chat: messagePayload.chat
                }).sort({ createdAt: -1 }).limit(20).lean().then(message => message.reverse())
            ])


            const shortTerm = chatHistory.map(item => {
                return {
                    role: item.role,
                    parts: [{ text: item.content }]
                }
            })

            const longTerm = [{
                role: "user",
                parts: [{
                    text: `
                      these are some previous messages from the chat, use them to generate response
                      ${memory.map(items => items.metadata.text).join("\n")}
                    `
                }]
            }]

            // console.log(longTerm[0]);
            // console.log(shortTerm);


            //getting ai response
            const response = await aiService.generateResponse([...longTerm, ...shortTerm]);


            socket.emit('ai-response', {
                content: response,
                chat: messagePayload.chat
            })



            const [responseMessage, responseVector] = await Promise.all([
                messageModel.create({
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    content: response,
                    role: 'model'
                }),
                aiService.generateVector(response)
            ])


            //storing ai response in pinecone
            await createMemory({
                vectors: responseVector,
                messageId: responseMessage._id,
                metadata: {
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    text: response
                }
            })


        })
    })
}

module.exports = initSocketServer;