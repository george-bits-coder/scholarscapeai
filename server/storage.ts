import { type User, type InsertUser, type Project, type InsertProject, type Application, type InsertApplication, type Message, type InsertMessage, type Grant, type InsertGrant, type Notification, type InsertNotification } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private applications: Map<string, Application>;
  private messages: Map<string, Message>;
  private grants: Map<string, Grant>;
  private notifications: Map<string, Notification>;
  public sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.applications = new Map();
    this.messages = new Map();
    this.grants = new Map();
    this.notifications = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    this.seedData();
  }

  private seedData() {
    // Create some initial users
    const users = [
      {
        id: "user1",
        username: "sarah.chen",
        password: "hashedpassword1",
        email: "sarah.chen@stanford.edu",
        name: "Dr. Sarah Chen",
        affiliation: "Stanford University",
        bio: "AI researcher specializing in machine learning and medical imaging",
        skills: ["Machine Learning", "Medical Imaging", "Python", "TensorFlow"],
        publications: ["AI in Cancer Detection", "Deep Learning for Medical Diagnosis"],
        rating: "4.8",
        profileImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop",
        verified: true,
        createdAt: new Date(),
      },
      {
        id: "user2",
        username: "michael.thompson",
        password: "hashedpassword2",
        email: "m.thompson@mit.edu",
        name: "Dr. Michael Thompson",
        affiliation: "MIT",
        bio: "Blockchain researcher and distributed systems expert",
        skills: ["Blockchain", "Smart Contracts", "Solidity", "Distributed Systems"],
        publications: ["Blockchain in Supply Chain", "Smart Contract Security"],
        rating: "4.9",
        profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
        verified: true,
        createdAt: new Date(),
      },
      {
        id: "user3",
        username: "elena.rodriguez",
        password: "hashedpassword3",
        email: "e.rodriguez@jhu.edu",
        name: "Dr. Elena Rodriguez",
        affiliation: "Johns Hopkins",
        bio: "Drug discovery researcher using AI and machine learning",
        skills: ["Drug Discovery", "Neural Networks", "PyTorch", "Bioinformatics"],
        publications: ["AI in Drug Discovery", "Neural Networks for Protein Folding"],
        rating: "4.7",
        profileImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop",
        verified: true,
        createdAt: new Date(),
      }
    ];

    users.forEach(user => this.users.set(user.id, user as User));

    // Create some projects
    const projects = [
      {
        id: "proj1",
        ownerId: "user2",
        title: "Blockchain for Supply Chain Transparency",
        description: "Looking for a blockchain developer to help design and implement a transparent supply chain tracking system. We need expertise in smart contracts, Ethereum, and web3 technologies.",
        requiredSkills: ["Blockchain", "Smart Contracts", "Solidity", "Supply Chain"],
        compensation: 15000,
        timeline: "3-6 months",
        status: "active",
        remote: true,
        location: "Remote",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "proj2",
        ownerId: "user3",
        title: "Neural Networks for Drug Discovery",
        description: "Seeking a machine learning researcher to develop neural network models for predicting drug-protein interactions. Project involves working with large molecular datasets.",
        requiredSkills: ["Machine Learning", "Neural Networks", "Drug Discovery", "PyTorch"],
        compensation: 25000,
        timeline: "6-12 months",
        status: "active",
        remote: false,
        location: "Baltimore, MD",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    projects.forEach(project => this.projects.set(project.id, project as Project));

    // Create some grants
    const grants = [
      {
        id: "grant1",
        title: "NSF AI Research Grant",
        region: "United States",
        deadline: new Date("2025-03-15"),
        amount: 500000,
        url: "https://nsf.gov/funding/ai-research",
        tags: ["AI", "Machine Learning", "Research"],
        createdAt: new Date(),
      },
      {
        id: "grant2",
        title: "EU Horizon Climate Research",
        region: "Europe",
        deadline: new Date("2025-04-30"),
        amount: 750000,
        url: "https://ec.europa.eu/horizon-europe",
        tags: ["Climate", "Environment", "Data Science"],
        createdAt: new Date(),
      }
    ];

    grants.forEach(grant => this.grants.set(grant.id, grant as Grant));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      rating: "0.0",
      verified: false,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjects(filters?: { ownerId?: string; status?: string }): Promise<Project[]> {
    let projects = Array.from(this.projects.values());
    
    if (filters?.ownerId) {
      projects = projects.filter(p => p.ownerId === filters.ownerId);
    }
    if (filters?.status) {
      projects = projects.filter(p => p.status === filters.status);
    }
    
    return projects;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) throw new Error("Project not found");
    
    const updatedProject = { ...project, ...updates, updatedAt: new Date() };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async getApplication(id: string): Promise<Application | undefined> {
    return this.applications.get(id);
  }

  async getApplications(filters?: { projectId?: string; userId?: string }): Promise<Application[]> {
    let applications = Array.from(this.applications.values());
    
    if (filters?.projectId) {
      applications = applications.filter(a => a.projectId === filters.projectId);
    }
    if (filters?.userId) {
      applications = applications.filter(a => a.userId === filters.userId);
    }
    
    return applications;
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const id = randomUUID();
    const application: Application = {
      ...insertApplication,
      id,
      createdAt: new Date(),
    };
    this.applications.set(id, application);
    return application;
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application> {
    const application = this.applications.get(id);
    if (!application) throw new Error("Application not found");
    
    const updatedApplication = { ...application, ...updates };
    this.applications.set(id, updatedApplication);
    return updatedApplication;
  }

  async getMessages(filters: { senderId?: string; receiverId?: string; projectId?: string }): Promise<Message[]> {
    let messages = Array.from(this.messages.values());
    
    if (filters.senderId) {
      messages = messages.filter(m => m.senderId === filters.senderId);
    }
    if (filters.receiverId) {
      messages = messages.filter(m => m.receiverId === filters.receiverId);
    }
    if (filters.projectId) {
      messages = messages.filter(m => m.projectId === filters.projectId);
    }
    
    return messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async markMessageAsRead(id: string): Promise<void> {
    const message = this.messages.get(id);
    if (message) {
      message.readAt = new Date();
      this.messages.set(id, message);
    }
  }

  async getGrants(filters?: { region?: string; tags?: string[] }): Promise<Grant[]> {
    let grants = Array.from(this.grants.values());
    
    if (filters?.region) {
      grants = grants.filter(g => g.region === filters.region);
    }
    if (filters?.tags && filters.tags.length > 0) {
      grants = grants.filter(g => 
        g.tags?.some(tag => filters.tags!.includes(tag))
      );
    }
    
    return grants;
  }

  async createGrant(insertGrant: InsertGrant): Promise<Grant> {
    const id = randomUUID();
    const grant: Grant = {
      ...insertGrant,
      id,
      createdAt: new Date(),
    };
    this.grants.set(id, grant);
    return grant;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...insertNotification,
      id,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.readAt = new Date();
      this.notifications.set(id, notification);
    }
  }
}

export const storage = new MemStorage();
