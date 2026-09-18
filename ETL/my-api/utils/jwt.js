const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id_user: user.id_user,
            username: user.username,
            id_role: user.id_role
        },
        process.env.JWT_SECRET,
        {
            expiresIn:
                process.env.JWT_EXPIRES_IN || "15m"
        }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id_user: user.id_user,
            jti: crypto.randomUUID()
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn:
                process.env.JWT_REFRESH_EXPIRES_IN ||
                "7d"
        }
    );
};

const hashToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    hashToken
};