# Event Planner RSVP Manager 🎉

A full-stack web application for event planning and RSVP management with multi-user interaction capabilities. Built with Node.js, Express, and SQLite.

## 🌟 Features

### Core Functionality
- **Event Management**: Create, read, update, and delete events
- **RSVP System**: Respond to events with attending/maybe/not attending status
- **User Authentication**: Secure registration and login system
- **Role-Based Access**: User and admin roles with appropriate permissions
- **Event Discovery**: Search and filter events by title, description, or location

### User Experience
- **Dashboard Views**: Personalized dashboards for users and admins
- **Event Details**: Comprehensive event information with attendee lists
- **RSVP Management**: View and manage personal RSVPs
- **Admin Controls**: Administrative interface for event and user management
- **Responsive Design**: Mobile-friendly interface (frontend to be completed)

## 🛠️ Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3 with foreign key constraints
- **Authentication**: Session-based with bcrypt password hashing
- **Validation**: Express-validator for input validation
- **Security**: Helmet.js, rate limiting, CORS protection
- **Development**: Nodemon for hot reloading

## 📁 Project Structure

```
event-planner-rsvp/
├── package.json              # Dependencies and scripts
├── server.js                 # Main Express server
├── README.md                 # This file
├── database/
│   ├── schema.sql            # Database schema definition
│   ├── init.js               # Database initialization script
│   └── seed.js               # Sample data seeding script
├── routes/
│   ├── auth.js               # Authentication endpoints
│   ├── events.js             # Event CRUD operations
│   └── rsvps.js              # RSVP management endpoints
├── middleware/
│   └── auth.js               # Authentication middleware
└── public/                   # Static files (HTML, CSS, JS) - to be created
    ├── index.html
    ├── login.html
    ├── dashboard.html
    └── ...
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/premkalyan/event-planner-rsvp.git
   cd event-planner-rsvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npm run setup
   ```

4. **Seed with sample data**
   ```bash
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Main application: http://localhost:3000
   - API health check: http://localhost:3000/api/health

## 🗄️ Database Schema

### Users Table
```sql
users (
  id, username, email, password_hash, role, 
  first_name, last_name, created_at, updated_at
)
```

### Events Table
```sql
events (
  id, title, description, event_date, location, 
  max_attendees, created_by, status, created_at, updated_at
)
```

### RSVPs Table
```sql
rsvps (
  id, user_id, event_id, status, notes, rsvp_date
)
```

## 🔑 Sample Accounts

The seed script creates the following test accounts:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@eventplanner.com | admin123 | admin | Administrator account |
| john@example.com | user123 | user | Regular user |
| jane@example.com | user123 | user | Regular user |
| bob@example.com | user123 | user | Regular user |
| demo@eventplanner.com | demo123 | user | Demo account |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/status` - Check authentication status

### Events
- `GET /api/events` - List all events (with search and filters)
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create new event (authenticated)
- `PUT /api/events/:id` - Update event (owner/admin only)
- `DELETE /api/events/:id` - Delete event (owner/admin only)

### RSVPs
- `GET /api/rsvps/my-rsvps` - Get user's RSVPs (authenticated)
- `GET /api/rsvps/event/:eventId` - Get RSVPs for an event
- `POST /api/rsvps` - Create/update RSVP (authenticated)
- `DELETE /api/rsvps/:eventId` - Delete RSVP (authenticated)

## 🔒 Security Features

- **Password Hashing**: Bcrypt with salt rounds
- **Session Management**: Secure session configuration
- **Input Validation**: Express-validator for all inputs
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Cross-origin request protection
- **Helmet**: Security headers
- **SQL Injection Protection**: Parameterized queries

## 🧪 Testing

### Manual Testing
1. **User Registration/Login Flow**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \\
     -H \"Content-Type: application/json\" \\
     -d '{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"test123\",\"firstName\":\"Test\",\"lastName\":\"User\"}'
   ```

2. **Event Creation**
   ```bash
   curl -X POST http://localhost:3000/api/events \\
     -H \"Content-Type: application/json\" \\
     -d '{\"title\":\"Test Event\",\"description\":\"A test event\",\"eventDate\":\"2024-12-01T18:00:00.000Z\",\"location\":\"Test Location\"}'
   ```

3. **RSVP to Event**
   ```bash
   curl -X POST http://localhost:3000/api/rsvps \\
     -H \"Content-Type: application/json\" \\
     -d '{\"eventId\":1,\"status\":\"attending\",\"notes\":\"Looking forward to it!\"}'
   ```

## 🎯 Next Steps

### Frontend Development
- [ ] Create HTML pages with modern, responsive design
- [ ] Implement interactive JavaScript for dynamic functionality
- [ ] Add CSS styling with mobile-first approach
- [ ] Integrate with backend API endpoints

### Enhanced Features
- [ ] Email notifications for event updates
- [ ] Event categories and tags
- [ ] Calendar integration
- [ ] Event sharing capabilities
- [ ] Waitlist functionality
- [ ] Real-time notifications

### DevOps & Deployment
- [ ] Docker containerization
- [ ] Environment configuration
- [ ] Production database setup
- [ ] CI/CD pipeline
- [ ] Monitoring and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- **GitHub Repository**: https://github.com/premkalyan/event-planner-rsvp
- **Issue Tracker**: https://github.com/premkalyan/event-planner-rsvp/issues

## 📞 Support

For questions or support, please:
1. Check the documentation above
2. Search existing GitHub issues
3. Create a new issue with detailed information

---

**Built with ❤️ using Node.js, Express, and SQLite**