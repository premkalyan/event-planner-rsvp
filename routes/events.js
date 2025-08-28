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
const validateEvent = [
    body('title')
        .isLength({ min: 3 })
        .withMessage('Title must be at least 3 characters long'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('eventDate')
        .isISO8601()
        .withMessage('Event date must be a valid date')
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('Event date must be in the future');
            }
            return true;
        }),
    body('location')
        .isLength({ min: 1 })
        .withMessage('Location is required'),
    body('maxAttendees')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Max attendees must be a positive number')
];

// Get all events (public)
router.get('/', (req, res) => {
    const db = getDb();
    
    let query = `
        SELECT e.*, u.username as creator_name, u.first_name, u.last_name,
               COUNT(r.id) as rsvp_count
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN rsvps r ON e.id = r.event_id AND r.status = 'attending'
        WHERE e.status = 'active'
    `;
    
    const params = [];
    
    // Add search filter
    if (req.query.search) {
        query += ` AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)`;
        const searchTerm = `%${req.query.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Add date filter
    if (req.query.upcoming === 'true') {
        query += ` AND e.event_date > datetime('now')`;
    }
    
    query += ` GROUP BY e.id ORDER BY e.event_date ASC`;
    
    db.all(query, params, (err, events) => {
        db.close();
        
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ events });
    });
});

// Get event by ID
router.get('/:id', (req, res) => {
    const eventId = req.params.id;
    const db = getDb();
    
    // Get event details with creator info and RSVP count
    db.get(`
        SELECT e.*, u.username as creator_name, u.first_name, u.last_name,
               COUNT(r.id) as rsvp_count
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN rsvps r ON e.id = r.event_id AND r.status = 'attending'
        WHERE e.id = ?
        GROUP BY e.id
    `, [eventId], (err, event) => {
        if (err) {
            db.close();
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!event) {
            db.close();
            return res.status(404).json({ error: 'Event not found' });
        }
        
        // Get RSVPs for this event
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
            
            res.json({ 
                event,
                rsvps: rsvps || []
            });
        });
    });
});

// Create new event (authenticated)
router.post('/', authMiddleware, validateEvent, (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { title, description, eventDate, location, maxAttendees } = req.body;
        const userId = req.session.user.id;
        
        const db = getDb();
        
        db.run(
            `INSERT INTO events (title, description, event_date, location, max_attendees, created_by) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [title, description, eventDate, location, maxAttendees || null, userId],
            function(err) {
                if (err) {
                    db.close();
                    console.error('Insert error:', err);
                    return res.status(500).json({ error: 'Failed to create event' });
                }
                
                // Get the created event
                db.get(
                    `SELECT e.*, u.username as creator_name, u.first_name, u.last_name
                     FROM events e
                     JOIN users u ON e.created_by = u.id
                     WHERE e.id = ?`,
                    [this.lastID],
                    (err, event) => {
                        db.close();
                        
                        if (err) {
                            console.error('Event fetch error:', err);
                            return res.status(500).json({ error: 'Event created but fetch failed' });
                        }
                        
                        res.status(201).json({
                            message: 'Event created successfully',
                            event
                        });
                    }
                );
            }
        );
        
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update event (authenticated, owner or admin only)
router.put('/:id', authMiddleware, validateEvent, (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const eventId = req.params.id;
        const { title, description, eventDate, location, maxAttendees } = req.body;
        const userId = req.session.user.id;
        const userRole = req.session.user.role;
        
        const db = getDb();
        
        // Check if user can edit this event
        db.get(
            'SELECT created_by FROM events WHERE id = ?',
            [eventId],
            (err, event) => {
                if (err) {
                    db.close();
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (!event) {
                    db.close();
                    return res.status(404).json({ error: 'Event not found' });
                }
                
                // Check permissions
                if (event.created_by !== userId && userRole !== 'admin') {
                    db.close();
                    return res.status(403).json({ error: 'Access denied. You can only edit your own events.' });
                }
                
                // Update event
                db.run(
                    `UPDATE events 
                     SET title = ?, description = ?, event_date = ?, location = ?, max_attendees = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [title, description, eventDate, location, maxAttendees || null, eventId],
                    function(err) {
                        if (err) {
                            db.close();
                            console.error('Update error:', err);
                            return res.status(500).json({ error: 'Failed to update event' });
                        }
                        
                        // Get updated event
                        db.get(
                            `SELECT e.*, u.username as creator_name, u.first_name, u.last_name
                             FROM events e
                             JOIN users u ON e.created_by = u.id
                             WHERE e.id = ?`,
                            [eventId],
                            (err, updatedEvent) => {
                                db.close();
                                
                                if (err) {
                                    console.error('Event fetch error:', err);
                                    return res.status(500).json({ error: 'Event updated but fetch failed' });
                                }
                                
                                res.json({
                                    message: 'Event updated successfully',
                                    event: updatedEvent
                                });
                            }
                        );
                    }
                );
            }
        );
        
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete event (authenticated, owner or admin only)
router.delete('/:id', authMiddleware, (req, res) => {
    const eventId = req.params.id;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    const db = getDb();
    
    // Check if user can delete this event
    db.get(
        'SELECT created_by FROM events WHERE id = ?',
        [eventId],
        (err, event) => {
            if (err) {
                db.close();
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!event) {
                db.close();
                return res.status(404).json({ error: 'Event not found' });
            }
            
            // Check permissions
            if (event.created_by !== userId && userRole !== 'admin') {
                db.close();
                return res.status(403).json({ error: 'Access denied. You can only delete your own events.' });
            }
            
            // Delete event (CASCADE will delete related RSVPs)
            db.run(
                'DELETE FROM events WHERE id = ?',
                [eventId],
                function(err) {
                    db.close();
                    
                    if (err) {
                        console.error('Delete error:', err);
                        return res.status(500).json({ error: 'Failed to delete event' });
                    }
                    
                    res.json({ message: 'Event deleted successfully' });
                }
            );
        }
    );
});

module.exports = router;