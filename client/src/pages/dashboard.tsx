import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import ProjectCard from "@/components/project-card";
import ProjectListing from "@/components/project-listing";
import ResearcherCard from "@/components/researcher-card";
import MessageWidget from "@/components/message-widget";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Search, Plus } from "lucide-react";
import type { Project, User, Grant } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedField, setSelectedField] = useState("");

  // Fetch user's projects
  const { data: userProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects", { owner: user?.id }],
  });

  // Fetch all available projects
  const { data: availableProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
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
  const { data: applications = [] } = useQuery({
    queryKey: ["/api/applications", { userId: user?.id }],
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const unreadNotifications = notifications.filter((n: any) => !n.readAt);

  // Filter projects based on search and field
  const filteredProjects = availableProjects.filter((project: any) => {
    const matchesSearch = !searchQuery || 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesField = !selectedField || 
      project.requiredSkills?.some((skill: string) => skill.toLowerCase().includes(selectedField.toLowerCase()));
    
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
                      {applications.length}
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
                    <Button className="bg-primary text-white hover:bg-blue-700" data-testid="button-new-project">
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
                        <Button className="bg-primary text-white hover:bg-blue-700" data-testid="button-create-first-project">
                          Create Project
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="applications" className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">My Applications</h2>
                  
                  <div className="space-y-4">
                    {applications.map((application: any) => (
                      <Card key={application.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {application.project?.title}
                              </h3>
                              <p className="text-gray-600 mb-3">{application.coverLetter}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Applied: {new Date(application.createdAt).toLocaleDateString()}</span>
                                {application.matchScore && (
                                  <span>Match: {Math.round(Number(application.matchScore) * 100)}%</span>
                                )}
                              </div>
                            </div>
                            <Badge 
                              variant={
                                application.status === "accepted" ? "default" : 
                                application.status === "rejected" ? "destructive" : 
                                "secondary"
                              }
                            >
                              {application.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {applications.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No applications yet</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="browse" className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Available Research Projects</h2>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search projects..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-projects"
                        />
                      </div>
                      <Select value={selectedField} onValueChange={setSelectedField}>
                        <SelectTrigger className="w-40" data-testid="select-field">
                          <SelectValue placeholder="All Fields" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Fields</SelectItem>
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
                    {filteredProjects.map((project: any) => (
                      <ProjectListing key={project.id} project={project} />
                    ))}
                    
                    {filteredProjects.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No projects found matching your criteria</p>
                      </div>
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
    </div>
  );
}
