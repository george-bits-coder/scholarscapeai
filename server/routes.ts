import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { matchingService } from "./matching-service";
import { insertProjectSchema, insertApplicationSchema, insertMessageSchema } from "@shared/schema";

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
    } catch (error) {
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
      const applications = await storage.getApplications({ projectId: project.id });
      
      res.json({ ...project, owner, applications });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const projectData = insertProjectSchema.parse({
        ...req.body,
        ownerId: req.user!.id,
      });
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  // Applications routes
  app.get("/api/applications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { projectId } = req.query;
      const applications = await storage.getApplications({
        projectId: projectId as string,
        userId: req.user!.id,
      });
      
      // Get applicant details for each application
      const applicationsWithDetails = await Promise.all(
        applications.map(async (application) => {
          const applicant = await storage.getUser(application.userId);
          const project = await storage.getProject(application.projectId);
          return { ...application, applicant, project };
        })
      );
      
      res.json(applicationsWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.post("/api/applications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      const application = await storage.createApplication(applicationData);
      
      // Create notification for project owner
      const project = await storage.getProject(application.projectId);
      if (project) {
        await storage.createNotification({
          userId: project.ownerId,
          type: "application",
          title: "New Project Application",
          content: `${req.user!.name} applied to your project: ${project.title}`,
          payload: { applicationId: application.id, projectId: project.id },
        });
      }
      
      res.status(201).json(application);
    } catch (error) {
      res.status(400).json({ error: "Invalid application data" });
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
      
      // Create notification for applicant
      await storage.createNotification({
        userId: application.userId,
        type: "application",
        title: "Application Status Update",
        content: `Your application for "${project.title}" has been ${req.body.status}`,
        payload: { applicationId: application.id, projectId: project.id },
      });
      
      res.json(updatedApplication);
    } catch (error) {
      res.status(500).json({ error: "Failed to update application" });
    }
  });

  // Messages routes
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { projectId } = req.query;
      const messages = await storage.getMessages({
        receiverId: req.user!.id,
        projectId: projectId as string,
      });
      
      // Get sender details for each message
      const messagesWithSenders = await Promise.all(
        messages.map(async (message) => {
          const sender = await storage.getUser(message.senderId);
          return { ...message, sender };
        })
      );
      
      res.json(messagesWithSenders);
    } catch (error) {
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
        content: `${req.user!.name} sent you a message`,
        payload: { messageId: message.id, senderId: req.user!.id },
      });
      
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Researchers routes
  app.get("/api/researchers", async (req, res) => {
    try {
      const { role } = req.query;
      let users;
      
      if (role) {
        users = await storage.getUsersByRole(role as string);
      } else {
        // Get all verified users for backward compatibility
        users = await storage.getUsersByRole("researcher");
        const professors = await storage.getUsersByRole("professor");
        const students = await storage.getUsersByRole("student");
        users = [...users, ...professors, ...students].filter(user => user.verified);
      }
      
      // Remove password from response
      const publicUsers = users.map(user => {
        const { password, ...publicUser } = user;
        return publicUser;
      });
      
      res.json(publicUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch researchers" });
    }
  });

  app.get("/api/researchers/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "Researcher not found" });
      }
      
      const { password, ...publicUser } = user;
      res.json(publicUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch researcher" });
    }
  });

  // AI Matching Routes
  app.get("/api/recommendations/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const user = req.user!;
      
      // Only students can get project recommendations
      if (user.role !== "student") {
        return res.status(403).json({ error: "Only students can get project recommendations" });
      }

      const { limit = "10" } = req.query;
      const matches = await matchingService.findProjectMatchesForStudent(
        user.id, 
        parseInt(limit as string)
      );
      
      res.json(matches);
    } catch (error) {
      console.error("Error getting project recommendations:", error);
      res.status(500).json({ error: "Failed to get project recommendations" });
    }
  });

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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      console.error("Error updating project embedding:", error);
      res.status(500).json({ error: "Failed to update project embedding" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
