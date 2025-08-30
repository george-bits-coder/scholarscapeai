import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Header from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Mail } from "lucide-react";

export default function ResearcherProfile() {
  const [, params] = useRoute("/researchers/:id");

  const { data: researcher, isLoading } = useQuery<any>({
    queryKey: ["/api/researchers", params?.id],
  });

  if (isLoading) {
    return (
      <div className="bg-surface min-h-screen">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!researcher) {
    return (
      <div className="bg-surface min-h-screen">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Researcher Not Found</h1>
            <p className="text-gray-600">The researcher profile you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-8">
            {/* Profile Header */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-6">
              <div className="flex items-start space-x-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={researcher.profileImage} />
                  <AvatarFallback className="text-2xl">
                    {researcher.name?.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="researcher-name">
                    {researcher.name}
                  </h1>
                  
                  {researcher.affiliation && (
                    <div className="flex items-center text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span data-testid="researcher-affiliation">{researcher.affiliation}</span>
                    </div>
                  )}
                  
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 text-yellow-400 mr-1" />
                      <span className="font-semibold" data-testid="researcher-rating">
                        {researcher.rating}
                      </span>
                    </div>
                    
                    {researcher.verified && (
                      <Badge variant="default" data-testid="verified-badge">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button 
                  className="bg-primary text-white hover:bg-blue-700" 
                  onClick={() => {
                    // Create a new message thread with this researcher
                    window.location.href = `/messages?to=${researcher.id}`;
                  }}
                  data-testid="button-message"
                >
                  Send Message
                </Button>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/notifications', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          recipientId: researcher.id,
                          type: 'connection_request',
                          title: 'New Connection Request',
                          content: `Someone wants to connect with you!`
                        })
                      });
                      
                      if (response.ok) {
                        alert('Connection request sent successfully!');
                      } else {
                        alert('Failed to send connection request. Please try again.');
                      }
                    } catch (error) {
                      alert('Error sending connection request. Please try again.');
                    }
                  }}
                  data-testid="button-connect"
                >
                  Connect
                </Button>
              </div>
            </div>

            {/* Bio */}
            {researcher.bio && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed" data-testid="researcher-bio">
                  {researcher.bio}
                </p>
              </div>
            )}

            {/* Skills */}
            {researcher.skills && researcher.skills.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills & Expertise</h2>
                <div className="flex flex-wrap gap-2">
                  {researcher.skills.map((skill: string) => (
                    <Badge key={skill} variant="secondary" data-testid="skill-badge">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Publications */}
            {researcher.publications && researcher.publications.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Publications</h2>
                <div className="space-y-3">
                  {researcher.publications.map((publication: string, index: number) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-900 font-medium" data-testid="publication-title">
                        {publication}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-200 pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {researcher.publications?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Publications</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {researcher.rating}
                </div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {new Date().getFullYear() - new Date(researcher.createdAt).getFullYear()}+
                </div>
                <div className="text-sm text-gray-600">Years Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
