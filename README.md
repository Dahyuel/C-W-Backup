# ASU Career Week Event Management System

A comprehensive event management platform built for Ain Shams University Career Week, featuring real-time attendance tracking, volunteer coordination, QR code scanning, and advanced analytics.

## 🚀 Features

### Core Features
- **Multi-Role Authentication System**
  - Attendees, Volunteers, Team Leaders, and Administrators
  - Secure email/password authentication via Supabase Auth
  - Profile completion workflow with validation
  - Password reset functionality

- **Real-Time Attendance Tracking**
  - QR code-based check-in/check-out system
  - Building entry/exit monitoring
  - Event entry/exit tracking
  - Session attendance management

- **Advanced Admin Dashboard**
  - Comprehensive statistics and analytics
  - User management across all roles
  - Real-time event monitoring
  - Data export capabilities
  - Pagination support for large datasets (handles 1000+ records)

- **Volunteer Management**
  - Volunteer registration and ID assignment
  - Team assignment and role management
  - Activity tracking and scoring
  - Leaderboard system

- **Session & Schedule Management**
  - Create and manage event sessions
  - Workshop and talk scheduling
  - Capacity management
  - Booking system for attendees

- **Company & Exhibitor Management**
  - Company profile creation
  - Logo and booth assignment
  - Interactive company listings

- **Notification System**
  - Targeted announcements by role
  - Custom user selection
  - Real-time notification delivery

- **Gamification Features**
  - Points and scoring system
  - Leaderboards (separate for attendees and volunteers)
  - Activity badges and rewards

### Technical Features
- **Optimized Performance**
  - React Query for efficient data fetching
  - Memoized components and hooks
  - Lazy loading and code splitting
  - Database indexes for fast queries
  - Pagination for large datasets

- **Responsive Design**
  - Mobile-first approach
  - Works on all devices and screen sizes
  - Touch-optimized UI components

- **Security**
  - Row Level Security (RLS) on all database tables
  - Secure file uploads to Supabase Storage
  - Input validation and sanitization
  - Protected routes and role-based access control

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Modern web browser with JavaScript enabled

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**

   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Get these values from your Supabase project dashboard:
   - Go to Settings → API
   - Copy the Project URL
   - Copy the `anon public` key

4. **Database Setup**

   The database schema includes:
   - `users_profiles` - User information and roles
   - `attendances` - Attendance records
   - `sessions` - Event sessions and workshops
   - `schedule_items` - Event schedule
   - `companies` - Exhibiting companies
   - `notifications` - System announcements
   - `user_notifications` - User notification tracking
   - `user_scores` - Gamification points

5. **Storage Buckets**

   Create these storage buckets in Supabase:
   - `university-ids` - For student ID uploads
   - `cvs` - For CV/resume uploads
   - `Assets` - For company logos and maps

   Configure public access as needed for each bucket.

## 🚀 Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Build

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## 📁 Project Structure

```
project/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── shared/          # Shared components (QR scanner, layouts)
│   │   ├── AuthRegistration.tsx
│   │   ├── LoginForm.tsx
│   │   ├── RegistrationForm.tsx
│   │   └── ...
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx  # Authentication state management
│   ├── lib/                 # Library code
│   │   └── supabase.ts      # Supabase client and utilities
│   ├── pages/               # Page components
│   │   ├── admin/           # Admin dashboards
│   │   ├── team/            # Team dashboards
│   │   ├── user/            # User dashboards
│   │   └── volunteer/       # Volunteer pages
│   ├── styles/              # Global styles
│   │   └── animations.css   # Animation definitions
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   │   ├── constants.ts     # App constants
│   │   └── validation.ts    # Validation functions
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── dist/                    # Build output
└── README.md
```

## 🔐 User Roles & Access

### Attendee
- Register for the event
- Complete profile with university details
- Upload university ID and CV
- View event schedule and sessions
- Book workshops and talks
- Track personal attendance
- View leaderboard position

### Volunteer
- Specialized registration process
- Assigned volunteer ID
- Access to volunteer dashboard
- Activity tracking and scoring
- Team-specific features

### Team Leader
- Manage team members
- View team statistics
- Track team performance
- Access team-specific tools

### Registration Team
- Scan QR codes for check-in
- Validate attendee information
- Manage on-site registrations

### Building Team
- Monitor building entry/exit
- Track capacity in real-time
- Manage building access

### Info Desk
- Access attendee information
- Help with queries and directions
- Basic search functionality

### Admin
- Full system access
- User management
- Statistics and analytics
- Content management (sessions, companies, announcements)
- Data export and reporting

### Super Admin
- All admin capabilities
- System configuration
- Role assignment
- Advanced analytics

## 🎨 Key Components

### QR Scanner
High-performance QR code scanner with:
- Real-time scanning
- Automatic detection
- Validation and error handling
- Support for both UUID and Personal ID formats

### Dashboard Layout
Reusable dashboard wrapper with:
- Responsive navigation
- Role-based menu items
- User profile display
- Quick actions sidebar

### Leaderboard
Gamification component featuring:
- Real-time rankings
- Separate leaderboards for different roles
- User position highlighting
- Score breakdown

### File Upload
Secure file upload with:
- Drag and drop support
- File type validation
- Size limit enforcement
- Progress indication
- Supabase Storage integration

## 🔧 Configuration

### Tailwind CSS
The project uses Tailwind CSS for styling. Configuration is in `tailwind.config.js`.

### Vite
Build tool configuration is in `vite.config.ts`.

### TypeScript
TypeScript configuration is split across:
- `tsconfig.json` - Base configuration
- `tsconfig.app.json` - App-specific settings
- `tsconfig.node.json` - Node environment settings

## 🐛 Troubleshooting

### Common Issues

1. **"Database connection failed"**
   - Verify your `.env` file has correct Supabase credentials
   - Check that your Supabase project is active
   - Ensure RLS policies allow access

2. **"Login redirects immediately after successful authentication"**
   - This was a known issue and has been fixed
   - The fix prevents redirect loops by using a ref to track redirect state
   - Update to the latest version if you encounter this

3. **"Registration form resets when clicking next"**
   - This was a known issue and has been fixed
   - The fix prevents unnecessary re-renders in useEffect dependencies
   - Form data now persists correctly across steps

4. **"Admin panel shows only 1000 users"**
   - This was a known issue and has been fixed
   - The fix implements pagination to fetch all records
   - Statistics now accurately reflect all users

5. **"Password reset requires Personal ID"**
   - This was updated to use email-only flow
   - Users now only need their registered email to reset password
   - Simplified and more standard user experience

### Performance Tips

1. **Large Datasets**
   - The system now handles large datasets efficiently with pagination
   - Admin statistics automatically paginate through all records
   - Database indexes optimize query performance

2. **Mobile Performance**
   - Reduce animation complexity on low-end devices
   - Use smaller images when possible
   - Clear browser cache if experiencing slowness

3. **QR Scanning**
   - Ensure good lighting conditions
   - Hold QR code steady
   - Clean camera lens if having trouble scanning

## 🔐 Security Best Practices

1. **Never commit `.env` files**
   - Use `.env.example` as a template
   - Keep credentials secure

2. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Policies restrict access by role
   - Users can only access their own data

3. **Input Validation**
   - All user inputs are validated
   - SQL injection prevention via prepared statements
   - XSS protection through React's built-in escaping

4. **File Uploads**
   - File type validation
   - Size limits enforced
   - Scanned for malware (configure in Supabase)

## 📊 Database Schema

### Key Tables

**users_profiles**
- Stores user information and roles
- Linked to Supabase Auth
- Tracks profile completion status
- Manages entry/exit states

**attendances**
- Records all check-in/check-out events
- Links to users and sessions
- Tracks scan type (entry, exit, booking, etc.)
- Includes timestamp and location

**sessions**
- Event sessions and workshops
- Manages capacity and bookings
- Tracks session type and schedule

**user_scores**
- Points and rewards tracking
- Activity logging
- Leaderboard source data

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

[Your License Here]

## 👥 Support

For issues or questions:
- Check the troubleshooting section
- Review the database schema documentation
- Contact the development team

## 🎯 Roadmap

- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integration with external ticketing systems
- [ ] Multi-language support
- [ ] Offline mode for QR scanning

## ⚡ Recent Improvements

### Performance Optimizations
- ✅ Fixed infinite render loops in registration form
- ✅ Optimized AuthContext to reduce re-renders
- ✅ Added database indexes for faster queries
- ✅ Implemented pagination for large datasets
- ✅ Fixed admin panel to display all records (previously limited to 1000)

### Bug Fixes
- ✅ Fixed login redirect loop issue
- ✅ Fixed registration form state reset on navigation
- ✅ Simplified password reset to email-only flow
- ✅ Fixed build warnings in CSS imports

### User Experience
- ✅ Improved form validation and error messages
- ✅ Added loading states throughout the application
- ✅ Enhanced mobile responsiveness
- ✅ Better error handling and user feedback

---

Built with ❤️ for Ain Shams University Career Week
