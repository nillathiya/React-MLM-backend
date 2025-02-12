const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.ACCESS_TOKEN_SECRET;

const generateToken = (payload, expiresIn = ACCESS_TOKEN_EXPIRY) => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn });
};

const verifyToken = (token) => {
    return jwt.verify(token, SECRET_KEY);
};

module.exports = { generateToken, verifyToken };
