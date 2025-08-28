const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Initialize the SQLite database with schema
 */
function initializeDatabase() {
    const dbPath = path.join(__dirname, 'events.db');
    
    // Create database connection
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error creating database:', err.message);
            process.exit(1);
        }
        console.log('📁 Connected to SQLite database at:', dbPath);
    });

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split and execute SQL statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    db.serialize(() => {
        statements.forEach((statement, index) => {
            db.run(statement, (err) => {
                if (err) {
                    console.error(`Error executing statement ${index + 1}:`, err.message);
                    console.error('Statement:', statement.trim());
                } else {
                    console.log(`✅ Executed statement ${index + 1}`);
                }
            });
        });
        
        console.log('🎉 Database initialization completed!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Run: npm run seed (to add sample data)');
        console.log('2. Run: npm run dev (to start the server)');
        
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('🔒 Database connection closed.');
            }
        });
    });
}

// Run initialization if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };