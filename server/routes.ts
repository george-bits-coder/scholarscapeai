/**
 * API Routes Module
 * 
 * Registers all API endpoints for the ResearchCollab application.
 * Handles requests for projects, opportunities, applications, messages, and user management.
 * All authenticated endpoints check user session and return 401 if not authenticated.
 * 
 * Main Function:
 * - registerRoutes(app): Registers all API endpoints
 * 
 * Route Groups:
 * 
 * Authentication Routes (handled by auth.ts via setupAuth):
 * - POST /api/register: Create new user account
 * - POST /api/login: Authenticate user
 * - GET /api/logout: Destroy session
 * - GET /api/me: Get current user profile
 * 
 * Project Routes:
 * - GET /api/projects: List projects (with optional filters)
 * - GET /api/projects/:id: Get project details and applications
 * - POST /api/projects: Create new project (faculty only)
 * - PUT /api/projects/:id: Update project
 * - DELETE /api/projects/:id: Delete project
 * - GET /api/projects/:id/applications: Get project applications
 * 
 * Opportunity Routes:
 * - GET /api/opportunities: List opportunities for matching
 * - GET /api/opportunities/:id: Get opportunity details
 * - POST /api/opportunities: Create opportunity
 * - PUT /api/opportunities/:id: Update opportunity
 * - DELETE /api/opportunities/:id: Delete opportunity
 * 
 * Application Routes:
 * - POST /api/applications: Submit application to project
 * - GET /api/applications/:id: Get application details
 * - PUT /api/applications/:id: Update application status
 * - DELETE /api/applications/:id: Withdraw application
 * 
 * Message Routes:
 * - POST /api/messages: Send message
 * - GET /api/messages/:conversationId: Get messages in conversation
 * - DELETE /api/messages/:id: Delete message
 * 
 * User Routes:
 * - GET /api/users/:id: Get user profile
 * - PUT /api/users/:id: Update user profile
 * - GET /api/users/:id/interests: Get user interests
 * - PUT /api/users/:id/interests: Update user interests
 * 
 * Live Event Routes:
 * - GET /api/events: List live events
 * - POST /api/events: Create event
 * - GET /api/events/:id: Get event details
 * - POST /api/events/:id/register: Register for event
 * - GET /api/events/:id/registrations: Get event registrations
 * 
 * Notification Routes:
 * - GET /api/notifications: Get user notifications
 * - PUT /api/notifications/:id: Mark notification as read
 * 
 * Matching Routes:
 * - POST /api/match: Get AI-powered matches for user
 * - GET /api/matches: List user's matches
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { matchingService } from "./matching-service";
import { insertProjectSchema, insertOpportunitySchema, insertApplicationSchema, insertMessageSchema, type User, type UserInterests } from "@shared/schema";
import { getValue, queryValuesByChild } from "./firebase";
import { emailService } from "./emailService";
import { fortaledetails } from "./decision.ts";

// Helper to extract user's name (schema uses 'name', not 'fullName')
function getDisplayName(user: { name?: string; username?: string } | null | undefined) {
  return user?.name || user?.username || "Someone";
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Projects routes
  app.get("/api/projects", async (req, res) => {
    try {
      const { status, owner } = req.query;
      const projects = await storage.getProjects({
        status: status as string,
        ownerId: owner as string,
      });
      
      // Get project owners for each project
      const projectsWithOwners = await Promise.all(
        projects.map(async (project) => {
          const owner = await storage.getUser(project.ownerId);
          return { ...project, owner };
        })
      );
      
      res.json(projectsWithOwners);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const owner = await storage.getUser(project.ownerId);

      // Only include applications when the requester is the project owner
      let applications;
      try {
        if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.id === project.ownerId) {
          applications = await storage.getApplicationsForProject(project.id);
        }
      } catch (err: any) {
        // ignore and don't include applications
        applications = undefined;
      }

      const response: any = { ...project, owner };
      if (applications) response.applications = applications;

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Get applications for a specific project (owners only)
  app.get('/api/projects/:id/applications', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      if (project.ownerId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });
      const applications = await storage.getApplicationsForProject(req.params.id);
      res.json(applications);
    } catch (error: any) {
      console.error('Error fetching project applications:', error);
      res.status(500).json({ error: 'Failed to fetch project applications' });
    }
  });

  app.post("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (String(req.user!.role || '').toLowerCase() === 'student') {
      return res.status(403).json({ error: "Students are not allowed to create projects" });
    }

    try {
      const { flyerUrl, ...projectBody } = req.body || {};
      const parsedProject = insertProjectSchema.parse({
        ...projectBody,
        ownerId: req.user!.id,
      });

      const projectData = {
        ...parsedProject,
        flyerUrl: typeof flyerUrl === "string" && flyerUrl.trim() ? flyerUrl.trim() : null,
      };

      const discussion = [
        `We are planning a research project with title: ${projectData.title}`,
        `Description: ${projectData.description}`,
        `Required skills: ${JSON.stringify(projectData.requiredSkills ?? [])}`,
        `Compensation: ${projectData.compensation ?? "Not specified"}`,
        `Timeline: ${projectData.timeline ?? "Not specified"}`,
      ].join("\n");
      const resultcheck = await fortaledetails(discussion);
      console.log("AI decision response:", JSON.stringify(resultcheck, null, 2));
      if (resultcheck.validProject !== "yes") {
        return res.status(400).json({ error: "Project didn't pass AI validation" });
      }
      const project = await storage.createProject(projectData as any);
      try {
        await storage.createActivity({
          message: `Created project "${project.title}"`,
          actorId: req.user!.id,
        });
      } catch (activityError: any) {
        console.error("Failed to save project activity:", activityError);
      }
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(400).json({ error: error?.message || "Invalid project data" });
    }
  });

  // ✅ UPDATED: Block students and accept posterUrl
  app.post("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // ✅ Block students from creating events
    if (String(req.user!.role || '').toLowerCase() === 'student') {
      return res.status(403).json({ error: "Students are not allowed to create live events" });
    }

    // ✅ Accept posterUrl from the request body
    const { title, description, date, time, platform, link, posterUrl } = req.body;
    if (!title || !date || !time || !platform || !link) {
      return res.status(400).json({ error: "Missing required event fields" });
    }

    try {
      // ✅ Pass posterUrl to storage
      const event = await storage.createLiveEvent({
        title,
        description: description || '',
        date,
        time,
        platform,
        link,
        posterUrl: posterUrl || null, // ✅ Store the image URL in DB
        ownerId: req.user!.id,
      });
      
      const eventWithShareUrl = await storage.updateLiveEvent(event.id, {
        shareUrl: `/events/${event.id}`,
      } as any);
      
      try {
        await storage.createActivity({
          message: `Scheduled live event "${eventWithShareUrl.title}"`,
          actorId: req.user!.id,
        });
      } catch (activityError: any) {
        console.error("Failed to save event activity:", activityError);
      }
      res.status(201).json(eventWithShareUrl);
    } catch (error: any) {
      console.error("Error creating live event:", error);
      res.status(500).json({ error: "Unable to create live event" });
    }
  });

  // ✅ UPDATED: Researchers listing with search and filters (Includes Students)
  app.get('/api/researchers', async (req, res) => {
    try {
      const q = (req.query.q || '').toString().trim().toLowerCase();
      const roleParam = req.query.role ? String(req.query.role).toLowerCase() : '';
      const fieldParam = req.query.field ? String(req.query.field).toLowerCase() : '';

      let users: any[] = [];
      
      if (roleParam) {
        users = await storage.getUsersByRole(roleParam);
      } else {
        // If no specific role filter, get professors, researchers, AND students
        const researchers = await storage.getUsersByRole('researcher');
        const professors = await storage.getUsersByRole('professor');
        const students = await storage.getUsersByRole('student');
        users = [...(researchers || []), ...(professors || []), ...(students || [])];
      }

      if (q) {
        users = users.filter((u: User) => {
          const name = (u.fullName || u.name || u.username || '').toString().toLowerCase();
          const affiliation = (u.affiliation || u.organization || '').toString().toLowerCase();
          const field = (u.field || '').toString().toLowerCase();
          return name.includes(q) || affiliation.includes(q) || field.includes(q);
        });
      }

      if (fieldParam) {
        users = users.filter((u: User) => ((u.field || '').toString().toLowerCase().includes(fieldParam)));
      }

      const uniqueUsers = Array.from(new Map(users.map((user: User) => [user.id, user])).values());

      // Remove passwords from the response
      const publicUsers = uniqueUsers.map((user: User) => {
        const { password, ...publicUser } = user;
        return {
          ...publicUser,
          fullName: user.fullName || user.name || user.username || 'Unnamed user',
          name: user.name || user.fullName || user.username || 'Unnamed user',
          role: String(user.role || '').trim(),
        };
      });

      res.json(publicUsers);
    } catch (error: any) {
      console.error('Error fetching researchers:', error);
      res.status(500).json({ error: 'Failed to fetch researchers' });
    }
  });

  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getLiveEvents();
      const eventsWithOwners = await Promise.all(
        events.map(async (event) => {
          const owner = await storage.getUser(event.ownerId);
          const registrations = await storage.getLiveEventRegistrations(event.id);
          return { ...event, owner, attendeeCount: registrations.length, shareUrl: event.shareUrl || `/events/${event.id}` };
        }),
      );
      res.json(eventsWithOwners);
    } catch (error: any) {
      console.error("Error fetching live events:", error);
      res.status(500).json({ error: "Unable to load live events" });
    }
  });

  app.get("/api/events/:id/public", async (req, res) => {
    try {
      const event = await storage.getLiveEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found" });

      const owner = await storage.getUser(event.ownerId);
      const registrations = await storage.getLiveEventRegistrations(event.id);
      res.json({
        ...event,
        posterUrl: event.posterUrl || null, // ✅ Ensure this is returned
        owner,
        attendeeCount: registrations.length,
        shareUrl: event.shareUrl || `/events/${event.id}`,
      });
    } catch (error: any) {
      console.error("Error fetching public event details:", error);
      res.status(500).json({ error: "Unable to load event details" });
    }
  });

  app.post("/api/events/:id/register", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const event = await storage.getLiveEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found" });

      const registration = await storage.registerForLiveEvent(event.id, req.user!.id);
      res.json({
        ...event,
        attendeeCount: registration.attendeeCount,
        registered: registration.registered,
        shareUrl: event.shareUrl || `/events/${event.id}`,
      });
    } catch (error: any) {
      console.error("Error registering for event:", error);
      res.status(500).json({ error: "Unable to register for event" });
    }
  });

  app.put("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const event = await storage.getLiveEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found" });

      if (event.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to edit this event" });
      }

      const updates = req.body;
      const updated = await storage.updateLiveEvent(req.params.id, updates as any);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const event = await storage.getLiveEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found" });

      if (event.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to delete this event" });
      }

      await storage.deleteLiveEvent(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting event:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

  app.get("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const requestedLimit = Number.parseInt(String(req.query.limit || '10'), 10);
      const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 10;
      const activities = await storage.getRecentActivities(limit, req.user!.id);
      res.json(activities);
    } catch (error: any) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ error: "Unable to load recent activities" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Activity message is required" });
    }

    try {
      const activity = await storage.createActivity({
        message,
        actorId: req.user!.id,
      });
      res.status(201).json(activity);
    } catch (error: any) {
      console.error("Error creating activity:", error);
      res.status(500).json({ error: "Unable to create activity" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to edit this project" });
      }

      const { flyerUrl, ...projectUpdates } = req.body || {};
      const updates = {
        ...projectUpdates,
        ...(typeof flyerUrl === "string" ? { flyerUrl: flyerUrl.trim() || null } : {}),
      };

      const updatedProject = await storage.updateProject(req.params.id, updates as any);
      res.json(updatedProject);
    } catch (error: any) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to delete this project" });
      }

      // Check if project has applications
      const applications = await storage.getApplications({ projectId: req.params.id });
      if (applications.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete project with existing applications",
          hasApplications: true,
          applicationCount: applications.length
        });
      }

      await storage.deleteProject(req.params.id);
      res.json({ success: true, message: "Project deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Opportunities routes
  app.get("/api/opportunities", async (req, res) => {
    try {
      const { studentId, status } = req.query;
      const opportunities = await storage.getOpportunities({
        studentId: studentId as string,
        status: status as string,
      });
      
      // Add student information to each opportunity
      const opportunitiesWithStudents = await Promise.all(
        opportunities.map(async (opportunity) => {
          const student = await storage.getUser(opportunity.studentId);
          return { ...opportunity, student };
        })
      );
      
      res.json(opportunitiesWithStudents);
    } catch (error: any) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });

  app.get("/api/opportunities/:id", async (req, res) => {
    try {
      const opportunity = await storage.getOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      const student = await storage.getUser(opportunity.studentId);
      res.json({ ...opportunity, student });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch opportunity" });
    }
  });

  app.post("/api/opportunities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const opportunityData = {
        ...req.body,
        studentId: req.user!.id,
      };
      
      const opportunity = await storage.createOpportunity(opportunityData);
      res.status(201).json(opportunity);
    } catch (error: any) {
      res.status(400).json({ error: "Invalid opportunity data" });
    }
  });

  app.put("/api/opportunities/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const opportunity = await storage.getOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      if (opportunity.studentId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to edit this opportunity" });
      }

      const updatedOpportunity = await storage.updateOpportunity(req.params.id, req.body);
      res.json(updatedOpportunity);
    } catch (error: any) {
      console.error("Error updating opportunity:", error);
      res.status(500).json({ error: "Failed to update opportunity" });
    }
  });

  app.delete("/api/opportunities/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const opportunity = await storage.getOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      if (opportunity.studentId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to delete this opportunity" });
      }

      await storage.deleteOpportunity(req.params.id);
      res.json({ success: true, message: "Opportunity deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting opportunity:", error);
      res.status(500).json({ error: "Failed to delete opportunity" });
    }
  });

  // Applications routes
  app.get("/api/applications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { projectId, type } = req.query;
      let applications;
      
      if (type === "received") {
        // Get applications TO projects owned by the current user
        applications = await storage.getApplicationsForProjectOwner(req.user!.id);
      } else if (projectId) {
        // Get applications for a specific project
        applications = await storage.getApplicationsForProject(projectId as string);
      } else {
        // Default: Get applications made BY the current user
        applications = await storage.getApplicationsForUser(req.user!.id);
      }
      
      res.json(applications);
    } catch (error: any) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.post("/api/applications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    console.log("Received application request:", req.body, "from user:", req.user);

    try {
      // Extract projectId correctly - handle multiple possible formats
      let projectId = req.body.projectId;
      
      // If the entire body is a string (projectId sent directly)
      if (typeof req.body === 'string') {
        projectId = req.body;
      } 
      // If projectId is an object with a projectId property (nested)
      else if (typeof req.body.projectId === 'object' && req.body.projectId?.projectId) {
        projectId = req.body.projectId.projectId;
      }
      // If projectId is a string
      else if (typeof req.body.projectId === 'string') {
        projectId = req.body.projectId;
      }

      console.log("Parsed projectId:", projectId);

      // Validate that we have a projectId
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      // Verify the project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        console.log("Project not found for ID:", projectId);
        return res.status(404).json({ error: "Project not found" });
      }
      console.log("Project found:", project);

      // Get the user ID from the authenticated user
      const userId = req.user!.id;
      
      if (!userId) {
        console.error("No user ID found in req.user:", req.user);
        return res.status(400).json({ error: "User identification failed" });
      }
      
      console.log("User ID from authenticated user:", userId);

      // Check if user is the project owner (can't apply to own project)
      if (project.ownerId === userId) {
        return res.status(400).json({ error: "You cannot apply to your own project" });
      }

      // Check if user has already applied to this project
      try {
        const existingApplications = await storage.getApplications({
          projectId: projectId,
          userId: userId
        });
        
        if (existingApplications && existingApplications.length > 0) {
          return res.status(400).json({ error: "You have already applied to this project" });
        }
        console.log("Existing applications for user:", existingApplications);
      } catch (error: any) {
        console.log("Could not check existing applications, continuing:", error.message);
      }

      let coverLetter = '';
      if (typeof req.body === 'string') {
        coverLetter = ''; // No cover letter when only ID is sent
      } else if (req.body.coverLetter && typeof req.body.coverLetter === 'object' && req.body.coverLetter.coverLetter) {
        coverLetter = req.body.coverLetter.coverLetter;
      } else if (typeof req.body.coverLetter === 'string') {
        coverLetter = req.body.coverLetter;
      } else if (typeof req.body.message === 'string') {
        coverLetter = req.body.message;
      }
      
      // Construct the application data with userId from authenticated user
      const applicationData = {
        projectId: projectId,
        userId: userId,
        coverLetter: coverLetter.trim(), // Ensure it's trimmed
        status: 'submitted'
      };

      console.log("Application data to be validated and created:", applicationData);

      // Validate with Zod schema
      const validatedData = insertApplicationSchema.parse(applicationData);
      
      // Create the application
      const application = await storage.createApplication(validatedData);
      console.log("Application created successfully:", application);
      
      // Create notification for project owner
      try {
        await storage.createNotification({
          userId: project.ownerId,
          type: "application",
          title: "New Project Application",
          content: `${req.user!.name || req.user!.username || 'Someone'} applied to your project: ${project.title}`,
          payload: { 
            applicationId: application.id, 
            projectId: project.id,
            applicantId: userId
          },
        });
      } catch (notificationError: any) {
        console.error("Failed to create notification:", notificationError);
        // Don't fail the request if notification fails
      }

      // Send email notification to project owner
      try {
        const projectOwner = await storage.getUser(project.ownerId);
        if (projectOwner?.email) {
          const loginUrl = process.env.REPLIT_DOMAINS 
            ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
            : 'http://localhost:5000';
          
          console.log(`New application email would be sent to ${projectOwner.email}`);
          // Uncomment if you have email service set up
          // const emailTemplate = emailService.createNewApplicationEmail(
          //   projectOwner.email,
          //   projectOwner.name || 'User',
          //   project.title,
          //   req.user!.name || 'Applicant',
          //   loginUrl
          // );
          // await emailService.sendEmail(emailTemplate);
        }
      } catch (emailError: any) {
        console.error('Failed to send new application email:', emailError);
        // Don't fail the request if email fails
      }

      // Create activity log
      try {
        await storage.createActivity({
          message: `${req.user!.name || req.user!.username || 'Someone'} applied to project "${project.title}"`,
          actorId: userId,
        });
      } catch (activityError: any) {
        console.error("Failed to save project activity:", activityError);
        // Don't fail the request if activity logging fails
      }

      res.status(201).json(application);
    } catch (error: any) {
      console.error('Failed to create application:', error);
      
      // Handle Zod validation errors specifically
      if (error.issues) {
        console.error('Zod Validation Issues:', error.issues);
        return res.status(400).json({ 
          error: "Invalid application data",
          details: error.issues 
        });
      }
      
      // Handle other errors
      res.status(500).json({ error: "Failed to create application" });
    }
  });

  // Update application status
  app.put("/api/applications/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { status, reviewNotes } = req.body;
      
      // Validate status
      if (!['submitted', 'under_review', 'approved', 'rejected', 'ignored'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Check if user owns the project this application belongs to
      const project = await storage.getProject(application.projectId);
      if (!project || project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to update this application" });
      }

      // If application is approved, create or get project chat and add the applicant
      if (status === 'approved') {
        // Wrap chat creation in try/catch so it doesn't throw a 500 error if it fails
        try {
          let chat = await storage.getProjectChat(project.id);
          if (!chat) {
            chat = await storage.createProjectChat(project.id, project.ownerId);
          }
          // Add the approved applicant to the chat
          await storage.addChatMember(chat.id, application.userId, "member");
        } catch (chatError: any) {
          console.error("Failed to create chat for approved applicant, but application is still approved:", chatError);
          // We intentionally DO NOT return an error here. The application is approved successfully.
        }
      }
      
      const updatedApplication = await storage.updateApplicationStatus(req.params.id, status, reviewNotes);
      
      // Create notification and send email for applicant
      await storage.createNotification({
        userId: application.userId,
        type: "application",
        title: "Application Status Update",
        content: `Your application for "${project.title}" has been ${status.replace('_', ' ')}`,
        payload: { applicationId: application.id, projectId: project.id },
      });

      // Send email notification to applicant (if enabled)
      try {
        const applicant = await storage.getUser(application.userId);
        if (applicant?.email) {
          const loginUrl = process.env.REPLIT_DOMAINS 
            ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
            : 'http://localhost:5000';
          
          const emailTemplate = emailService.createApplicationStatusEmail(
            applicant.email,
            applicant.name,
            project.title,
            status,
            reviewNotes,
            loginUrl
          );
          await emailService.sendEmail(emailTemplate);
          console.log(`Email sent to ${applicant.email} for application status: ${status}`);
        }
      } catch (emailError: any) {
        console.error('Failed to send application status email:', emailError);
        // Don't fail the whole request if email fails
      }
      
      res.json(updatedApplication);
    } catch (error: any) {
      console.error('Error updating application status:', error);
      res.status(500).json({ error: "Failed to update application status" });
    }
  });

  app.put("/api/applications/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Check if user owns the project this application belongs to
      const project = await storage.getProject(application.projectId);
      if (!project || project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to update this application" });
      }

      const updatedApplication = await storage.updateApplication(req.params.id, req.body);
      
      res.json(updatedApplication);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update application" });
    }
  });

  // Application comments routes
  app.get("/api/applications/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Check if user is involved (applicant or project owner)
      const project = await storage.getProject(application.projectId);
      if (!project || (project.ownerId !== req.user!.id && application.userId !== req.user!.id)) {
        return res.status(403).json({ error: "Not authorized to view these comments" });
      }

      const comments = await storage.getApplicationComments(req.params.id);
      res.json(comments);
    } catch (error: any) {
      console.error('Error fetching application comments:', error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/applications/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { content, isInternal } = req.body;
      
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Check if user is involved (applicant or project owner)
      const project = await storage.getProject(application.projectId);
      if (!project || (project.ownerId !== req.user!.id && application.userId !== req.user!.id)) {
        return res.status(403).json({ error: "Not authorized to comment on this application" });
      }

      // Only project owners can create internal comments
      const finalIsInternal = isInternal && project.ownerId === req.user!.id;

      const comment = await storage.createApplicationComment({
        applicationId: req.params.id,
        userId: req.user!.id,
        content,
        isInternal: finalIsInternal,
      });

      // Create notification for the other party (if not internal)
      if (!finalIsInternal) {
        const recipientId = project.ownerId === req.user!.id ? application.userId : project.ownerId;
        await storage.createNotification({
          userId: recipientId,
          type: "application",
          title: "New Application Comment",
          content: `${getDisplayName(req.user!)} commented on an application for "${project.title}"`,
          payload: { applicationId: application.id, projectId: project.id },
        });
      }

      res.status(201).json(comment);
    } catch (error: any) {
      console.error('Error creating application comment:', error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Messages routes
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { projectId } = req.query;
      const currentUserId = req.user!.id;
      let messages = await storage.getMessages({});
      messages = messages.filter(
        (message) => message.senderId === currentUserId || message.receiverId === currentUserId,
      );
      if (projectId) {
        messages = messages.filter((message) => message.projectId === (projectId as string));
      }

      const messagesWithParticipants = await Promise.all(
        messages.map(async (message) => {
          const sender = await storage.getUser(message.senderId);
          const receiver = await storage.getUser(message.receiverId);
          return { ...message, sender, receiver };
        })
      );

      res.json(messagesWithParticipants);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user!.id,
      });
      
      const message = await storage.createMessage(messageData);
      
      // Create notification for receiver
      await storage.createNotification({
        userId: message.receiverId,
        type: "message",
        title: "New Message",
        content: `${getDisplayName(req.user!)} sent you a message`,
        payload: { messageId: message.id, senderId: req.user!.id },
      });
      
      res.status(201).json(message);
    } catch (error: any) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // ✅ MARK MESSAGES AS READ
  app.put("/api/messages/read/:otherUserId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const currentUserId = req.user!.id;
      const otherUserId = req.params.otherUserId;
      // Update all messages from otherUserId to currentUserId to 'read'
      await storage.markMessagesAsRead(currentUserId, otherUserId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // ✅ FETCH UNREAD MESSAGE COUNT
  app.get("/api/messages/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const count = await storage.getUnreadMessageCount(req.user!.id);
      res.json({ count });
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // Conversation thread between current user and another user
  app.get('/api/messages/thread/:otherId', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      const otherId = req.params.otherId;
      const allMessages = await storage.getMessages({});
      const thread = allMessages.filter((m) =>
        (m.senderId === req.user!.id && m.receiverId === otherId) ||
        (m.senderId === otherId && m.receiverId === req.user!.id)
      );

      const threadWithSenders = await Promise.all(
        thread.map(async (message) => {
          const sender = await storage.getUser(message.senderId);
          return { ...message, sender };
        })
      );

      // sort by createdAt ascending
      threadWithSenders.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
      res.json(threadWithSenders);
    } catch (error: any) {
      console.error('Error fetching conversation thread:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

  // Grants routes
  app.get("/api/grants", async (req, res) => {
    try {
      const { region, tags } = req.query;
      const grants = await storage.getGrants({
        region: region as string,
        tags: tags ? (tags as string).split(",") : undefined,
      });
      
      res.json(grants);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch grants" });
    }
  });

  // Notifications routes
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const notifications = await storage.getNotifications(req.user!.id);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Researchers routes (Duplicate Removed - single definition above)

  app.get("/api/researchers/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "Researcher not found" });
      }
      
      const { password, ...publicUser } = user;
      res.json(publicUser);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch researcher" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    const requestedId = req.params.id;
    try {
      let user = await getValue<User>(`users/${requestedId}`);
      if (!user) {
        const users = await queryValuesByChild<User>("users", "username", requestedId);
        user = users[0];
      }
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let interests: UserInterests | {} = {};
      try {
        const fetchedInterests = await queryValuesByChild<UserInterests>("userInterests", "userId", user.id);
        interests = fetchedInterests[0] || {};
      } catch (error: any) {
        console.error(`Error fetching interests for user ${user.id}:`, error);
      }

      const { password, ...publicUser } = user;
      res.json({
        ...publicUser,
        interests,
      });
    } catch (error: any) {
      console.error(`Error fetching user profile for ${requestedId}:`, error);
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      res.status(500).json({ error: message, stack });
    }
  });

  app.get("/api/users/:id/projects", async (req, res) => {
    const requestedId = req.params.id;
    try {
      let user = await storage.getUser(requestedId);
      if (!user) {
        user = await storage.getUserByUsername(requestedId);
      }
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const projects = await storage.getProjects({ ownerId: user.id });
      res.json(projects);
    } catch (error: any) {
      console.error(`Error fetching projects for user ${requestedId}:`, error);
      res.status(500).json({ error: "Failed to fetch user projects" });
    }
  });

  app.get("/api/connections/status/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      const otherUserId = req.params.userId;
      const currentUserId = req.user!.id;
      if (otherUserId === currentUserId) {
        return res.json({ status: 'self' });
      }
      const connections = await storage.getAllConnectionsForUser(currentUserId);
      const existing = connections.find((connection: any) =>
        (connection.fromUserId === currentUserId && connection.toUserId === otherUserId) ||
        (connection.fromUserId === otherUserId && connection.toUserId === currentUserId)
      );
      if (!existing) {
        return res.json({ status: 'none' });
      }
      if (existing.status === 'pending') {
        if (existing.fromUserId === currentUserId) {
          return res.json({ status: 'pending', role: 'sender' });
        }
        return res.json({ status: 'pending', role: 'recipient' });
      }
      if (existing.status === 'accepted') {
        return res.json({ status: 'connected' });
      }
      return res.json({ status: existing.status || 'unknown' });
    } catch (error: any) {
      console.error('Error fetching connection status:', error);
      res.status(500).json({ error: 'Failed to fetch connection status' });
    }
  });

  // Connections (follow/connect) routes
  app.post('/api/connections', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      const { toUserId, message } = req.body;
      if (!toUserId) return res.status(400).json({ error: 'toUserId is required' });
      if (toUserId === req.user!.id) return res.status(400).json({ error: 'Cannot connect to yourself' });
      const connection = await storage.createConnectionRequest({ fromUserId: req.user!.id, toUserId, message });
      res.status(201).json(connection);
    } catch (error: any) {
      console.error('Error creating connection request:', error);
      res.status(500).json({ error: 'Failed to create connection request' });
    }
  });

  app.get('/api/connections', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      const connections = await storage.getConnectionsForUser(req.user!.id);
      // enrich with user objects
      const users = await storage.getUsersByRole('');
      res.json(connections);
    } catch (error: any) {
      console.error('Error fetching connections:', error);
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  });

  app.get('/api/connections/requests', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      const requests = await storage.getConnectionRequestsForUser(req.user!.id);
      res.json(requests);
    } catch (error: any) {
      console.error('Error fetching connection requests:', error);
      res.status(500).json({ error: 'Failed to fetch connection requests' });
    }
  });

  app.put('/api/connections/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      const existing = await storage.getConnectionRequest(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Connection request not found' });

      const { status } = req.body;
      if (!['accepted', 'rejected', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

      // Only recipient can accept/reject; sender can cancel
      if (status === 'accepted' || status === 'rejected') {
        if (existing.toUserId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });
      } else if (status === 'cancelled') {
        if (existing.fromUserId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });
      }

      const updated = await storage.updateConnectionRequest(req.params.id, { status });
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating connection request:', error);
      res.status(500).json({ error: 'Failed to update connection request' });
    }
  });

  // AI Matching Routes
  app.get("/api/recommendations/students/:projectId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const user = req.user!;
      const projectId = req.params.projectId;
      
      // Verify user owns this project or is a professor
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      if (project.ownerId !== user.id && user.role !== "professor") {
        return res.status(403).json({ error: "Not authorized to view student recommendations for this project" });
      }

      const { limit = "10" } = req.query;
      const matches = await matchingService.findStudentMatchesForProject(
        projectId, 
        parseInt(limit as string)
      );
      
      res.json(matches);
    } catch (error: any) {
      console.error("Error getting student recommendations:", error);
      res.status(500).json({ error: "Failed to get student recommendations" });
    }
  });

  app.post("/api/embeddings/update-profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await matchingService.updateUserEmbedding(req.user!.id);
      res.json({ success: true, message: "Profile embedding updated" });
    } catch (error: any) {
      console.error("Error updating profile embedding:", error);
      res.status(500).json({ error: "Failed to update profile embedding" });
    }
  });

  app.post("/api/embeddings/update-project/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to update this project's embedding" });
      }

      await matchingService.updateProjectEmbedding(req.params.id);
      res.json({ success: true, message: "Project embedding updated" });
    } catch (error: any) {
      console.error("Error updating project embedding:", error);
      res.status(500).json({ error: "Failed to update project embedding" });
    }
  });

  // Update user CV endpoint
  app.put("/api/users/cv", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { cvUrl } = req.body;
      if (!cvUrl || typeof cvUrl !== 'string') {
        return res.status(400).json({ error: "CV URL is required" });
      }

      const normalizedUrl = cvUrl.trim();
      await storage.updateUser(req.user!.id, { cvUrl: normalizedUrl });
      res.json({ success: true, cvUrl: normalizedUrl });
    } catch (error: any) {
      console.error("Error updating CV:", error);
      res.status(500).json({ error: "Failed to update CV" });
    }
  });

  // Update project flyer endpoint
  app.put("/api/projects/:id/flyer", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { flyerUrl } = req.body;
      if (!flyerUrl || typeof flyerUrl !== 'string') {
        return res.status(400).json({ error: "Flyer URL is required" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to update this project" });
      }

      const normalizedUrl = flyerUrl.trim();
      await storage.updateProject(req.params.id, { flyerUrl: normalizedUrl });
      res.json({ success: true, flyerUrl: normalizedUrl });
    } catch (error: any) {
      console.error("Error updating project flyer:", error);
      res.status(500).json({ error: "Failed to update project flyer" });
    }
  });

  // Update event poster endpoint
  app.put("/api/events/:id/poster", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { posterUrl } = req.body;
      if (!posterUrl || typeof posterUrl !== 'string') {
        return res.status(400).json({ error: "Poster URL is required" });
      }

      const event = await storage.getLiveEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found" });

      if (event.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to update this event" });
      }

      const normalizedUrl = posterUrl.trim();
      await storage.updateLiveEvent(req.params.id, { posterUrl: normalizedUrl } as any);
      res.json({ success: true, posterUrl: normalizedUrl });
    } catch (error: any) {
      console.error("Error updating event poster:", error);
      res.status(500).json({ error: "Failed to update event poster" });
    }
  });

  // Project chat routes
  app.get("/api/projects/:id/chat", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const projectId = req.params.id;
      const chat = await storage.getProjectChat(projectId);
      
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }

      // Check if user is a member of this chat
      const members = await storage.getChatMembers(chat.id);
      const isMember = members.some(member => member.userId === req.user!.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "Not authorized to access this chat" });
      }

      res.json(chat);
    } catch (error: any) {
      console.error('Error getting project chat:', error);
      res.status(500).json({ error: "Failed to get chat" });
    }
  });

  app.get("/api/chats/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const chatId = req.params.id;
      
      // Check if user is a member of this chat
      const members = await storage.getChatMembers(chatId);
      const isMember = members.some(member => member.userId === req.user!.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "Not authorized to access this chat" });
      }

      const messages = await storage.getChatMessages(chatId);
      res.json(messages);
    } catch (error: any) {
      console.error('Error getting chat messages:', error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/chats/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const chatId = req.params.id;
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Message content is required" });
      }
      
      // Check if user is a member of this chat
      const members = await storage.getChatMembers(chatId);
      const isMember = members.some(member => member.userId === req.user!.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "Not authorized to send messages to this chat" });
      }

      const message = await storage.createChatMessage({
        chatId,
        senderId: req.user!.id,
        content: content.trim(),
        messageType: "text"
      });

      res.status(201).json(message);
    } catch (error: any) {
      console.error('Error creating chat message:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/chats/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const chatId = req.params.id;
      
      // Check if user is a member of this chat
      const members = await storage.getChatMembers(chatId);
      const isMember = members.some(member => member.userId === req.user!.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "Not authorized to access this chat" });
      }

      res.json(members);
    } catch (error: any) {
      console.error('Error getting chat members:', error);
      res.status(500).json({ error: "Failed to get members" });
    }
  });

  // Project sharing and matching routes
  app.get("/api/projects/:id/matching-users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      
      if (!project || project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to access this project" });
      }

      // Get all users except the project owner, with compatibility scores
      const allUsers = await storage.getUsersByRole('student');
      const professors = await storage.getUsersByRole('professor');
      const allPotentialUsers = [...allUsers, ...professors].filter(user => user.id !== req.user!.id);
      
      // Calculate match scores for each user
      const usersWithScores = await Promise.all(
        allPotentialUsers.map(async (user: User) => {
          try {
            // FIX: Imported calculateUserProjectCompatibility from matchingService above
            const matchScore = await matchingService.calculateUserProjectCompatibility(user.id, projectId);
            const { password, ...publicUser } = user;
            return {
              ...publicUser,
              matchScore: Math.round(matchScore * 100)
            };
          } catch (error: any) {
            const { password, ...publicUser } = user;
            return {
              ...publicUser,
              matchScore: 0
            };
          }
        })
      );

      // Sort by match score (highest first)
      usersWithScores.sort((a, b) => b.matchScore - a.matchScore);
      
      res.json(usersWithScores);
    } catch (error: any) {
      console.error('Error getting matching users:', error);
      res.status(500).json({ error: "Failed to get matching users" });
    }
  });

  app.post("/api/projects/:id/share", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const projectId = req.params.id;
      const { userIds = [], emails = [], message } = req.body;
      
      if ((!userIds || userIds.length === 0) && (!emails || emails.length === 0)) {
        return res.status(400).json({ error: "At least one user ID or email is required" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to share this project" });
      }

      // Create shares for each user
      const shares = await Promise.all(
        userIds.map((userId: string) => 
          storage.shareProject({
            projectId,
            sharedById: req.user!.id,
            sharedWithId: userId,
            message: message || '',
            status: 'pending'
          })
        )
      );

      // Create notifications and send emails for shared users
      await Promise.all(
        userIds.map(async (userId: string) => {
          // Create notification
          await storage.createNotification({
            userId,
            type: "project_share",
            title: "Project Shared with You",
            content: `${getDisplayName(req.user!)} shared a project: ${project.title}`,
            payload: { projectId, shareId: shares.find(s => s.sharedWithId === userId)?.id }
          });

          // Send email notification
          try {
            const recipient = await storage.getUser(userId);
            if (recipient?.email) {
              const loginUrl = process.env.REPLIT_DOMAINS 
                ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
                : 'http://localhost:5000';
              const emailTemplate = emailService.createProjectShareEmail(
                recipient.email,
                recipient.name,
                project.title,
                req.user!.name,
                message,
                loginUrl
              );
              await emailService.sendEmail(emailTemplate);
              console.log(`Project share email sent to platform user: ${recipient.email}`);
            }
          } catch (emailError: any) {
            console.error('Failed to send email notification:', emailError);
            // Don't fail the request if email fails
          }
        })
      );

      // Send emails to external email addresses
      await Promise.all(
        emails.map(async (email: string) => {
          try {
            const loginUrl = process.env.REPLIT_DOMAINS 
              ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
              : 'http://localhost:5000';
            const emailTemplate = emailService.createProjectShareEmail(
              email,
              email.split('@')[0], // Use email username as name
              project.title,
              req.user!.name,
              message,
              loginUrl
            );
            await emailService.sendEmail(emailTemplate);
            console.log(`Project share email sent to external email: ${email}`);
          } catch (emailError: any) {
            console.error('Failed to send email to external address:', emailError);
            // Don't fail the request if email fails
          }
        })
      );

      res.json({ success: true, shares });
    } catch (error: any) {
      console.error('Error sharing project:', error);
      res.status(500).json({ error: "Failed to share project" });
    }
  });

  app.get("/api/project-shares", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const shares = await storage.getProjectShares(req.user!.id);
      res.json(shares);
    } catch (error: any) {
      console.error('Error getting project shares:', error);
      res.status(500).json({ error: "Failed to get project shares" });
    }
  });

  app.put("/api/project-shares/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { status } = req.body;
      
      if (!['pending', 'viewed', 'applied'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const share = await storage.updateShareStatus(req.params.id, status);
      res.json(share);
    } catch (error: any) {
      console.error('Error updating share status:', error);
      res.status(500).json({ error: "Failed to update share status" });
    }
  });

  app.get("/api/recommendations/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const recommendations = await storage.getRecommendedProjects(req.user!.id, 10);
      res.json(recommendations);
    } catch (error: any) {
      console.error('Error getting project recommendations:', error);
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  app.get("/api/user-interests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const interests = await storage.getUserInterests(req.user!.id);
      res.json(interests || { keywords: [], researchAreas: [] });
    } catch (error: any) {
      console.error('Error getting user interests:', error);
      res.status(500).json({ error: "Failed to get user interests" });
    }
  });

  app.put("/api/user-interests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { keywords, researchAreas } = req.body;
      
      if (!Array.isArray(keywords) || !Array.isArray(researchAreas)) {
        return res.status(400).json({ error: "Keywords and research areas must be arrays" });
      }

      // FIX: Correctly pass the userId as part of the object
      const interests = await storage.updateUserInterests(req.user!.id, {
        userId: req.user!.id,
        keywords,
        researchAreas
      });

      res.json(interests);
    } catch (error: any) {
      console.error('Error updating user interests:', error);
      res.status(500).json({ error: "Failed to update user interests" });
    }
  });

  // Feed routes
  app.get("/api/feed", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const feed = await storage.getFeed(req.user!.id);
      res.json(feed || []);
    } catch (error: any) {
      console.error('Error fetching feed:', error);
      res.status(500).json({ error: "Failed to fetch feed" });
    }
  });

  app.post("/api/feed/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { content, image } = req.body ?? {};
      const hasText = typeof content === "string" && content.trim().length > 0;
      const hasImage = typeof image === "string" && image.trim().length > 0;
      if (!hasText && !hasImage) {
        return res.status(400).json({ error: "Post content or image is required" });
      }

      // FIX: Removed any accidental role-blocking logic. Students are explicitly allowed to post.
      // If you want to restrict this in the future, uncomment the lines below:
      // if (String(req.user!.role || '').toLowerCase() === 'student') {
      //   return res.status(403).json({ error: "Students cannot create feed posts" });
      // }

      const post = await storage.createFeedPost({
        authorId: req.user!.id,
        content: hasText ? content.trim() : "",
        image: hasImage ? image : null,
      });

      res.status(201).json(post);
    } catch (error: any) {
      console.error('Error creating feed post:', error);
      res.status(500).json({ error: "Failed to create feed post" });
    }
  });

  app.post("/api/feed/:postId/like", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const post = await storage.toggleFeedLike(req.params.postId, req.user!.id);
      res.json(post);
    } catch (error: any) {
      console.error('Error toggling feed like:', error);
      res.status(500).json({ error: "Failed to update feed like" });
    }
  });

  app.get("/api/feed/:postId/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const comments = await storage.getFeedComments(req.params.postId);
      res.json(comments || []);
    } catch (error: any) {
      console.error('Error fetching feed comments:', error);
      res.status(500).json({ error: "Failed to fetch feed comments" });
    }
  });

  app.get('/public/feed/posts/:postId', async (req, res) => {
    try {
      const post = await storage.getFeedPost(req.params.postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.json(post);
    } catch (error: any) {
      console.error('Error fetching shared feed post:', error);
      res.status(500).json({ error: 'Failed to fetch shared post' });
    }
  });

  app.post("/api/feed/:postId/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { content } = req.body ?? {};
      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      // FIX: Removed any accidental role-blocking logic. Students are allowed to comment.
      const comment = await storage.createFeedComment(req.params.postId, {
        authorId: req.user!.id,
        content: content.trim(),
      });

      const post = await storage.getFeedPost(req.params.postId);
      if (post && post.authorId && post.authorId !== req.user!.id) {
        await storage.createNotification({
          userId: post.authorId,
          type: "feed_comment",
          title: "New comment on your post",
          content: `${getDisplayName(req.user!)} commented on your post`,
          payload: { postId: req.params.postId, commentId: comment.id },
        });
      }

      res.status(201).json(comment);
    } catch (error: any) {
      console.error('Error creating feed comment:', error);
      res.status(500).json({ error: "Failed to create feed comment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}