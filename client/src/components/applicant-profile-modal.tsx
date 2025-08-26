import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Mail, MapPin, Calendar } from "lucide-react";
import type { User } from "@shared/schema";

interface ApplicantProfileModalProps {
  applicant: User;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicantProfileModal({ applicant, isOpen, onClose }: ApplicantProfileModalProps) {
  const handleDownloadCV = () => {
    if (applicant.cvUrl) {
      window.open(applicant.cvUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="applicant-profile-modal">
        <DialogHeader>
          <DialogTitle>Applicant Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-start space-x-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={applicant.profileImage || undefined} />
              <AvatarFallback className="text-lg">
                {applicant.name?.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900" data-testid="applicant-name">
                {applicant.name}
              </h2>
              <p className="text-lg text-gray-600" data-testid="applicant-role">
                {applicant.role} • {applicant.academicLevel}
              </p>
              
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                {applicant.affiliation && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span data-testid="applicant-affiliation">{applicant.affiliation}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(applicant.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-yellow-400">{applicant.rating}</span>
                <span className="text-yellow-400">⭐</span>
                {applicant.verified && (
                  <Badge variant="secondary" className="text-xs">
                    Verified
                  </Badge>
                )}
              </div>
            </div>

            {/* CV Download Button */}
            {applicant.cvUrl && (
              <Button 
                variant="outline" 
                onClick={handleDownloadCV}
                data-testid="button-download-cv"
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download CV</span>
              </Button>
            )}
          </div>

          {/* Bio Section */}
          {applicant.bio && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
              <p className="text-gray-700 leading-relaxed" data-testid="applicant-bio">
                {applicant.bio}
              </p>
            </div>
          )}

          {/* Research Interests */}
          {applicant.researchInterests && applicant.researchInterests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Research Interests</h3>
              <div className="flex flex-wrap gap-2">
                {applicant.researchInterests.map((interest, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-sm"
                    data-testid="research-interest"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {applicant.skills && applicant.skills.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {applicant.skills.map((skill, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-sm"
                    data-testid="skill-badge"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Publications */}
          {applicant.publications && applicant.publications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Publications</h3>
              <div className="space-y-2">
                {applicant.publications.map((publication, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-gray-50 rounded-lg"
                    data-testid="publication-item"
                  >
                    <p className="text-sm text-gray-700">{publication}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Section */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span data-testid="applicant-email">{applicant.email}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}