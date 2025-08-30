import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import ProjectCard from "@/components/project-card";
import ProjectListing from "@/components/project-listing";
import ResearcherCard from "@/components/researcher-card";
import MessageWidget from "@/components/message-widget";
import { ProjectRecommendations } from "@/components/recommendations";
import CreateProjectModal from "@/components/create-project-modal";
import OpportunityCard from "@/components/opportunity-card";
import CreateOpportunityModal from "@/components/create-opportunity-modal";
import { ApplicantProfileModal } from "@/components/applicant-profile-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Search, Plus, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { Project, User, Grant } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [browseType, setBrowseType] = useState<"projects" | "opportunities">("projects");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateOpportunity, setShowCreateOpportunity] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<User | null>(null);

  // Application status update mutation
  const updateApplicationStatusMutation = useMutation({
    mutationFn: async ({ applicationId, status, reviewNotes }: { applicationId: string; status: string; reviewNotes?: string }) => {
      const response = await apiRequest("PUT", `/api/applications/${applicationId}/status`, { status, reviewNotes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    }
  });

  // Fetch user's projects
  const { data: userProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects", "owner", user?.id],
    queryFn: () => fetch(`/api/projects?owner=${user?.id}`, {
      credentials: "include"
    }).then(res => res.json()),
    enabled: !!user,
  });

  // Fetch user's opportunities
  const { data: userOpportunities = [], isLoading: isLoadingOpportunities, error: opportunitiesError } = useQuery<any[]>({
    queryKey: ["/api/opportunities", "student", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/opportunities?studentId=${user?.id}`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }
      return response.json();
    },
    enabled: !!user,
    retry: 1,
  });

  // Fetch all available projects
  const { data: availableProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch all available opportunities
  const { data: availableOpportunities = [] } = useQuery<any[]>({
    queryKey: ["/api/opportunities"],
    queryFn: async () => {
      const response = await fetch("/api/opportunities", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }
      return response.json();
    },
    retry: 1,
  });

  // Fetch researchers
  const { data: researchers = [] } = useQuery<User[]>({
    queryKey: ["/api/researchers"],
  });

  // Fetch grants
  const { data: grants = [] } = useQuery<Grant[]>({
    queryKey: ["/api/grants"],
  });

  // Fetch user's applications
  // Get applications sent by the current user
  const { data: sentApplications = [] } = useQuery<any[]>({
    queryKey: ["/api/applications"],
    enabled: !!user,
  });

  // Get applications received to projects owned by the current user
  const { data: receivedApplications = [] } = useQuery<any[]>({
    queryKey: ["/api/applications", "received"],
    queryFn: () => fetch("/api/applications?type=received", {
      credentials: "include"
    }).then(res => res.json()),
    enabled: !!user && user.role === "professor",
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
  });

  const unreadNotifications = notifications.filter((n: any) => !n.readAt);

  // Filter projects based on search and field
  const filteredProjects = availableProjects.filter((project: any) => {
    const matchesSearch = !searchQuery || 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesField = !selectedField || selectedField === "all" || 
      project.requiredSkills?.some((skill: string) => skill.toLowerCase().includes(selectedField.toLowerCase()));
    
    return matchesSearch && matchesField;
  });

  const filteredOpportunities = availableOpportunities.filter((opportunity: any) => {
    const matchesSearch = !searchQuery || 
      opportunity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opportunity.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesField = !selectedField || selectedField === "all" || 
      opportunity.interestedFields?.some((field: string) => field.toLowerCase().includes(selectedField.toLowerCase()));
    
    return matchesSearch && matchesField;
  });

  return (
    <div className="bg-surface min-h-screen">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Projects</span>
                    <span className="text-lg font-semibold text-primary" data-testid="stat-active-projects">
                      {userProjects.filter(p => p.status === "active").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Applications</span>
                    <span className="text-lg font-semibold text-accent" data-testid="stat-applications">
                      {user?.role === "professor" ? receivedApplications.length : sentApplications.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rating</span>
                    <div className="flex items-center">
                      <span className="text-lg font-semibold text-yellow-500" data-testid="stat-rating">
                        {user?.rating || "0.0"}
                      </span>
                      <span className="text-yellow-400 ml-1">⭐</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {unreadNotifications.slice(0, 3).map((notification: any) => (
                    <div key={notification.id} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500">{notification.content}</p>
                      </div>
                    </div>
                  ))}
                  {unreadNotifications.length === 0 && (
                    <p className="text-sm text-gray-500">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="projects" className="space-y-6">
              <Card>
                <div className="border-b border-gray-200">
                  <TabsList className="flex space-x-8 px-6 bg-transparent h-auto">
                    <TabsTrigger 
                      value="projects" 
                      className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-1"
                      data-testid="tab-projects"
                    >
                      My Projects
                    </TabsTrigger>
                    <TabsTrigger 
                      value="applications" 
                      className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-1"
                      data-testid="tab-applications"
                    >
                      Applications
                    </TabsTrigger>
                    <TabsTrigger 
                      value="browse" 
                      className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-1"
                      data-testid="tab-browse"
                    >
                      Browse Projects
                    </TabsTrigger>
                    <TabsTrigger 
                      value="opportunities" 
                      className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-1"
                      data-testid="tab-opportunities"
                    >
                      My Opportunities
                    </TabsTrigger>
                    <TabsTrigger 
                      value="grants" 
                      className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-1"
                      data-testid="tab-grants"
                    >
                      Grants
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="projects" className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">My Research Projects</h2>
                    <Button 
                      className="bg-primary text-white hover:bg-blue-700" 
                      onClick={() => setShowCreateProject(true)}
                      data-testid="button-new-project"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Project
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {userProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                    
                    {userProjects.length === 0 && (
                      <div className="col-span-2 text-center py-12">
                        <div className="text-gray-400 mb-4">
                          <Plus className="w-12 h-12 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                        <p className="text-gray-600 mb-4">Start your first research project</p>
                        <Button 
                          className="bg-primary text-white hover:bg-blue-700" 
                          onClick={() => setShowCreateProject(true)}
                          data-testid="button-create-first-project"
                        >
                          Create Project
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="opportunities" className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">My Opportunities</h2>
                    <Button 
                      className="bg-blue-600 text-white hover:bg-blue-700" 
                      onClick={() => setShowCreateOpportunity(true)}
                      data-testid="button-new-opportunity"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Post Opportunity
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {userOpportunities.map((opportunity) => (
                      <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                    ))}
                    
                    {userOpportunities.length === 0 && (
                      <div className="col-span-2 text-center py-12">
                        <div className="text-gray-400 mb-4">
                          <Plus className="w-12 h-12 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No opportunities posted yet</h3>
                        <p className="text-gray-600 mb-4">Let professors know what research opportunities you're looking for</p>
                        <Button 
                          className="bg-blue-600 text-white hover:bg-blue-700" 
                          onClick={() => setShowCreateOpportunity(true)}
                          data-testid="button-create-first-opportunity"
                        >
                          Post Opportunity
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="applications" className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    {user?.role === "professor" ? "Applications Received" : "My Applications"}
                  </h2>
                  
                  
                  <div className="space-y-4">
                    {(user?.role === "professor" ? receivedApplications : sentApplications).map((application: any) => {
                      // Handle both direct application objects and nested structures
                      const actualApplication = application.applications || application;
                      const applicantInfo = application.user || application.applicant;
                      const projectInfo = application.project;
                      
                      
                      return (
                        <Card key={actualApplication.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                  {projectInfo?.title || "Unknown Project"}
                                </h3>
                                {user?.role === "professor" && applicantInfo && (
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-sm text-gray-600">Applicant:</span>
                                    <button
                                      onClick={() => setSelectedApplicant(applicantInfo)}
                                      className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                                      data-testid="button-view-applicant"
                                    >
                                      {applicantInfo.name} ({applicantInfo.username})
                                    </button>
                                  </div>
                                )}
                                <p className="text-gray-600 mb-3">{actualApplication.coverLetter}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>Applied: {new Date(actualApplication.createdAt).toLocaleDateString()}</span>
                                  {actualApplication.matchScore && (
                                    <span>Match: {Math.round(Number(actualApplication.matchScore) * 100)}%</span>
                                  )}
                                  {actualApplication.reviewedAt && (
                                    <span>Reviewed: {new Date(actualApplication.reviewedAt).toLocaleDateString()}</span>
                                  )}
                                </div>
                                {actualApplication.reviewNotes && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                    <p className="text-sm text-gray-600">
                                      <strong>Review Notes:</strong> {actualApplication.reviewNotes}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end space-y-2">
                                <Badge 
                                  variant={
                                    actualApplication.status === "approved" ? "default" : 
                                    actualApplication.status === "rejected" ? "destructive" :
                                    actualApplication.status === "under_review" ? "secondary" :
                                    "outline"
                                  }
                                  className="flex items-center space-x-1"
                                >
                                  {actualApplication.status === "submitted" && <Clock className="w-3 h-3" />}
                                  {actualApplication.status === "under_review" && <Loader2 className="w-3 h-3 animate-spin" />}
                                  {actualApplication.status === "approved" && <CheckCircle className="w-3 h-3" />}
                                  {actualApplication.status === "rejected" && <XCircle className="w-3 h-3" />}
                                  <span>{actualApplication.status.replace('_', ' ')}</span>
                                </Badge>
                                
                                {/* Status update buttons for professors */}
                                {user?.role === "professor" && actualApplication.status !== "approved" && actualApplication.status !== "rejected" && (
                                  <div className="flex space-x-2 mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateApplicationStatusMutation.mutate({
                                        applicationId: actualApplication.id,
                                        status: "under_review"
                                      })}
                                      disabled={updateApplicationStatusMutation.isPending}
                                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                    >
                                      Review
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateApplicationStatusMutation.mutate({
                                        applicationId: actualApplication.id,
                                        status: "approved",
                                        reviewNotes: "Application approved"
                                      })}
                                      disabled={updateApplicationStatusMutation.isPending}
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateApplicationStatusMutation.mutate({
                                        applicationId: actualApplication.id,
                                        status: "rejected",
                                        reviewNotes: "Application rejected"
                                      })}
                                      disabled={updateApplicationStatusMutation.isPending}
                                      className="text-red-600 border-red-600 hover:bg-red-50"
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {(user?.role === "professor" ? receivedApplications : sentApplications).length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-gray-500">
                          {user?.role === "professor" ? "No applications received yet" : "No applications yet"}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="browse" className="p-6">
                  {/* Show AI Recommendations for Students */}
                  {user?.role === "student" && (
                    <div className="mb-8">
                      <ProjectRecommendations />
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-xl font-semibold text-gray-900">Browse</h2>
                      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setBrowseType("projects")}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            browseType === "projects" 
                              ? "bg-white text-gray-900 shadow-sm" 
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                          data-testid="button-browse-projects"
                        >
                          Projects
                        </button>
                        <button
                          onClick={() => setBrowseType("opportunities")}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            browseType === "opportunities" 
                              ? "bg-white text-gray-900 shadow-sm" 
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                          data-testid="button-browse-opportunities"
                        >
                          Student Opportunities
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder={`Search ${browseType}...`}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          data-testid="input-search"
                        />
                      </div>
                      <Select value={selectedField} onValueChange={setSelectedField}>
                        <SelectTrigger className="w-40" data-testid="select-field">
                          <SelectValue placeholder="All Fields" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Fields</SelectItem>
                          <SelectItem value="Computer Science">Computer Science</SelectItem>
                          <SelectItem value="Biology">Biology</SelectItem>
                          <SelectItem value="Physics">Physics</SelectItem>
                          <SelectItem value="Chemistry">Chemistry</SelectItem>
                          <SelectItem value="Machine Learning">Machine Learning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {browseType === "projects" ? (
                      <>
                        {filteredProjects.map((project: any) => (
                          <ProjectListing key={project.id} project={project} />
                        ))}
                        
                        {filteredProjects.length === 0 && (
                          <div className="text-center py-12">
                            <p className="text-gray-500">No projects found matching your criteria</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {filteredOpportunities.map((opportunity: any) => (
                          <div key={opportunity.id} className="mb-4">
                            <OpportunityCard opportunity={opportunity} />
                          </div>
                        ))}
                        
                        {filteredOpportunities.length === 0 && (
                          <div className="text-center py-12">
                            <p className="text-gray-500">No student opportunities found matching your criteria</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="grants" className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Grants</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {grants.map((grant) => (
                      <Card key={grant.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{grant.title}</h3>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-600">{grant.region}</span>
                            <Badge variant="outline">${grant.amount?.toLocaleString()}</Badge>
                          </div>
                          {grant.deadline && (
                            <p className="text-sm text-gray-500 mb-3">
                              Deadline: {new Date(grant.deadline).toLocaleDateString()}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {grant.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          {grant.url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={grant.url} target="_blank" rel="noopener noreferrer">
                                Learn More
                              </a>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                    {grants.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No grants available</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Card>
            </Tabs>

            {/* Featured Researchers */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Featured Researchers</h2>
                  <a href="/researchers" className="text-primary hover:text-blue-700 text-sm font-medium">
                    View All →
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {researchers.slice(0, 3).map((researcher) => (
                    <ResearcherCard key={researcher.id} researcher={researcher} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <MessageWidget />
      
      {/* Create Project Modal */}
      <CreateProjectModal 
        isOpen={showCreateProject} 
        onClose={() => setShowCreateProject(false)} 
      />

      {/* Create Opportunity Modal */}
      <CreateOpportunityModal
        isOpen={showCreateOpportunity}
        onClose={() => setShowCreateOpportunity(false)}
      />

      {/* Applicant Profile Modal */}
      {selectedApplicant && (
        <ApplicantProfileModal
          applicant={selectedApplicant}
          isOpen={!!selectedApplicant}
          onClose={() => setSelectedApplicant(null)}
        />
      )}
    </div>
  );
}
