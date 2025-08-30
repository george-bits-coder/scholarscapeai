import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Users, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import ApplicationModal from "@/components/application-modal";

interface ProjectRecommendation {
  project: any;
  matchScore: number;
  owner?: any;
}

interface StudentRecommendation {
  student: any;
  matchScore: number;
}

export function ProjectRecommendations() {
  const { user } = useAuth();
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const { data: recommendations = [], isLoading } = useQuery<ProjectRecommendation[]>({
    queryKey: ["/api/recommendations/projects"],
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Project Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleApply = (project: any) => {
    setSelectedProject(project);
    setShowApplicationModal(true);
  };

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Project Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recommendations yet. Complete your profile to get AI-powered project matches!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Project Recommendations
            <Badge variant="secondary" className="ml-2">
              {recommendations.length} matches
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Projects matched using AI analysis of your skills and research interests
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map(({ project, matchScore, owner }) => (
              <div 
                key={project.id} 
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                data-testid={`recommendation-${project.id}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg" data-testid="project-title">
                        {project.title}
                      </h3>
                      <Badge 
                        variant={matchScore >= 80 ? "default" : matchScore >= 60 ? "secondary" : "outline"}
                        className="flex items-center gap-1"
                      >
                        <TrendingUp className="h-3 w-3" />
                        {matchScore}% match
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={owner?.profileImage || undefined} />
                        <AvatarFallback className="text-xs">
                          {owner?.name?.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600">{owner?.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {owner?.role || "Researcher"}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {project.description}
                    </p>

                    {project.requiredSkills && project.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.requiredSkills.slice(0, 4).map((skill: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {project.requiredSkills.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{project.requiredSkills.length - 4} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Compatibility Score</span>
                        <span>{matchScore}%</span>
                      </div>
                      <Progress value={matchScore} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {project.compensation && (
                          <span>${project.compensation.toLocaleString()}</span>
                        )}
                        {project.timeline && <span>{project.timeline}</span>}
                        {project.remote && <span>Remote OK</span>}
                      </div>
                      
                      <Button 
                        size="sm"
                        onClick={() => handleApply(project)}
                        data-testid={`button-apply-${project.id}`}
                      >
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedProject && (
        <ApplicationModal
          project={selectedProject}
          isOpen={showApplicationModal}
          onClose={() => {
            setShowApplicationModal(false);
            setSelectedProject(null);
          }}
        />
      )}
    </>
  );
}

export function StudentRecommendations({ projectId }: { projectId: string }) {
  const { user } = useAuth();

  const { data: recommendations = [], isLoading } = useQuery<StudentRecommendation[]>({
    queryKey: ["/api/recommendations/students", projectId],
    enabled: user?.role === "professor" || user?.role === "researcher",
  });

  if (!user || (user.role !== "professor" && user.role !== "researcher")) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Recommended Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Recommended Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No student matches found for this project yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Recommended Students
          <Badge variant="secondary" className="ml-2">
            {recommendations.length} matches
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Students with skills and interests that match your project requirements
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map(({ student, matchScore }) => (
            <div 
              key={student.id} 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              data-testid={`student-recommendation-${student.id}`}
            >
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={student.profileImage || undefined} />
                  <AvatarFallback>
                    {student.name?.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{student.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {student.academicLevel || student.role}
                    </Badge>
                    <Badge 
                      variant={matchScore >= 80 ? "default" : matchScore >= 60 ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {matchScore}% match
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {student.affiliation}
                  </p>
                  {student.researchInterests && student.researchInterests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.researchInterests.slice(0, 3).map((interest: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-gray-500">Match Score</div>
                  <Progress value={matchScore} className="h-1 w-16" />
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  data-testid={`button-contact-${student.id}`}
                >
                  Contact
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}