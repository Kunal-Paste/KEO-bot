const userModel = require('../model/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


async function registerUser(req, res) {
    const { fullname: { firstname, lastname }, email, password } = req.body;

    const userExist = await userModel.findOne({ email });

    if (userExist) {
        res.status(400).json({
            message: 'user already exists.'
        })
    }

    const hashpassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
        fullname: {
            firstname, lastname
        },
        email,
        password: hashpassword
    })

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.cookie('token', token);

    res.status(201).json({
        message: 'user registered successfully',
        user: {
            email: user.email,
            _id: user._id,
            fullname: user.fullname
        }
    })
}

async function loginUser(req, res) {
    const { email, password } = req.body;

    const user = await userModel.findOne({
        email
    })

    if (!user) {
        return res.status(400).json({
            message: 'invalid email or password'
        })
    }

    const isPassword = await bcrypt.compare(password, user.password);

    if (!isPassword) {
        return res.status(400).json({
            message: 'invalid email or password'
        })
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.cookie('token', token);

    res.status(200).json({
        message: 'user loggined successfully',
        user: {
            email: user.email,
            _id: user._id,
            fullname: user.fullname
        }
    })

}




module.exports = {
    registerUser,
    loginUser
}