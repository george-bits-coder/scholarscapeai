import type {
  User,
  InsertUser,
  Project,
  InsertProject,
  Opportunity,
  InsertOpportunity,
  Application,
  InsertApplication,
  Message,
  InsertMessage,
  Grant,
  InsertGrant,
  Notification,
  InsertNotification,
  ProjectChat,
  InsertProjectChat,
  ProjectChatMember,
  InsertProjectChatMember,
  ProjectChatMessage,
  InsertProjectChatMessage,
  ProjectShare,
  InsertProjectShare,
  UserInterests,
  InsertUserInterests,
} from "@shared/schema";

export interface Activity {
  id: string;
  message: string;
  actorId?: string;
  createdAt?: string;
}

export interface InsertActivity {
  message: string;
  actorId?: string;
}
import { FirebaseStorage } from "./firebaseStorage";

export interface LiveEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  platform: string;
  link: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InsertLiveEvent {
  title: string;
  description?: string;
  date: string;
  time: string;
  platform: string;
  link: string;
  ownerId: string;
  status?: string;
}

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
  deleteProject(id: string): Promise<void>;

  getLiveEvent(id: string): Promise<LiveEvent | undefined>;
  getLiveEvents(filters?: { ownerId?: string; status?: string }): Promise<LiveEvent[]>;
  createLiveEvent(event: InsertLiveEvent): Promise<LiveEvent>;
  updateLiveEvent(id: string, updates: Partial<LiveEvent>): Promise<LiveEvent>;
  deleteLiveEvent(id: string): Promise<void>;

  getRecentActivities(limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  getOpportunity(id: string): Promise<Opportunity | undefined>;
  getOpportunities(filters?: { studentId?: string; status?: string }): Promise<Opportunity[]>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  updateOpportunity(id: string, updates: Partial<Opportunity>): Promise<Opportunity>;
  deleteOpportunity(id: string): Promise<void>;

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
  // Connections
  createConnectionRequest(request: { fromUserId: string; toUserId: string; message?: string }): Promise<any>;
  getConnectionRequest(id: string): Promise<any | undefined>;
  updateConnectionRequest(id: string, updates: Partial<any>): Promise<any>;
  getConnectionsForUser(userId: string): Promise<any[]>;
  getConnectionRequestsForUser(userId: string): Promise<any[]>;

  getApplicationsForProject(projectId: string): Promise<(Application & { user: User; project: Project })[]>;
  getApplicationsForUser(userId: string): Promise<(Application & { user: User; project: Project })[]>;
  getApplicationsForProjectOwner(ownerId: string): Promise<(Application & { user: User; project: Project })[]>;
  updateApplicationStatus(applicationId: string, status: string, reviewNotes?: string): Promise<Application>;

  getApplicationComments(applicationId: string): Promise<any[]>;
  createApplicationComment(comment: any): Promise<any>;

  createProjectChat(projectId: string, ownerId: string): Promise<ProjectChat>;
  getProjectChat(projectId: string): Promise<ProjectChat | undefined>;
  addChatMember(chatId: string, userId: string, role?: string): Promise<ProjectChatMember>;
  getChatMembers(chatId: string): Promise<(ProjectChatMember & { user: User })[]>;
  getChatMessages(chatId: string, limit?: number): Promise<(ProjectChatMessage & { sender: User })[]>;
  createChatMessage(message: InsertProjectChatMessage): Promise<ProjectChatMessage>;

  shareProject(share: InsertProjectShare): Promise<ProjectShare>;
  getProjectShares(userId: string): Promise<(ProjectShare & { project: Project; sharedBy: User })[]>;
  updateShareStatus(shareId: string, status: string): Promise<ProjectShare>;
  getUserInterests(userId: string): Promise<UserInterests | undefined>;
  updateUserInterests(userId: string, interests: InsertUserInterests): Promise<UserInterests>;
  getMatchingUsers(projectId: string, limit?: number): Promise<(User & { matchScore: number })[]>;
  getRecommendedProjects(userId: string, limit?: number): Promise<(Project & { matchScore: number })[]>;

  sessionStore: any;
}

export const storage = new FirebaseStorage();
