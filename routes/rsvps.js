const express = require('express');
const { body, validationResult } = require('express-validator');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Database connection
const dbPath = path.join(__dirname, '..', 'database', 'events.db');

function getDb() {
    return new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Database connection error:', err.message);
        }
    });
}

// Validation middleware
const validateRSVP = [
    body('eventId')
        .isInt({ min: 1 })
        .withMessage('Valid event ID is required'),
    body('status')
        .isIn(['attending', 'maybe', 'not_attending'])
        .withMessage('Status must be attending, maybe, or not_attending'),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
];

// Get user's RSVPs (authenticated)
router.get('/my-rsvps', authMiddleware, (req, res) => {
    const userId = req.session.user.id;
    const db = getDb();
    
    db.all(`
        SELECT r.*, e.title, e.description, e.event_date, e.location, e.max_attendees,
               u.username as creator_name, u.first_name as creator_first_name, u.last_name as creator_last_name
        FROM rsvps r
        JOIN events e ON r.event_id = e.id
        JOIN users u ON e.created_by = u.id
        WHERE r.user_id = ?
        ORDER BY e.event_date ASC
    `, [userId], (err, rsvps) => {
        db.close();
        
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ rsvps });
    });
});

// Get RSVPs for a specific event
router.get('/event/:eventId', (req, res) => {
    const eventId = req.params.eventId;
    const db = getDb();
    
    db.all(`
        SELECT r.status, r.notes, r.rsvp_date, u.username, u.first_name, u.last_name
        FROM rsvps r
        JOIN users u ON r.user_id = u.id
        WHERE r.event_id = ?
        ORDER BY r.rsvp_date DESC
    `, [eventId], (err, rsvps) => {
        db.close();
        
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Group by status for easier frontend handling
        const grouped = {
            attending: rsvps.filter(r => r.status === 'attending'),
            maybe: rsvps.filter(r => r.status === 'maybe'),
            not_attending: rsvps.filter(r => r.status === 'not_attending')
        };
        
        res.json({ 
            rsvps,
            grouped,
            total: rsvps.length,
            attending_count: grouped.attending.length
        });
    });
});

// Create or update RSVP (authenticated)
router.post('/', authMiddleware, validateRSVP, (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { eventId, status, notes } = req.body;
        const userId = req.session.user.id;
        
        const db = getDb();
        
        // First check if event exists and get details
        db.get(
            'SELECT id, title, max_attendees, event_date FROM events WHERE id = ? AND status = "active"',
            [eventId],
            (err, event) => {
                if (err) {
                    db.close();
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (!event) {
                    db.close();
                    return res.status(404).json({ error: 'Event not found or inactive' });
                }
                
                // Check if event is in the future
                if (new Date(event.event_date) <= new Date()) {
                    db.close();
                    return res.status(400).json({ error: 'Cannot RSVP to past events' });
                }
                
                // Check capacity if attending
                if (status === 'attending' && event.max_attendees) {
                    db.get(
                        'SELECT COUNT(*) as count FROM rsvps WHERE event_id = ? AND status = "attending"',
                        [eventId],
                        (err, result) => {
                            if (err) {
                                db.close();
                                console.error('Database error:', err);
                                return res.status(500).json({ error: 'Database error' });
                            }
                            
                            if (result.count >= event.max_attendees) {
                                db.close();
                                return res.status(400).json({ error: 'Event is at full capacity' });
                            }
                            
                            upsertRSVP();
                        }
                    );
                } else {
                    upsertRSVP();
                }
                
                function upsertRSVP() {
                    // Check if RSVP already exists
                    db.get(
                        'SELECT id FROM rsvps WHERE user_id = ? AND event_id = ?',
                        [userId, eventId],
                        (err, existingRSVP) => {
                            if (err) {
                                db.close();
                                console.error('Database error:', err);
                                return res.status(500).json({ error: 'Database error' });
                            }
                            
                            if (existingRSVP) {
                                // Update existing RSVP
                                db.run(
                                    'UPDATE rsvps SET status = ?, notes = ?, rsvp_date = CURRENT_TIMESTAMP WHERE user_id = ? AND event_id = ?',
                                    [status, notes || null, userId, eventId],
                                    function(err) {
                                        if (err) {
                                            db.close();
                                            console.error('Update error:', err);
                                            return res.status(500).json({ error: 'Failed to update RSVP' });
                                        }
                                        
                                        getRSVPDetails();
                                    }
                                );
                            } else {
                                // Create new RSVP
                                db.run(
                                    'INSERT INTO rsvps (user_id, event_id, status, notes) VALUES (?, ?, ?, ?)',
                                    [userId, eventId, status, notes || null],
                                    function(err) {
                                        if (err) {
                                            db.close();
                                            console.error('Insert error:', err);
                                            return res.status(500).json({ error: 'Failed to create RSVP' });
                                        }
                                        
                                        getRSVPDetails();
                                    }
                                );
                            }
                        }
                    );
                }
                
                function getRSVPDetails() {
                    // Get the updated RSVP with event details
                    db.get(`
                        SELECT r.*, e.title, e.event_date, e.location
                        FROM rsvps r
                        JOIN events e ON r.event_id = e.id
                        WHERE r.user_id = ? AND r.event_id = ?
                    `, [userId, eventId], (err, rsvp) => {
                        db.close();
                        
                        if (err) {
                            console.error('RSVP fetch error:', err);
                            return res.status(500).json({ error: 'RSVP saved but fetch failed' });
                        }
                        
                        res.json({
                            message: 'RSVP saved successfully',
                            rsvp
                        });
                    });
                }
            }
        );
        
    } catch (error) {
        console.error('RSVP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete RSVP (authenticated)
router.delete('/:eventId', authMiddleware, (req, res) => {
    const eventId = req.params.eventId;
    const userId = req.session.user.id;
    
    const db = getDb();
    
    db.run(
        'DELETE FROM rsvps WHERE user_id = ? AND event_id = ?',
        [userId, eventId],
        function(err) {
            db.close();
            
            if (err) {
                console.error('Delete error:', err);
                return res.status(500).json({ error: 'Failed to delete RSVP' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'RSVP not found' });
            }
            
            res.json({ message: 'RSVP deleted successfully' });
        }
    );
});

module.exports = router;