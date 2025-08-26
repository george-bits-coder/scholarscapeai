import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import Header from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ApplicationModal from "@/components/application-modal";
import { useState } from "react";
import { MapPin, Calendar, DollarSign, Users, ArrowLeft } from "lucide-react";

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const { data: project, isLoading } = useQuery<any>({
    queryKey: ["/api/projects", params?.id],
  });

  if (isLoading) {
    return (
      <div className="bg-surface min-h-screen">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-surface min-h-screen">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
            <p className="text-gray-600">The project you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")}
          className="mb-4 flex items-center space-x-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Button>
        
        <Card>
          <CardContent className="p-8">
            {/* Project Header */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="project-title">
                    {project.title}
                  </h1>
                  
                  {/* Owner Info */}
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar>
                      <AvatarImage src={project.owner?.profileImage} />
                      <AvatarFallback>
                        {project.owner?.name?.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{project.owner?.name}</p>
                      <p className="text-sm text-gray-500">{project.owner?.affiliation}</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-yellow-400 mr-1">⭐</span>
                      <span className="text-sm font-medium">{project.owner?.rating}</span>
                    </div>
                  </div>

                  {/* Project Meta */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {project.compensation && (
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        ${project.compensation.toLocaleString()}
                      </div>
                    )}
                    {project.timeline && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {project.timeline}
                      </div>
                    )}
                    {project.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {project.remote ? "Remote" : project.location}
                      </div>
                    )}
                    {project.applications && (
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {project.applications.length} applications
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-6 flex flex-col space-y-2">
                  <Button 
                    className="bg-primary text-white hover:bg-blue-700"
                    onClick={() => setShowApplicationModal(true)}
                    data-testid="button-apply"
                  >
                    Apply to Project
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // TODO: Implement save project functionality
                      alert('Project saved!');
                    }}
                    data-testid="button-save"
                  >
                    Save Project
                  </Button>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-4">
                <Badge 
                  variant={
                    project.status === "active" ? "default" : 
                    project.status === "completed" ? "secondary" : 
                    "outline"
                  }
                  data-testid="project-status"
                >
                  {project.status}
                </Badge>
              </div>
            </div>

            {/* Project Description */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Description</h2>
              <p className="text-gray-700 leading-relaxed" data-testid="project-description">
                {project.description}
              </p>
            </div>

            {/* Required Skills */}
            {project.requiredSkills && project.requiredSkills.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {project.requiredSkills.map((skill: string) => (
                    <Badge key={skill} variant="secondary" data-testid="skill-badge">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Project Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Timeline</h3>
                <p className="text-gray-600">{project.timeline || "To be determined"}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Work Type</h3>
                <p className="text-gray-600">{project.remote ? "Remote" : "On-site"}</p>
              </div>
              
              {project.compensation && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Compensation</h3>
                  <p className="text-gray-600">${project.compensation.toLocaleString()}</p>
                </div>
              )}
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Created</h3>
                <p className="text-gray-600">
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ApplicationModal
        project={project}
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
      />
    </div>
  );
}
