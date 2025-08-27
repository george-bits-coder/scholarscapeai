import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, FileImage } from "lucide-react";
import EditProjectModal from "./edit-project-modal";
import type { Project } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isOwner = user?.id === project.ownerId;
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

  const handleCardClick = () => {
    if (isOwner) {
      setLocation(`/project/${project.id}`);
    }
  };

  return (
    <Card 
      className={`bg-gray-50 hover:shadow-md transition-shadow ${isOwner ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
      data-testid="project-card"
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid="project-title">
              {project.title}
            </h3>
            <Badge 
              className={getStatusColor(project.status)}
              data-testid="project-status"
            >
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  data-testid="button-project-menu"
                  onClick={(e) => e.stopPropagation()} // Prevent card click
                >
                  <MoreHorizontal className="w-5 h-5 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/project/${project.id}`);
                  }}
                  data-testid="menu-item-view"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditModal(true);
                  }}
                  data-testid="menu-item-edit"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement delete functionality
                    alert('Delete functionality coming soon!');
                  }}
                  className="text-red-600"
                  data-testid="menu-item-delete"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3" data-testid="project-description">
          {project.description}
        </p>

        {/* Skills */}
        {project.requiredSkills && project.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.requiredSkills.slice(0, 3).map((skill) => (
              <Badge 
                key={skill} 
                variant="secondary" 
                className="text-xs"
                data-testid="skill-badge"
              >
                {skill}
              </Badge>
            ))}
            {project.requiredSkills.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{project.requiredSkills.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Project Meta */}
        <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <span>Looking for collaborators</span>
            <span>•</span>
            <span>0 applications</span>
          </div>
          {project.timeline && (
            <span data-testid="project-timeline">{project.timeline}</span>
          )}
        </div>

        {/* Project Flyer */}
        {project.flyerUrl && (
          <div className="flex items-center space-x-2 mb-4 p-2 bg-blue-50 rounded-md">
            <FileImage className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">Project flyer attached</span>
            <Button
              variant="link"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(project.flyerUrl!, '_blank');
              }}
              className="p-0 h-auto text-blue-600"
              data-testid="button-view-flyer"
            >
              View
            </Button>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={getProgress(project.status)} className="h-2" />
          <p className="text-xs text-gray-500" data-testid="project-progress">
            {getProgress(project.status)}% complete
          </p>
        </div>
      </CardContent>
      
      {/* Edit Project Modal */}
      {showEditModal && (
        <EditProjectModal
          project={project}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </Card>
  );
}
