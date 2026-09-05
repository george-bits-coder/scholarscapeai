# Server Folder Structure & Documentation

This folder contains the backend API server for the ResearchCollab application. The server is built with Express.js and uses Firebase for real-time database and authentication.

## 📁 Folder Structure

```
server/
├── auth.ts                 # Authentication setup with Passport.js
├── database.ts             # Drizzle ORM database initialization
├── emailService.ts         # Email service for sending notifications (Resend)
├── env.ts                  # Environment variable configuration loader
├── firebase.ts             # Firebase initialization and database operations
├── firebaseStorage.ts      # Firebase storage interface and implementations
├── index.ts                # Main server entry point
├── index-cf.ts             # Cloud Functions entry point
├── matching-service.ts     # AI-powered matching service (OpenAI embeddings)
├── password.ts             # Password hashing and comparison utilities
├── routes.ts               # API routes registration and handlers
├── storage.ts              # Storage interface definitions
├── vite.ts                 # Vite dev server setup and static file serving
├── firebase.test.ts        # Unit tests for Firebase utilities
├── package.json            # NPM dependencies
├── .env                    # Local environment variables (git ignored)
└── vite.ts                 # Vite configuration integration

```

## 📋 File Descriptions

### Core Server Files

#### `index.ts`
Main entry point for the Express server. Sets up:
- CORS middleware for cross-origin requests
- JSON/URL-encoded body parsing
- Request logging middleware
- Route registration
- Error handling
- Vite setup for development / static serving for production
- Server listener on specified port (default 8080)

#### `routes.ts`
Registers all API endpoints including:
- Authentication routes (register, login, logout)
- Project management (CRUD operations)
- Opportunity matching and management
- Application handling
- Live events and registrations
- Messaging system
- User profiles and interests
- Notifications

### Authentication & Security

#### `auth.ts`
Sets up Passport.js authentication with:
- Local strategy for username/password authentication
- Session management with Express sessions
- User serialization/deserialization
- Registration endpoint with password hashing
- Login endpoint with credential validation
- Cookie-based session handling

#### `password.ts`
Provides cryptographic password utilities:
- `hashPassword()` - Hashes password using scrypt with salt
- `comparePasswords()` - Compares supplied password against stored hash using timing-safe comparison

### Database & Storage

#### `database.ts`
Initializes Drizzle ORM with:
- Neon HTTP serverless database connection
- Schema validation
- Database instance export for use throughout the application

#### `firebase.ts`
Firebase Realtime Database operations:
- Firebase Admin SDK initialization
- `createFirebaseId()` - Generates UUIDs for records
- `FirebaseSessionStore` - Custom session store implementation for Express
- `getValue()` - Fetch single value from database
- `setValue()` - Create/update values in database
- `updateValue()` - Partial updates to existing values
- `removeValue()` - Delete values from database
- `listValues()` - Fetch all values at a path
- `queryValuesByChild()` - Query records by child property

#### `firebaseStorage.ts`
High-level storage implementation:
- `IStorage` interface - Defines all storage operations
- `FirebaseStorage` class - Implements storage operations using Firebase
- Methods for managing users, projects, opportunities, applications, messages, grants, notifications, etc.
- `LiveEvent` interface and operations for event management
- `Activity` interface for user activity tracking

#### `storage.ts`
Storage interface definitions:
- `IStorage` interface - Defines contract for storage implementations
- Data type interfaces (User, Project, Opportunity, Application, etc.)
- Activity and LiveEvent interfaces

### Services

#### `emailService.ts`
Email notification service using Resend:
- `EmailService` class for sending emails
- `sendEmail()` - Sends email to recipient and admin copy
- `createProjectShareEmail()` - Templates for project sharing notifications
- Includes both text and HTML email templates
- Admin notification forwarding for activity monitoring

#### `matching-service.ts`
AI-powered user-project matching using OpenAI:
- `MatchingService` class for intelligent matching
- `generateUserEmbedding()` - Creates embeddings for user profiles
- `generateProjectEmbedding()` - Creates embeddings for projects
- `calculateCosineSimilarity()` - Calculates similarity between embeddings
- Profile text generation for embedding creation

### Utilities

#### `env.ts`
Environment configuration loader:
- Loads .env files from root and server directories
- Validates required Firebase environment variables
- Logs warnings for missing configuration

#### `vite.ts`
Vite integration and static file serving:
- `setupVite()` - Configures Vite middleware for development
- `serveStatic()` - Serves pre-built static files for production
- `log()` - Formatted logging with timestamps
- Hot module replacement (HMR) for development
- Landing page and index HTML serving

### Testing & Cloud Functions

#### `firebase.test.ts`
Unit tests for Firebase utilities:
- Tests for `queryValuesByChild()` function
- Validates exact child property matching

#### `index-cf.ts`
Firebase Cloud Functions entry point:
- Wraps Express app for deployment to Cloud Functions
- Handles HTTP requests routed to Cloud Functions
- Implements CORS headers

## 🔑 Key Dependencies

- **express** - Web framework
- **passport** - Authentication middleware
- **express-session** - Session management
- **firebase-admin** - Firebase SDK
- **drizzle-orm** - ORM for database
- **openai** - AI embeddings and matching
- **resend** - Email service
- **vite** - Development server and build tool

## 🚀 Environment Variables Required

```
FIREBASE_PROJECT_ID         # Firebase project ID
FIREBASE_CLIENT_EMAIL       # Firebase service account email
FIREBASE_PRIVATE_KEY        # Firebase private key
FIREBASE_DATABASE_URL       # Firebase Realtime Database URL
DATABASE_URL               # Neon PostgreSQL connection string
OPENAI_API_KEY             # OpenAI API key (optional, for matching)
RESEND_API_KEY             # Resend API key (required for email)
RESEND_FROM_EMAIL          # Verified Resend sender, e.g. onboarding@resend.dev
EMAIL_ADMIN                # Optional admin copy recipient
SESSION_SECRET             # Session encryption secret
PORT                       # Server port (default: 8080)
```

## 📝 Notes

- The server can run in both development mode (with Vite) and production mode (serving static files)
- Firebase is used for real-time features and session storage
- PostgreSQL (via Neon) is used for relational data
- All sensitive data should be stored in environment variables
- The application supports both traditional Express deployment and Firebase Cloud Functions deployment
