const chatController = require('../controller/chat.controller');
const authMiddleware = require('../middleware/auth.middleware')
const express = require('express');

const router = express.Router();

router.post('/',authMiddleware.authUser,chatController.createChat);

module.exports = router;