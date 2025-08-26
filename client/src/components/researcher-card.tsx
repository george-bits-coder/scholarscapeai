import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

interface ResearcherCardProps {
  researcher: User;
}

export default function ResearcherCard({ researcher }: ResearcherCardProps) {
  const [, setLocation] = useLocation();

  const handleViewProfile = () => {
    setLocation(`/researchers/${researcher.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid="researcher-card">
      <CardContent className="p-6 text-center">
        <Avatar className="w-20 h-20 mx-auto mb-4">
          <AvatarImage src={researcher.profileImage} />
          <AvatarFallback className="text-lg">
            {researcher.name?.split(" ").map(n => n[0]).join("")}
          </AvatarFallback>
        </Avatar>

        <h3 className="text-lg font-semibold text-gray-900 mb-1" data-testid="researcher-name">
          {researcher.name}
        </h3>
        
        <p className="text-sm text-gray-600 mb-2" data-testid="researcher-affiliation">
          {researcher.affiliation}
        </p>

        <div className="flex items-center justify-center mb-3">
          <span className="text-yellow-400 text-sm">{researcher.rating}</span>
          <span className="text-yellow-400 ml-1">⭐</span>
          <span className="text-gray-500 text-sm ml-2">verified</span>
        </div>

        {/* Skills */}
        {researcher.skills && researcher.skills.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mb-4">
            {researcher.skills.slice(0, 3).map((skill) => (
              <Badge 
                key={skill} 
                variant="secondary" 
                className="text-xs"
                data-testid="skill-badge"
              >
                {skill}
              </Badge>
            ))}
            {researcher.skills.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{researcher.skills.length - 3}
              </Badge>
            )}
          </div>
        )}

        <p className="text-xs text-gray-600 mb-4 line-clamp-2" data-testid="researcher-bio">
          {researcher.bio || "Researcher profile"}
        </p>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleViewProfile}
          data-testid="button-view-profile"
        >
          View Profile
        </Button>
      </CardContent>
    </Card>
  );
}
