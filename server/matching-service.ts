import OpenAI from "openai";
import { storage } from "./storage";
import type { User, Project } from "@shared/schema";

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

if (!openai) {
  console.warn(
    "OPENAI_API_KEY is not configured. AI matching and embeddings will be disabled.",
  );
}

export class MatchingService {
  private ensureOpenAI(): OpenAI {
    if (!openai) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Set OPENAI_API_KEY in your environment to enable AI matching.",
      );
    }
    return openai;
  }

  private openAIEnabled(): boolean {
    return Boolean(openai);
  }

  // Generate embedding for user profile
  async generateUserEmbedding(user: User): Promise<number[]> {
    if (!this.openAIEnabled()) {
      throw new Error("OpenAI is not configured.");
    }

    const profileText = this.createUserProfileText(user);
    
    try {
      const response = await this.ensureOpenAI().embeddings.create({
        model: "text-embedding-3-small",
        input: profileText,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating user embedding:", error);
      throw error;
    }
  }

  // Generate embedding for project
  async generateProjectEmbedding(project: Project): Promise<number[]> {
    if (!this.openAIEnabled()) {
      throw new Error("OpenAI is not configured.");
    }

    const projectText = this.createProjectText(project);
    
    try {
      const response = await this.ensureOpenAI().embeddings.create({
        model: "text-embedding-3-small",
        input: projectText,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating project embedding:", error);
      throw error;
    }
  }

  // Calculate cosine similarity between two vectors
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same length");
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Create comprehensive text representation of user profile
  private createUserProfileText(user: User): string {
    const parts = [];
    
    if (user.role) parts.push(`Role: ${user.role}`);
    if (user.academicLevel) parts.push(`Academic Level: ${user.academicLevel}`);
    if (user.affiliation) parts.push(`Affiliation: ${user.affiliation}`);
    if (user.bio) parts.push(`Bio: ${user.bio}`);
    
    if (user.skills && Array.isArray(user.skills) && user.skills.length > 0) {
      parts.push(`Skills: ${user.skills.join(", ")}`);
    }
    
    if (user.researchInterests && Array.isArray(user.researchInterests) && user.researchInterests.length > 0) {
      parts.push(`Research Interests: ${user.researchInterests.join(", ")}`);
    }
    
    if (user.publications && Array.isArray(user.publications) && user.publications.length > 0) {
      parts.push(`Publications: ${user.publications.join(". ")}`);
    }

    return parts.join(". ");
  }

  // Create comprehensive text representation of project
  private createProjectText(project: Project): string {
    const parts = [];
    
    parts.push(`Title: ${project.title}`);
    parts.push(`Description: ${project.description}`);
    
    if (project.requiredSkills && Array.isArray(project.requiredSkills) && project.requiredSkills.length > 0) {
      parts.push(`Required Skills: ${project.requiredSkills.join(", ")}`);
    }
    
    if (project.timeline) parts.push(`Timeline: ${project.timeline}`);
    if (project.location) parts.push(`Location: ${project.location}`);
    if (project.remote) parts.push("Remote work available");
    if (project.compensation) parts.push(`Compensation: $${project.compensation}`);

    return parts.join(". ");
  }

  // Find best project matches for a student
  async findProjectMatchesForStudent(studentId: string, limit: number = 10): Promise<Array<{project: Project; matchScore: number; owner?: User}>> {
    const student = await storage.getUser(studentId);
    if (!student) throw new Error("Student not found");

    // Generate or get student's profile embedding
    let studentEmbedding = student.profileEmbedding as number[] | null;
    if (!studentEmbedding) {
      studentEmbedding = await this.generateUserEmbedding(student);
      await storage.updateUser(studentId, { profileEmbedding: studentEmbedding });
    }

    // Get all active projects
    const projects = await storage.getProjects({ status: "active" });
    const matches: Array<{project: Project; matchScore: number; owner?: User}> = [];

    for (const project of projects) {
      // Generate or get project embedding
      let projectEmbedding = project.projectEmbedding as number[] | null;
      if (!projectEmbedding) {
        projectEmbedding = await this.generateProjectEmbedding(project);
        await storage.updateProject(project.id, { projectEmbedding });
      }

      // Calculate similarity score
      const matchScore = this.calculateCosineSimilarity(studentEmbedding, projectEmbedding);
      
      // Get project owner info
      const owner = await storage.getUser(project.ownerId);
      
      matches.push({
        project,
        matchScore: Math.round(matchScore * 100), // Convert to percentage
        owner
      });
    }

    // Sort by match score and return top matches
    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  // Find best student matches for a professor's project
  async findStudentMatchesForProject(projectId: string, limit: number = 10): Promise<Array<{student: User; matchScore: number}>> {
    const project = await storage.getProject(projectId);
    if (!project) throw new Error("Project not found");

    // Generate or get project embedding
    let projectEmbedding = project.projectEmbedding as number[] | null;
    if (!projectEmbedding) {
      projectEmbedding = await this.generateProjectEmbedding(project);
      await storage.updateProject(projectId, { projectEmbedding });
    }

    // Get all students (users with role 'student')
    const allUsers = await storage.getProjects(); // We'll need to add a method to get users by role
    // For now, let's filter by role in the service layer
    const students = await this.getUsersByRole("student");
    const matches: Array<{student: User; matchScore: number}> = [];

    for (const student of students) {
      // Generate or get student's profile embedding
      let studentEmbedding = student.profileEmbedding as number[] | null;
      if (!studentEmbedding) {
        studentEmbedding = await this.generateUserEmbedding(student);
        await storage.updateUser(student.id, { profileEmbedding: studentEmbedding });
      }

      // Calculate similarity score
      const matchScore = this.calculateCosineSimilarity(projectEmbedding, studentEmbedding);
      
      matches.push({
        student,
        matchScore: Math.round(matchScore * 100) // Convert to percentage
      });
    }

    // Sort by match score and return top matches
    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  // Helper method to get users by role
  private async getUsersByRole(role: string): Promise<User[]> {
    return await storage.getUsersByRole(role);
  }

  // Update user profile embedding when profile changes
  async updateUserEmbedding(userId: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found");

    const embedding = await this.generateUserEmbedding(user);
    await storage.updateUser(userId, { profileEmbedding: embedding });
  }

  // Update project embedding when project changes
  async updateProjectEmbedding(projectId: string): Promise<void> {
    const project = await storage.getProject(projectId);
    if (!project) throw new Error("Project not found");

    const embedding = await this.generateProjectEmbedding(project);
    await storage.updateProject(projectId, { projectEmbedding: embedding });
  }
}

export const matchingService = new MatchingService();