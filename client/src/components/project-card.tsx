import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal } from "lucide-react";
import type { Project } from "@shared/schema";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
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

  return (
    <Card className="bg-gray-50 hover:shadow-md transition-shadow" data-testid="project-card">
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
          <Button variant="ghost" size="icon" data-testid="button-project-menu">
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </Button>
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

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={getProgress(project.status)} className="h-2" />
          <p className="text-xs text-gray-500" data-testid="project-progress">
            {getProgress(project.status)}% complete
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
