/**
 * Authentication middleware
 * Checks if user is logged in and session is valid
 */
function authMiddleware(req, res, next) {
    // Check if user session exists
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Please log in to access this resource'
        });
    }
    
    // Check if session has required user data
    if (!req.session.user.id || !req.session.user.username) {
        return res.status(401).json({ 
            error: 'Invalid session',
            message: 'Session data is corrupted, please log in again'
        });
    }
    
    // User is authenticated, proceed to next middleware
    next();
}

/**
 * Admin authentication middleware
 * Checks if user is logged in AND has admin role
 */
function adminMiddleware(req, res, next) {
    // First check basic authentication
    authMiddleware(req, res, (err) => {
        if (err) return;
        
        // Check if user has admin role
        if (req.session.user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Admin access required',
                message: 'This resource requires administrator privileges'
            });
        }
        
        // User is admin, proceed
        next();
    });
}

/**
 * Optional authentication middleware
 * Adds user info if logged in, but doesn't require authentication
 */
function optionalAuthMiddleware(req, res, next) {
    // Add user info if available, but don't block if not authenticated
    req.currentUser = req.session && req.session.user ? req.session.user : null;
    next();
}

module.exports = authMiddleware;
module.exports.admin = adminMiddleware;
module.exports.optional = optionalAuthMiddleware;