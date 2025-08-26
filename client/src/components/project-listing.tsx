import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import ApplicationModal from "./application-modal";
import { useLocation } from "wouter";

interface ProjectListingProps {
  project: any; // Project with owner data
}

export default function ProjectListing({ project }: ProjectListingProps) {
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [, setLocation] = useLocation();

  const handleViewProject = () => {
    setLocation(`/projects/${project.id}`);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow" data-testid="project-listing">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 
                  className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-primary"
                  onClick={handleViewProject}
                  data-testid="project-title"
                >
                  {project.title}
                </h3>
                {project.compensation && (
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    ${project.compensation.toLocaleString()}
                  </Badge>
                )}
              </div>

              {/* Owner Info */}
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={project.owner?.profileImage} />
                    <AvatarFallback>
                      {project.owner?.name?.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900" data-testid="owner-name">
                      {project.owner?.name}
                    </p>
                    <p className="text-xs text-gray-500" data-testid="owner-affiliation">
                      {project.owner?.affiliation} • {project.owner?.rating} ⭐
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500" data-testid="project-timeline">
                  {project.timeline}
                </span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500" data-testid="project-location">
                  {project.remote ? "Remote" : project.location}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2" data-testid="project-description">
                {project.description}
              </p>

              {/* Skills */}
              {project.requiredSkills && project.requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {project.requiredSkills.map((skill: string) => (
                    <Badge 
                      key={skill} 
                      variant="secondary" 
                      className="text-xs"
                      data-testid="skill-badge"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="ml-6 flex flex-col space-y-2">
              <Button 
                className="bg-primary text-white hover:bg-blue-700"
                onClick={() => setShowApplicationModal(true)}
                data-testid="button-apply"
              >
                Apply
              </Button>
              <Button 
                variant="outline"
                data-testid="button-save"
              >
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ApplicationModal
        project={project}
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
      />
    </>
  );
}
