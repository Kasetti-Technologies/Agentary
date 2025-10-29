const jwt = require('jsonwebtoken'); // Or your preferred JWT library

// Middleware to verify the token exists and is valid.
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
    if (!token) {
        return res.status(401).json({ message: 'Authentication token required.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user payload to the request object
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
}

// Middleware to check for the 'admin' role.
// This should run *after* authMiddleware.
function adminOnlyMiddleware(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
}

module.exports = { authMiddleware, adminOnlyMiddleware };
