const chatController = require('../controller/chat.controller');
const authMiddleware = require('../middleware/auth.middleware')
const express = require('express');

const router = express.Router();

router.post('/',authMiddleware.authUser,chatController.createChat);
router.get('/',authMiddleware.authUser,chatController.getChats);
router.get('/messages/:id',authMiddleware.authUser, chatController.getMessages);

module.exports = router;