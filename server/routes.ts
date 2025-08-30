import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { matchingService } from "./matching-service";
import { insertProjectSchema, insertOpportunitySchema, insertApplicationSchema, insertMessageSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

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

      const updatedProject = await storage.updateProject(req.params.id, req.body);
      res.json(updatedProject);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      console.error("Error fetching applications:", error);
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

  // Update application status
  app.put("/api/applications/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { status, reviewNotes } = req.body;
      
      // Validate status
      if (!['submitted', 'under_review', 'approved', 'rejected'].includes(status)) {
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

      const updatedApplication = await storage.updateApplicationStatus(req.params.id, status, reviewNotes);
      
      // If application is approved, create or get project chat and add the applicant
      if (status === 'approved') {
        let chat = await storage.getProjectChat(project.id);
        if (!chat) {
          chat = await storage.createProjectChat(project.id, project.ownerId);
        }
        
        // Add the approved applicant to the chat
        await storage.addChatMember(chat.id, application.userId, "member");
      }
      
      // Create notification for applicant
      await storage.createNotification({
        userId: application.userId,
        type: "application",
        title: "Application Status Update",
        content: `Your application for "${project.title}" has been ${status.replace('_', ' ')}`,
        payload: { applicationId: application.id, projectId: project.id },
      });
      
      res.json(updatedApplication);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
          content: `${req.user!.name} commented on an application for "${project.title}"`,
          payload: { applicationId: application.id, projectId: project.id },
        });
      }

      res.status(201).json(comment);
    } catch (error) {
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
        // Get all professors and students (remove verification filter)
        const professors = await storage.getUsersByRole("professor");
        const students = await storage.getUsersByRole("student");
        users = [...professors, ...students];
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

  // AI Matching Routes (removed - replaced with new implementation below)

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

  // Object Storage Routes
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve private objects (CVs and user uploads)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Update user CV endpoint
  app.put("/api/users/cv", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { cvUrl } = req.body;
      if (!cvUrl) {
        return res.status(400).json({ error: "CV URL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(cvUrl);
      
      await storage.updateUser(req.user!.id, { cvUrl: normalizedPath });
      res.json({ success: true, cvUrl: normalizedPath });
    } catch (error) {
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
      if (!flyerUrl) {
        return res.status(400).json({ error: "Flyer URL is required" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to update this project" });
      }

      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(flyerUrl);
      
      await storage.updateProject(req.params.id, { flyerUrl: normalizedPath });
      res.json({ success: true, flyerUrl: normalizedPath });
    } catch (error) {
      console.error("Error updating project flyer:", error);
      res.status(500).json({ error: "Failed to update project flyer" });
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

      const matchingUsers = await storage.getMatchingUsers(projectId, 20);
      res.json(matchingUsers);
    } catch (error) {
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
      const { userIds, message } = req.body;
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "User IDs are required" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to share this project" });
      }

      // Create shares for each user
      const shares = await Promise.all(
        userIds.map(userId => 
          storage.shareProject({
            projectId,
            sharedById: req.user!.id,
            sharedWithId: userId,
            message: message || '',
            status: 'pending'
          })
        )
      );

      // Create notifications for shared users
      await Promise.all(
        userIds.map(userId =>
          storage.createNotification({
            userId,
            type: "project_share",
            title: "Project Shared with You",
            content: `${req.user!.name} shared a project: ${project.title}`,
            payload: { projectId, shareId: shares.find(s => s.sharedWithId === userId)?.id }
          })
        )
      );

      res.json({ success: true, shares });
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

      const interests = await storage.updateUserInterests(req.user!.id, {
        keywords,
        researchAreas
      });

      res.json(interests);
    } catch (error) {
      console.error('Error updating user interests:', error);
      res.status(500).json({ error: "Failed to update user interests" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
