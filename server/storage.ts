import { type User, type InsertUser, type Project, type InsertProject, type Application, type InsertApplication, type Message, type InsertMessage, type Grant, type InsertGrant, type Notification, type InsertNotification } from "@shared/schema";
import { users, projects, applications, messages, grants, notifications } from "@shared/schema";
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
}

export const storage = new DatabaseStorage();