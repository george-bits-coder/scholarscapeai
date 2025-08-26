# Research Collaboration Platform

## Overview

This is a full-stack web application built as a research collaboration platform called "ResearchCollab". The platform connects verified researchers worldwide, enabling them to find collaborators, manage projects, communicate, and discover grant opportunities. The application features a modern React frontend with a Node.js/Express backend, using PostgreSQL as the database with Drizzle ORM for data management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Custom auth context with session-based authentication

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy using session-based auth
- **Session Storage**: In-memory storage with express-session
- **Password Security**: Scrypt for password hashing with salt
- **API Design**: RESTful endpoints with JSON responses
- **Error Handling**: Centralized error handling middleware

### Database Layer
- **Database**: PostgreSQL (configured via DATABASE_URL)
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`
- **Connection**: Neon serverless PostgreSQL adapter

### Data Models
The application includes comprehensive data models for:
- **Users**: Researchers with profiles, skills, publications, and verification status
- **Projects**: Research projects with required skills, compensation, and status tracking
- **Applications**: Project applications with cover letters and match scoring
- **Messages**: Communication system between users
- **Grants**: Grant opportunities with region and tag filtering
- **Notifications**: User notification system

### Development Environment
- **Monorepo Structure**: Client and server code in same repository
- **Hot Reload**: Vite middleware integrated with Express for development
- **TypeScript**: Strict type checking across frontend and backend
- **Path Aliases**: Configured for clean imports (@/ for client, @shared for shared code)

### Security Features
- **Password Hashing**: Secure password storage using scrypt
- **Session Management**: Express sessions with configurable store
- **Protected Routes**: Authentication wrapper for sensitive pages
- **CORS**: Credential-based requests for authentication

### UI/UX Design
- **Design System**: shadcn/ui "new-york" style with neutral color scheme
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Accessibility**: Radix UI primitives ensure accessibility compliance
- **Dark Mode**: CSS variable-based theming system ready for dark mode

### Build and Deployment
- **Build Process**: Vite for frontend, esbuild for backend bundling
- **Output**: Static assets served from Express in production
- **Environment**: Development and production configurations
- **Asset Management**: Attached assets directory for file storage

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18+ with React DOM, React Hook Form, TanStack Query
- **Backend Framework**: Express.js with TypeScript support
- **Build Tools**: Vite, esbuild, TypeScript compiler

### Database and ORM
- **Database**: PostgreSQL via Neon serverless adapter
- **ORM**: Drizzle ORM with Drizzle Kit for schema management
- **Validation**: Zod for runtime type validation and schema generation

### UI Components and Styling
- **Component Library**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with PostCSS and Autoprefixer
- **Icons**: Lucide React for consistent iconography
- **Utilities**: clsx and tailwind-merge for conditional styling

### Authentication and Security
- **Authentication**: Passport.js with local strategy
- **Session Management**: express-session with connect-pg-simple store
- **Password Hashing**: Node.js crypto module with scrypt

### Development Tools
- **Type Safety**: TypeScript with strict configuration
- **Routing**: Wouter for lightweight client-side routing
- **Form Validation**: React Hook Form with Zod resolvers
- **Development**: Replit-specific plugins for enhanced development experience

### Additional Libraries
- **Date Handling**: date-fns for date manipulation
- **Class Utilities**: class-variance-authority for component variants
- **Command Interface**: cmdk for command palette functionality
- **Carousel**: Embla Carousel React for image/content carousels