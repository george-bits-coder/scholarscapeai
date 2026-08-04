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
import type { IStorage } from "./storage";
import {
  createFirebaseId,
  firebaseRootRef,
  FirebaseSessionStore,
  getValue,
  listValues,
  queryValuesByChild,
  removeValue,
  setValue,
} from "./firebase";

function nowIso(): string {
  return new Date().toISOString();
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return "just now";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function getInitials(name?: string): string {
  return (name || "R")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "R";
}

function ensureId<T extends Record<string, any>>(item: any, id: string): T & { id: string } {
  if (!item) throw new Error(`Missing item for id ${id}`);
  return { id, ...item };
}

export class FirebaseStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    this.sessionStore = new FirebaseSessionStore(firebaseRootRef);
  }

  private async getItem<T extends Record<string, any>>(path: string, id: string): Promise<(T & { id: string }) | undefined> {
    const value = await getValue<T>(`${path}/${id}`);
    if (!value) return undefined;
    return ensureId<T>(value, id);
  }

  private async queryItemByChild<T extends Record<string, any>>(
    path: string,
    child: string,
    value: unknown,
  ): Promise<(T & { id: string }) | undefined> {
    const results = await queryValuesByChild<T>(path, child, value);
    return results[0];
  }

  private async listItems<T extends Record<string, any>>(path: string): Promise<Array<T & { id: string }>> {
    return await listValues<T>(path);
  }

  private async saveItem<T extends Record<string, any>>(path: string, id: string, item: T): Promise<T & { id: string }> {
    await setValue(`${path}/${id}`, item);
    return ensureId<T>(item, id);
  }

  private async removeItem(path: string, id: string): Promise<void> {
    await removeValue(`${path}/${id}`);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.getItem<User>("users", id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.queryItemByChild<User>("users", "username", username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.queryItemByChild<User>("users", "email", email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = insertUser.id || createFirebaseId();
    const user: any = {
      ...insertUser,
      verified: insertUser.verified ?? false,
      rating: insertUser.rating ?? "0.0",
      createdAt: nowIso(),
    };
    return this.saveItem<User>("users", id, user);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const existing = await this.getUser(id);
    if (!existing) throw new Error("User not found");
    const updated = {
      ...existing,
      ...updates,
      updatedAt: nowIso(),
    };
    await setValue(`users/${id}`, updated);
    return updated;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.getItem<Project>("projects", id);
  }

  async getProjects(filters?: { ownerId?: string; status?: string }): Promise<Project[]> {
    let projects = await this.listItems<Project>("projects");
    if (filters?.ownerId) {
      projects = projects.filter((project) => project.ownerId === filters.ownerId);
    }
    if (filters?.status) {
      projects = projects.filter((project) => project.status === filters.status);
    }
    return projects.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = insertProject.id || createFirebaseId();
    const project: any = {
      ...insertProject,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return this.saveItem<Project>("projects", id, project);
  }

  async getLiveEvent(id: string): Promise<LiveEvent | undefined> {
    return this.getItem<LiveEvent>("liveEvents", id);
  }

  async getLiveEvents(filters?: { ownerId?: string; status?: string }): Promise<LiveEvent[]> {
    let events = await this.listItems<LiveEvent>("liveEvents");
    if (filters?.ownerId) {
      events = events.filter((event) => event.ownerId === filters.ownerId);
    }
    if (filters?.status) {
      events = events.filter((event) => (event as any).status === filters.status);
    }
    return events.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async createLiveEvent(insertEvent: InsertLiveEvent): Promise<LiveEvent> {
    const id = insertEvent.id || createFirebaseId();
    const event: any = {
      ...insertEvent,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return this.saveItem<LiveEvent>("liveEvents", id, event);
  }

  async updateLiveEvent(id: string, updates: Partial<LiveEvent>): Promise<LiveEvent> {
    const existing = await this.getLiveEvent(id);
    if (!existing) throw new Error("Live event not found");
    const updated = {
      ...existing,
      ...updates,
      updatedAt: nowIso(),
    };
    await setValue(`liveEvents/${id}`, updated);
    return updated;
  }

  async deleteLiveEvent(id: string): Promise<void> {
    const existing = await this.getLiveEvent(id);
    if (!existing) throw new Error("Live event not found");
    await this.removeItem("liveEvents", id);
  }

  async getLiveEventRegistrations(eventId: string): Promise<string[]> {
    const registrations = await getValue<string[]>(`liveEventRegistrations/${eventId}`);
    return Array.isArray(registrations) ? registrations : [];
  }

  async registerForLiveEvent(eventId: string, userId: string): Promise<{ attendeeCount: number; registered: boolean; attendees: string[] }> {
    const existing = await this.getLiveEventRegistrations(eventId);
    if (existing.includes(userId)) {
      return { attendeeCount: existing.length, registered: true, attendees: existing };
    }

    const attendees = [...existing, userId];
    await setValue(`liveEventRegistrations/${eventId}`, attendees);
    return { attendeeCount: attendees.length, registered: false, attendees };
  }

  async getRecentActivities(limit = 10): Promise<Activity[]> {
    const activities = await this.listItems<Activity>("activities");
    return activities
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, limit);
  }

  async createFeedPost(post: any): Promise<any> {
    const id = post.id || createFirebaseId();
    const feedPost = {
      ...post,
      id,
      createdAt: post.createdAt || nowIso(),
      likeCount: 0,
      likedByUserIds: [],
      commentCount: 0,
      shares: 0,
    };
    return this.saveItem<any>("feedPosts", id, feedPost);
  }

  async toggleFeedLike(postId: string, userId: string): Promise<any> {
    const existing = (await this.getItem<any>("feedPosts", postId)) || {
      id: postId,
      likeCount: 0,
      likedByUserIds: [],
      commentCount: 0,
      shares: 0,
    };

    const likedByUserIds = Array.isArray(existing.likedByUserIds) ? existing.likedByUserIds : [];
    const alreadyLiked = likedByUserIds.includes(userId);
    const nextLikedByUserIds = alreadyLiked
      ? likedByUserIds.filter((id) => id !== userId)
      : [...likedByUserIds, userId];

    const updated = {
      ...existing,
      likedByUserIds: nextLikedByUserIds,
      likeCount: nextLikedByUserIds.length,
      liked: !alreadyLiked,
      updatedAt: nowIso(),
    };

    await setValue(`feedPosts/${postId}`, updated);
    return updated;
  }

  async getFeedComments(postId: string): Promise<any[]> {
    const comments = await this.listItems<any>("feedComments");
    const filtered = comments
      .filter((comment) => comment.postId === postId)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return Promise.all(
      filtered.map(async (comment) => {
        const author = await this.getUser(comment.authorId);
        return {
          ...comment,
          author: {
            id: author?.id,
            name: author?.fullName || author?.name || "Unknown",
            avatar: getInitials(author?.fullName || author?.name),
            title: author?.role || "Member",
            university: author?.affiliation || "ScholarScape",
          },
          timestamp: formatRelativeTime(comment.createdAt),
        };
      }),
    );
  }

  async createFeedComment(postId: string, comment: any): Promise<any> {
    const id = comment.id || createFirebaseId();
    const feedComment = {
      ...comment,
      id,
      postId,
      createdAt: comment.createdAt || nowIso(),
    };

    await this.saveItem<any>("feedComments", id, feedComment);

    const existingPost = (await this.getItem<any>("feedPosts", postId)) || {
      id: postId,
      likeCount: 0,
      likedByUserIds: [],
      commentCount: 0,
      shares: 0,
    };

    const updatedPost = {
      ...existingPost,
      commentCount: (existingPost.commentCount || 0) + 1,
      updatedAt: nowIso(),
    };

    await setValue(`feedPosts/${postId}`, updatedPost);
    return feedComment;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = insertActivity.id || createFirebaseId();
    const activity: any = {
      ...insertActivity,
      createdAt: nowIso(),
    };
    return this.saveItem<Activity>("activities", id, activity);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const existing = await this.getProject(id);
    if (!existing) throw new Error("Project not found");
    const updated = {
      ...existing,
      ...updates,
      updatedAt: nowIso(),
    };
    await setValue(`projects/${id}`, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    const existing = await this.getProject(id);
    if (!existing) throw new Error("Project not found");
    await this.removeItem("projects", id);
  }

  async getOpportunity(id: string): Promise<Opportunity | undefined> {
    return this.getItem<Opportunity>("opportunities", id);
  }

  async getOpportunities(filters?: { studentId?: string; status?: string }): Promise<Opportunity[]> {
    let opportunities = await this.listItems<Opportunity>("opportunities");
    if (filters?.studentId) {
      opportunities = opportunities.filter((opportunity) => opportunity.studentId === filters.studentId);
    }
    if (filters?.status) {
      opportunities = opportunities.filter((opportunity) => opportunity.status === filters.status);
    }
    return opportunities.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async createOpportunity(insertOpportunity: InsertOpportunity): Promise<Opportunity> {
    const id = insertOpportunity.id || createFirebaseId();
    const opportunity: any = {
      ...insertOpportunity,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return this.saveItem<Opportunity>("opportunities", id, opportunity);
  }

  async updateOpportunity(id: string, updates: Partial<Opportunity>): Promise<Opportunity> {
    const existing = await this.getOpportunity(id);
    if (!existing) throw new Error("Opportunity not found");
    const updated = {
      ...existing,
      ...updates,
      updatedAt: nowIso(),
    };
    await setValue(`opportunities/${id}`, updated);
    return updated;
  }

  async deleteOpportunity(id: string): Promise<void> {
    const existing = await this.getOpportunity(id);
    if (!existing) throw new Error("Opportunity not found");
    await this.removeItem("opportunities", id);
  }

  async getApplication(id: string): Promise<Application | undefined> {
    return this.getItem<Application>("applications", id);
  }

  async getApplications(filters?: { projectId?: string; userId?: string }): Promise<Application[]> {
    let applications = await this.listItems<Application>("applications");
    if (filters?.projectId) {
      applications = applications.filter((application) => application.projectId === filters.projectId);
    }
    if (filters?.userId) {
      applications = applications.filter((application) => application.userId === filters.userId);
    }
    return applications.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const id = insertApplication.id || createFirebaseId();
    const application: any = {
      ...insertApplication,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return this.saveItem<Application>("applications", id, application);
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application> {
    const existing = await this.getApplication(id);
    if (!existing) throw new Error("Application not found");
    const updated = {
      ...existing,
      ...updates,
      updatedAt: nowIso(),
    };
    await setValue(`applications/${id}`, updated);
    return updated;
  }

  async getMessages(filters: { senderId?: string; receiverId?: string; projectId?: string }): Promise<Message[]> {
    let messages = await this.listItems<Message>("messages");
    if (filters.senderId && filters.receiverId) {
      messages = messages.filter(
        (message) =>
          (message.senderId === filters.senderId && message.receiverId === filters.receiverId) ||
          (message.senderId === filters.receiverId && message.receiverId === filters.senderId),
      );
    } else if (filters.senderId) {
      messages = messages.filter((message) => message.senderId === filters.senderId);
    } else if (filters.receiverId) {
      messages = messages.filter((message) => message.receiverId === filters.receiverId);
    }
    if (filters.projectId) {
      messages = messages.filter((message) => message.projectId === filters.projectId);
    }
    return messages.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = insertMessage.id || createFirebaseId();
    const message: any = {
      ...insertMessage,
      createdAt: nowIso(),
    };
    return this.saveItem<Message>("messages", id, message);
  }

  async markMessageAsRead(id: string): Promise<void> {
    const existing = await this.getItem<Message>("messages", id);
    if (!existing) throw new Error("Message not found");
    await setValue(`messages/${id}`, { ...existing, readAt: nowIso() });
  }

  async getGrants(filters?: { region?: string; tags?: string[] }): Promise<Grant[]> {
    let grants = await this.listItems<Grant>("grants");
    if (filters?.region) {
      grants = grants.filter((grant) => grant.region === filters.region);
    }
    if (filters?.tags?.length) {
      grants = grants.filter((grant) => {
        const grantTags = grant.tags || [];
        return filters.tags!.some((tag) => grantTags.includes(tag));
      });
    }
    return grants.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async createGrant(insertGrant: InsertGrant): Promise<Grant> {
    const id = insertGrant.id || createFirebaseId();
    const grant: any = {
      ...insertGrant,
      createdAt: nowIso(),
    };
    return this.saveItem<Grant>("grants", id, grant);
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    let notifications = await this.listItems<Notification>("notifications");
    notifications = notifications.filter((notification) => notification.userId === userId);
    return notifications.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = insertNotification.id || createFirebaseId();
    const notification: any = {
      ...insertNotification,
      createdAt: nowIso(),
    };
    return this.saveItem<Notification>("notifications", id, notification);
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const existing = await this.getItem<Notification>("notifications", id);
    if (!existing) throw new Error("Notification not found");
    await setValue(`notifications/${id}`, { ...existing, readAt: nowIso() });
  }

  async getUsersByRole(role: string): Promise<User[]> {
    let users = await this.listItems<User>("users");
    return users.filter((user) => user.role === role);
  }

  async getApplicationsForProject(projectId: string): Promise<(Application & { user: User; project: Project })[]> {
    const applications = await this.getApplications({ projectId });
    return await Promise.all(
      applications.map(async (application) => {
        const user = (await this.getUser(application.userId)) as User;
        const project = (await this.getProject(application.projectId)) as Project;
        return { ...application, user, project };
      }),
    );
  }

  async getApplicationsForUser(userId: string): Promise<(Application & { user: User; project: Project })[]> {
    const applications = await this.getApplications({ userId });
    return await Promise.all(
      applications.map(async (application) => {
        const user = (await this.getUser(application.userId)) as User;
        const project = (await this.getProject(application.projectId)) as Project;
        return { ...application, user, project };
      }),
    );
  }

  async getApplicationsForProjectOwner(ownerId: string): Promise<(Application & { user: User; project: Project })[]> {
    const ownedProjects = await this.getProjects({ ownerId });
    const projectIdSet = new Set(ownedProjects.map((project) => project.id));
    const applications = (await this.listItems<Application>("applications")).filter((application) =>
      projectIdSet.has(application.projectId),
    );
    const users = await this.listItems<User>("users");
    const userMap = new Map(users.map((user) => [user.id, user]));
    const projectMap = new Map(ownedProjects.map((project) => [project.id, project]));

    return applications
      .map((application) => {
        const user = userMap.get(application.userId);
        const project = projectMap.get(application.projectId);
        if (!user || !project) return null;
        return { ...application, user, project };
      })
      .filter((item): item is Application & { user: User; project: Project } => item !== null)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async updateApplicationStatus(applicationId: string, status: string, reviewNotes?: string): Promise<Application> {
    const existing = await this.getApplication(applicationId);
    if (!existing) throw new Error("Application not found");
    const updated: any = {
      ...existing,
      status,
      updatedAt: nowIso(),
      reviewedAt: nowIso(),
    };
    if (reviewNotes !== undefined) {
      updated.reviewNotes = reviewNotes;
    }
    await setValue(`applications/${applicationId}`, updated);
    return updated;
  }

  async getApplicationComments(applicationId: string): Promise<any[]> {
    const comments = await this.listItems<any>("applicationComments");
    const filtered = comments.filter((comment) => comment.applicationId === applicationId);
    const users = await this.listItems<User>("users");
    const userMap = new Map(users.map((user) => [user.id, user]));

    return filtered
      .map((comment) => ({
        ...comment,
        user: userMap.get(comment.userId),
      }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async createApplicationComment(comment: any): Promise<any> {
    const id = createFirebaseId();
    const commentToSave = { ...comment, createdAt: nowIso() };
    return this.saveItem<any>("applicationComments", id, commentToSave);
  }

  async createProjectChat(projectId: string, ownerId: string): Promise<ProjectChat> {
    const id = createFirebaseId();
    const chat: any = {
      projectId,
      name: "General",
      description: "Project collaboration channel",
      createdAt: nowIso(),
    };
    const savedChat = await this.saveItem<ProjectChat>("projectChats", id, chat);
    await this.addChatMember(savedChat.id, ownerId, "owner");
    return savedChat;
  }

  async getProjectChat(projectId: string): Promise<ProjectChat | undefined> {
    const chats = await queryValuesByChild<ProjectChat>("projectChats", "projectId", projectId);
    return chats[0];
  }

  async addChatMember(chatId: string, userId: string, role: string = "member"): Promise<ProjectChatMember> {
    const id = createFirebaseId();
    const membership: any = {
      chatId,
      userId,
      role,
      joinedAt: nowIso(),
    };
    return this.saveItem<ProjectChatMember>("projectChatMembers", id, membership);
  }

  async getChatMembers(chatId: string): Promise<(ProjectChatMember & { user: User })[]> {
    const members = (await this.listItems<ProjectChatMember>("projectChatMembers")).filter(
      (member) => member.chatId === chatId,
    );
    const users = await this.listItems<User>("users");
    const userMap = new Map(users.map((user) => [user.id, user]));

    return members
      .map((member) => ({ ...member, user: userMap.get(member.userId) as User }))
      .sort((a, b) => (a.joinedAt || "").localeCompare(b.joinedAt || ""));
  }

  async getChatMessages(chatId: string, limit: number = 100): Promise<(ProjectChatMessage & { sender: User })[]> {
    const messages = (await this.listItems<ProjectChatMessage>("projectChatMessages")).filter(
      (message) => message.chatId === chatId,
    );
    const users = await this.listItems<User>("users");
    const userMap = new Map(users.map((user) => [user.id, user]));

    return messages
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
      .slice(-limit)
      .map((message) => ({ ...message, sender: userMap.get(message.senderId) as User }));
  }

  async createChatMessage(message: InsertProjectChatMessage): Promise<ProjectChatMessage> {
    const id = message.id || createFirebaseId();
    const storedMessage: any = {
      ...message,
      createdAt: nowIso(),
    };
    return this.saveItem<ProjectChatMessage>("projectChatMessages", id, storedMessage);
  }

  async shareProject(share: InsertProjectShare): Promise<ProjectShare> {
    const id = share.id || createFirebaseId();
    const storedShare: any = {
      ...share,
      createdAt: nowIso(),
    };
    return this.saveItem<ProjectShare>("projectShares", id, storedShare);
  }

  async getProjectShares(userId: string): Promise<(ProjectShare & { project: Project; sharedBy: User })[]> {
    const shares = (await this.listItems<ProjectShare>("projectShares")).filter(
      (share) => share.sharedWithId === userId,
    );
    const projects = await this.listItems<Project>("projects");
    const users = await this.listItems<User>("users");
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const userMap = new Map(users.map((user) => [user.id, user]));

    return shares
      .map((share) => ({
        ...share,
        project: projectMap.get(share.projectId) as Project,
        sharedBy: userMap.get(share.sharedById) as User,
      }))
      .filter((item) => item.project && item.sharedBy)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async updateShareStatus(shareId: string, status: string): Promise<ProjectShare> {
    const existing = await this.getItem<ProjectShare>("projectShares", shareId);
    if (!existing) throw new Error("Project share not found");
    const updated = { ...existing, status };
    await setValue(`projectShares/${shareId}`, updated);
    return updated;
  }

  async getUserInterests(userId: string): Promise<UserInterests | undefined> {
    return this.queryItemByChild<UserInterests>("userInterests", "userId", userId);
  }

  // Connections
  async createConnectionRequest(request: { fromUserId: string; toUserId: string; message?: string }): Promise<any> {
    const id = createFirebaseId();
    const record: any = { ...request, status: 'pending', createdAt: nowIso() };
    return this.saveItem<any>('connections', id, record);
  }

  async getConnectionRequest(id: string): Promise<any | undefined> {
    return this.getItem<any>('connections', id);
  }

  async updateConnectionRequest(id: string, updates: Partial<any>): Promise<any> {
    const existing = await this.getConnectionRequest(id);
    if (!existing) throw new Error('Connection request not found');
    const updated = { ...existing, ...updates, updatedAt: nowIso() };
    await setValue(`connections/${id}`, updated);
    return updated;
  }

  async getConnectionsForUser(userId: string): Promise<any[]> {
    const all = await this.listItems<any>('connections');
    return all.filter((c) => (c.fromUserId === userId || c.toUserId === userId) && c.status === 'accepted');
  }

  async getConnectionRequestsForUser(userId: string): Promise<any[]> {
    const all = await this.listItems<any>('connections');
    return all.filter((c) => c.toUserId === userId && c.status === 'pending');
  }

  async updateUserInterests(userId: string, interests: InsertUserInterests): Promise<UserInterests> {
    const existing = await this.getUserInterests(userId);
    if (existing) {
      const updated = { ...existing, ...interests, updatedAt: nowIso() };
      await setValue(`userInterests/${existing.id}`, updated);
      return updated;
    }

    const id = createFirebaseId();
    const newInterests: any = {
      ...interests,
      userId,
      updatedAt: nowIso(),
    };
    return this.saveItem<UserInterests>("userInterests", id, newInterests);
  }

  async getMatchingUsers(projectId: string, limit: number = 10): Promise<(User & { matchScore: number })[]> {
    const project = await this.getProject(projectId);
    if (!project) return [];

    const projectKeywords = this.extractKeywords(
      `${project.title} ${project.description} ${project.requiredSkills?.join(" ") ?? ""}`,
    );

    const students = await this.getUsersByRole("student");
    const interests = await this.listItems<UserInterests>("userInterests");
    const interestsMap = new Map(interests.map((item) => [item.userId, item]));

    const matchedUsers = students
      .map((student) => {
        const interest = interestsMap.get(student.id);
        let matchScore = 0;
        if (interest) {
          const userKeywords = [...(interest.keywords || []), ...(interest.researchAreas || [])];
          const commonKeywords = projectKeywords.filter((keyword) =>
            userKeywords.some(
              (userKeyword) =>
                userKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
                keyword.toLowerCase().includes(userKeyword.toLowerCase()),
            ),
          );
          matchScore = (commonKeywords.length / Math.max(projectKeywords.length, 1)) * 100;
        }

        if (project.requiredSkills?.length && student.skills?.length) {
          const skillMatches = project.requiredSkills.filter((skill) =>
            student.skills.some((userSkill) => userSkill.toLowerCase().includes(skill.toLowerCase())),
          );
          matchScore += (skillMatches.length / project.requiredSkills.length) * 50;
        }

        return { ...student, matchScore: Math.min(matchScore, 100) };
      })
      .filter((user) => user.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return matchedUsers;
  }

  async getRecommendedProjects(userId: string, limit: number = 10): Promise<(Project & { matchScore: number })[]> {
    const interests = await this.getUserInterests(userId);
    const user = await this.getUser(userId);
    if (!user) return [];

    const userKeywords = [
      ...(interests?.keywords || []),
      ...(interests?.researchAreas || []),
      ...(user.skills || []),
    ];

    const projects = (await this.getProjects({ status: "active" })).filter((project) => !!project);

    const matchedProjects = projects
      .map((project) => {
        const projectKeywords = this.extractKeywords(
          `${project.title} ${project.description} ${project.requiredSkills?.join(" ") ?? ""}`,
        );

        const commonKeywords = userKeywords.filter((userKeyword) =>
          projectKeywords.some(
            (projectKeyword) =>
              projectKeyword.toLowerCase().includes(userKeyword.toLowerCase()) ||
              userKeyword.toLowerCase().includes(projectKeyword.toLowerCase()),
          ),
        );

        const matchScore = Math.min((commonKeywords.length / Math.max(userKeywords.length, 1)) * 100, 100);
        return { ...project, matchScore };
      })
      .filter((project) => project.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return matchedProjects;
  }

  private extractKeywords(text: string): string[] {
    const commonWords = ["the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !commonWords.includes(word))
      .filter((word, index, arr) => arr.indexOf(word) === index)
      .slice(0, 20);
  }

  async getFeed(userId: string): Promise<any[]> {
    try {
      const [projects, events, feedPosts] = await Promise.all([
        this.getProjects({ status: "active" }),
        this.listItems<any>("events"),
        this.listItems<any>("feedPosts"),
      ]);

      const postMetaMap = new Map(feedPosts.map((post) => [post.id, post]));
      const feedItems: any[] = [];

      for (const project of projects.slice(0, 5)) {
        const owner = await this.getUser(project.ownerId);
        const postMeta = postMetaMap.get(`project-${project.id}`);
        const likedByUserIds = Array.isArray(postMeta?.likedByUserIds) ? postMeta.likedByUserIds : [];
        feedItems.push({
          id: `project-${project.id}`,
          type: "project",
          createdAt: project.createdAt || nowIso(),
          author: {
            name: owner?.fullName || owner?.name || "Unknown",
            title: owner?.role || "Researcher",
            avatar: getInitials(owner?.fullName || owner?.name),
            university: owner?.affiliation || "ScholarScape",
          },
          timestamp: formatRelativeTime(project.createdAt),
          content: `${project.title}: ${project.description || "New research opportunity"}`,
          image: project.posterUrl || null,
          likes: Number(postMeta?.likeCount || Math.floor(Math.random() * 500)),
          comments: Number(postMeta?.commentCount || Math.floor(Math.random() * 50)),
          shares: Number(postMeta?.shares || Math.floor(Math.random() * 30)),
          liked: likedByUserIds.includes(userId),
        });
      }

      for (const event of events.slice(0, 3)) {
        const owner = await this.getUser(event.ownerId);
        const postMeta = postMetaMap.get(`event-${event.id}`);
        const likedByUserIds = Array.isArray(postMeta?.likedByUserIds) ? postMeta.likedByUserIds : [];
        feedItems.push({
          id: `event-${event.id}`,
          type: "event",
          createdAt: event.createdAt || nowIso(),
          author: {
            name: owner?.fullName || owner?.name || "Unknown",
            title: owner?.role || "Organizer",
            avatar: getInitials(owner?.fullName || owner?.name),
            university: owner?.affiliation || "ScholarScape",
          },
          timestamp: formatRelativeTime(event.createdAt),
          content: `New event: ${event.title} on ${event.date}`,
          image: null,
          likes: Number(postMeta?.likeCount || Math.floor(Math.random() * 300)),
          comments: Number(postMeta?.commentCount || Math.floor(Math.random() * 40)),
          shares: Number(postMeta?.shares || Math.floor(Math.random() * 20)),
          liked: likedByUserIds.includes(userId),
        });
      }

      for (const post of feedPosts.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))) {
        const author = await this.getUser(post.authorId);
        const likedByUserIds = Array.isArray(post.likedByUserIds) ? post.likedByUserIds : [];
        feedItems.push({
          id: post.id,
          type: "post",
          createdAt: post.createdAt || nowIso(),
          author: {
            name: author?.fullName || author?.name || "Unknown",
            title: author?.role || "Member",
            avatar: getInitials(author?.fullName || author?.name),
            university: author?.affiliation || "ScholarScape",
          },
          timestamp: formatRelativeTime(post.createdAt),
          content: post.content,
          image: post.image || null,
          likes: Number(post.likeCount || likedByUserIds.length || 0),
          comments: Number(post.commentCount || 0),
          shares: Number(post.shares || 0),
          liked: likedByUserIds.includes(userId),
        });
      }

      return feedItems.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    } catch (error) {
      console.error("Error fetching feed:", error);
      return [];
    }
  }
}
