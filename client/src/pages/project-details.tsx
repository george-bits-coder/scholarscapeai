import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, FileImage, ExternalLink } from "lucide-react";
import type { Project } from "@shared/schema";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    enabled: !!id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-accent/10 text-accent";
      case "in_review":
        return "bg-yellow-100 text-yellow-800";
      case "planning":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProgress = (status: string) => {
    switch (status) {
      case "planning":
        return 15;
      case "active":
        return 65;
      case "in_review":
        return 90;
      case "completed":
        return 100;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-6">The project you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/dashboard")}
          className="mb-4"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="project-detail-title">
              {project.title}
            </h1>
            <Badge 
              className={getStatusColor(project.status)}
              data-testid="project-detail-status"
            >
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Project Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed" data-testid="project-detail-description">
                {project.description}
              </p>
            </CardContent>
          </Card>

          {/* Project Flyer */}
          {project.flyerUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileImage className="w-5 h-5 mr-2" />
                  Project Flyer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Check if it's a PDF or image */}
                  {project.flyerUrl.toLowerCase().includes('.pdf') ? (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <FileImage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">PDF Document</p>
                      <Button 
                        onClick={() => window.open(project.flyerUrl!, '_blank')}
                        data-testid="button-view-flyer-pdf"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View PDF Flyer
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <img 
                        src={project.flyerUrl!} 
                        alt="Project flyer"
                        className="w-full rounded-lg shadow-md max-h-96 object-contain bg-gray-50"
                        data-testid="project-flyer-image"
                      />
                      <div className="text-center">
                        <Button 
                          variant="outline"
                          onClick={() => window.open(project.flyerUrl!, '_blank')}
                          data-testid="button-view-flyer-fullsize"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Full Size
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Required Skills */}
          {project.requiredSkills && project.requiredSkills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.requiredSkills.map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="secondary"
                      data-testid="skill-detail-badge"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.compensation && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Compensation</label>
                  <p className="text-gray-900" data-testid="project-compensation">
                    ${project.compensation}
                  </p>
                </div>
              )}
              
              {project.timeline && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Timeline</label>
                  <p className="text-gray-900" data-testid="project-detail-timeline">
                    {project.timeline}
                  </p>
                </div>
              )}
              
              {project.location && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="text-gray-900" data-testid="project-location">
                    {project.location}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-500">Remote Work</label>
                <p className="text-gray-900" data-testid="project-remote">
                  {project.remote ? "Available" : "Not Available"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Project Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={getProgress(project.status)} className="h-3" />
              <p className="text-sm text-gray-600" data-testid="project-detail-progress">
                {getProgress(project.status)}% complete
              </p>
              <p className="text-xs text-gray-500">
                Status: {project.status.replace('_', ' ')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}