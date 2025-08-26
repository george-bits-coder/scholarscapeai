import { type User, type InsertUser, type Project, type InsertProject, type Application, type InsertApplication, type Message, type InsertMessage, type Grant, type InsertGrant, type Notification, type InsertNotification } from "@shared/schema";
import { users, projects, applications, messages, grants, notifications, applicationComments } from "@shared/schema";
import { eq, and, desc, inArray, or } from "drizzle-orm";
import { db } from "./database";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  getProject(id: string): Promise<Project | undefined>;
  getProjects(filters?: { ownerId?: string; status?: string }): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  
  getApplication(id: string): Promise<Application | undefined>;
  getApplications(filters?: { projectId?: string; userId?: string }): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, updates: Partial<Application>): Promise<Application>;
  
  getMessages(filters: { senderId?: string; receiverId?: string; projectId?: string }): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<void>;
  
  getGrants(filters?: { region?: string; tags?: string[] }): Promise<Grant[]>;
  createGrant(grant: InsertGrant): Promise<Grant>;
  
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  
  getUsersByRole(role: string): Promise<User[]>;
  
  // Application management
  getApplicationsForProject(projectId: string): Promise<(Application & { user: User; project: Project })[]>;
  getApplicationsForUser(userId: string): Promise<(Application & { user: User; project: Project })[]>;
  getApplicationsForProjectOwner(ownerId: string): Promise<(Application & { user: User; project: Project })[]>;
  updateApplicationStatus(applicationId: string, status: string, reviewNotes?: string): Promise<Application>;
  
  // Application comments
  getApplicationComments(applicationId: string): Promise<any[]>;
  createApplicationComment(comment: any): Promise<any>;
  
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL!,
      createTableIfMissing: true,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values([insertUser as any]).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (result.length === 0) throw new Error("User not found");
    return result[0];
  }

  async getProject(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async getProjects(filters?: { ownerId?: string; status?: string }): Promise<Project[]> {
    let query = db.select().from(projects);
    
    const conditions = [];
    if (filters?.ownerId) {
      conditions.push(eq(projects.ownerId, filters.ownerId));
    }
    if (filters?.status) {
      conditions.push(eq(projects.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(projects.createdAt));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values([insertProject as any]).returning();
    return result[0];
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const result = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    if (result.length === 0) throw new Error("Project not found");
    return result[0];
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    return result[0];
  }

  async getApplications(filters?: { projectId?: string; userId?: string }): Promise<Application[]> {
    let query = db.select().from(applications);
    
    const conditions = [];
    if (filters?.projectId) {
      conditions.push(eq(applications.projectId, filters.projectId));
    }
    if (filters?.userId) {
      conditions.push(eq(applications.userId, filters.userId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(applications.createdAt));
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const result = await db.insert(applications).values([insertApplication]).returning();
    return result[0];
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application> {
    const result = await db.update(applications).set(updates).where(eq(applications.id, id)).returning();
    if (result.length === 0) throw new Error("Application not found");
    return result[0];
  }

  async getMessages(filters: { senderId?: string; receiverId?: string; projectId?: string }): Promise<Message[]> {
    let query = db.select().from(messages);
    
    const conditions = [];
    if (filters.senderId && filters.receiverId) {
      conditions.push(
        or(
          and(eq(messages.senderId, filters.senderId), eq(messages.receiverId, filters.receiverId)),
          and(eq(messages.senderId, filters.receiverId), eq(messages.receiverId, filters.senderId))
        )
      );
    } else {
      if (filters.senderId) {
        conditions.push(eq(messages.senderId, filters.senderId));
      }
      if (filters.receiverId) {
        conditions.push(eq(messages.receiverId, filters.receiverId));
      }
    }
    if (filters.projectId) {
      conditions.push(eq(messages.projectId, filters.projectId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(messages.createdAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values([insertMessage]).returning();
    return result[0];
  }

  async markMessageAsRead(id: string): Promise<void> {
    await db.update(messages).set({ readAt: new Date() }).where(eq(messages.id, id));
  }

  async getGrants(filters?: { region?: string; tags?: string[] }): Promise<Grant[]> {
    let query = db.select().from(grants);
    
    // Note: For complex filtering with JSONB arrays, you might need to use raw SQL
    // For now, we'll return all grants and filter in memory if needed
    const allGrants = await query.orderBy(desc(grants.createdAt));
    
    if (filters) {
      return allGrants.filter(grant => {
        if (filters.region && grant.region !== filters.region) {
          return false;
        }
        if (filters.tags && filters.tags.length > 0 && grant.tags) {
          const grantTags = grant.tags as string[];
          if (!filters.tags.some(tag => grantTags.includes(tag))) {
            return false;
          }
        }
        return true;
      });
    }
    
    return allGrants;
  }

  async createGrant(insertGrant: InsertGrant): Promise<Grant> {
    const result = await db.insert(grants).values([insertGrant as any]).returning();
    return result[0];
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values([insertNotification]).returning();
    return result[0];
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  // Application management methods
  async getApplicationsForProject(projectId: string): Promise<(Application & { user: User; project: Project })[]> {
    return await db
      .select()
      .from(applications)
      .leftJoin(users, eq(applications.userId, users.id))
      .leftJoin(projects, eq(applications.projectId, projects.id))
      .where(eq(applications.projectId, projectId))
      .orderBy(desc(applications.createdAt)) as any;
  }

  async getApplicationsForUser(userId: string): Promise<(Application & { user: User; project: Project })[]> {
    return await db
      .select()
      .from(applications)
      .leftJoin(users, eq(applications.userId, users.id))
      .leftJoin(projects, eq(applications.projectId, projects.id))
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt)) as any;
  }

  async getApplicationsForProjectOwner(ownerId: string): Promise<(Application & { user: User; project: Project })[]> {
    const result = await db
      .select({
        // Application fields
        id: applications.id,
        projectId: applications.projectId,
        userId: applications.userId,
        coverLetter: applications.coverLetter,
        proposalUrl: applications.proposalUrl,
        status: applications.status,
        matchScore: applications.matchScore,
        reviewedAt: applications.reviewedAt,
        reviewNotes: applications.reviewNotes,
        deadline: applications.deadline,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        // User fields
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          name: users.name,
          affiliation: users.affiliation,
          bio: users.bio,
          skills: users.skills,
          publications: users.publications,
          rating: users.rating,
          profileImage: users.profileImage,
          verified: users.verified,
          role: users.role,
          researchInterests: users.researchInterests,
          academicLevel: users.academicLevel,
          profileEmbedding: users.profileEmbedding,
          createdAt: users.createdAt,
        },
        // Project fields
        project: {
          id: projects.id,
          ownerId: projects.ownerId,
          title: projects.title,
          description: projects.description,
          requiredSkills: projects.requiredSkills,
          compensation: projects.compensation,
          timeline: projects.timeline,
          status: projects.status,
          remote: projects.remote,
          location: projects.location,
          projectEmbedding: projects.projectEmbedding,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        },
      })
      .from(applications)
      .leftJoin(users, eq(applications.userId, users.id))
      .leftJoin(projects, eq(applications.projectId, projects.id))
      .where(eq(projects.ownerId, ownerId))
      .orderBy(desc(applications.createdAt));
    
    return result as any;
  }

  async updateApplicationStatus(applicationId: string, status: string, reviewNotes?: string): Promise<Application> {
    const updateData: any = { 
      status, 
      updatedAt: new Date(),
      reviewedAt: new Date()
    };
    if (reviewNotes) {
      updateData.reviewNotes = reviewNotes;
    }

    const result = await db
      .update(applications)
      .set(updateData)
      .where(eq(applications.id, applicationId))
      .returning();
    
    if (result.length === 0) throw new Error("Application not found");
    return result[0];
  }

  // Application comments methods
  async getApplicationComments(applicationId: string): Promise<any[]> {
    return await db
      .select()
      .from(applicationComments)
      .leftJoin(users, eq(applicationComments.userId, users.id))
      .where(eq(applicationComments.applicationId, applicationId))
      .orderBy(desc(applicationComments.createdAt)) as any;
  }

  async createApplicationComment(comment: any): Promise<any> {
    const result = await db.insert(applicationComments).values([comment]).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();