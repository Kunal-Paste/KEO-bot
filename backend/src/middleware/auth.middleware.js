
const userModel = require('../model/user.model');
const jwt = require('jsonwebtoken');

async function authUser(req, res, next) {

    const { token } = req.cookies;

    if (!token) {
        return res.status(401).json({
            message: 'unauthorized'
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id)
        req.user = user;
        next()
    } catch (error) {
        console.log(error);
        res.status(401).json({
            message: 'unauthorized'
        })
    }
}

module.exports = {
    authUser
}