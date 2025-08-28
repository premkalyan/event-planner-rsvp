const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

/**
 * Seed the database with sample data
 */
async function seedDatabase() {
    const dbPath = path.join(__dirname, 'events.db');
    
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error connecting to database:', err.message);
            process.exit(1);
        }
        console.log('📁 Connected to database for seeding...');
    });

    try {
        // Hash passwords
        const adminPassword = await bcrypt.hash('admin123', 10);
        const userPassword = await bcrypt.hash('user123', 10);
        const demoPassword = await bcrypt.hash('demo123', 10);

        db.serialize(() => {
            // Clear existing data (in reverse order of foreign keys)
            console.log('🧹 Clearing existing data...');
            db.run('DELETE FROM rsvps');
            db.run('DELETE FROM events');
            db.run('DELETE FROM users');

            // Insert sample users
            console.log('👥 Creating sample users...');
            const userStmt = db.prepare(`
                INSERT INTO users (username, email, password_hash, role, first_name, last_name)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            userStmt.run('admin', 'admin@eventplanner.com', adminPassword, 'admin', 'Admin', 'User');
            userStmt.run('john_doe', 'john@example.com', userPassword, 'user', 'John', 'Doe');
            userStmt.run('jane_smith', 'jane@example.com', userPassword, 'user', 'Jane', 'Smith');
            userStmt.run('bob_wilson', 'bob@example.com', userPassword, 'user', 'Bob', 'Wilson');
            userStmt.run('demo', 'demo@eventplanner.com', demoPassword, 'user', 'Demo', 'User');
            userStmt.finalize();

            // Insert sample events
            console.log('🎉 Creating sample events...');
            const eventStmt = db.prepare(`
                INSERT INTO events (title, description, event_date, location, max_attendees, created_by, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            // Future events
            const futureDate1 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week from now
            const futureDate2 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 2 weeks from now
            const futureDate3 = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(); // 3 weeks from now
            const futureDate4 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 1 month from now
            
            eventStmt.run(
                'Tech Conference 2024',
                'Annual technology conference featuring the latest trends in AI, blockchain, and web development. Join industry experts for keynotes, workshops, and networking.',
                futureDate1,
                'Convention Center, Downtown',
                100,
                1, // admin user
                'active'
            );
            
            eventStmt.run(
                'Team Building Workshop',
                'Interactive team building activities designed to improve collaboration and communication. Includes lunch and group exercises.',
                futureDate2,
                'Corporate Training Center',
                25,
                1, // admin user
                'active'
            );
            
            eventStmt.run(
                'Holiday Party',
                'Annual company holiday celebration with dinner, entertainment, and awards ceremony. Dress code: business casual.',
                futureDate3,
                'Grand Ballroom Hotel',
                75,
                2, // john_doe
                'active'
            );
            
            eventStmt.run(
                'Coding Bootcamp Graduation',
                'Celebration ceremony for our latest cohort of coding bootcamp graduates. Family and friends welcome!',
                futureDate4,
                'University Auditorium',
                150,
                2, // john_doe
                'active'
            );

            eventStmt.finalize();

            // Insert sample RSVPs
            console.log('✉️ Creating sample RSVPs...');
            const rsvpStmt = db.prepare(`
                INSERT INTO rsvps (user_id, event_id, status, notes)
                VALUES (?, ?, ?, ?)
            `);
            
            // RSVPs for Tech Conference (event_id: 1)
            rsvpStmt.run(2, 1, 'attending', 'Looking forward to the AI sessions!');
            rsvpStmt.run(3, 1, 'attending', 'Excited about the networking opportunities');
            rsvpStmt.run(4, 1, 'maybe', 'Will confirm by Friday');
            rsvpStmt.run(5, 1, 'attending', '');
            
            // RSVPs for Team Building (event_id: 2)
            rsvpStmt.run(2, 2, 'attending', 'Great idea for team bonding');
            rsvpStmt.run(3, 2, 'attending', '');
            rsvpStmt.run(5, 2, 'not_attending', 'Have a family commitment that day');
            
            // RSVPs for Holiday Party (event_id: 3)
            rsvpStmt.run(1, 3, 'attending', 'Bringing my spouse');
            rsvpStmt.run(3, 3, 'attending', 'Can\'t wait for the awards ceremony');
            rsvpStmt.run(4, 3, 'attending', '');
            rsvpStmt.run(5, 3, 'maybe', 'Checking my schedule');
            
            // RSVPs for Graduation (event_id: 4)
            rsvpStmt.run(1, 4, 'attending', 'Proud of our graduates!');
            rsvpStmt.run(3, 4, 'attending', 'Will bring family members');
            
            rsvpStmt.finalize();

            console.log('');
            console.log('🎉 Database seeding completed successfully!');
            console.log('');
            console.log('Sample Users Created:');
            console.log('📧 admin@eventplanner.com / admin123 (Admin)');
            console.log('📧 john@example.com / user123 (User)');
            console.log('📧 jane@example.com / user123 (User)');
            console.log('📧 bob@example.com / user123 (User)');
            console.log('📧 demo@eventplanner.com / demo123 (User)');
            console.log('');
            console.log('Sample Events Created: 4 upcoming events');
            console.log('Sample RSVPs Created: Multiple RSVPs for testing');
            console.log('');
            console.log('Ready to run: npm run dev');
        });

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('🔒 Database connection closed.');
            }
        });
    }
}

// Run seeding if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };