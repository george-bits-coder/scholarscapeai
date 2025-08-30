import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Share2, Sparkles, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface ProjectShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

type MatchingUser = User & { matchScore: number };

export function ProjectShareModal({ isOpen, onClose, projectId, projectTitle }: ProjectShareModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Get matching users for this project
  const { data: matchingUsers = [], isLoading } = useQuery<MatchingUser[]>({
    queryKey: [`/api/projects/${projectId}/matching-users`],
    enabled: isOpen,
  });

  // Share project mutation
  const shareProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/share`, {
        userIds: selectedUsers,
        message: message.trim()
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Project Shared Successfully",
        description: `Shared with ${selectedUsers.length} users`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      onClose();
      setSelectedUsers([]);
      setMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Share Project",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = matchingUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getMatchColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-gray-500";
  };

  const getMatchLabel = (score: number) => {
    if (score >= 70) return "Excellent";
    if (score >= 40) return "Good";
    return "Basic";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Project: {projectTitle}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-6">
          <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-users"
            />
          </div>

          {/* AI Matching Info */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">AI-Powered Matching</span>
            </div>
            <p className="text-sm text-blue-700">
              Users are ranked by compatibility with your project based on their skills, interests, and research areas.
              Higher match scores indicate better alignment with your project requirements.
            </p>
          </div>

          {/* Matching Users */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recommended Users ({filteredUsers.length})
              </h3>
              {selectedUsers.length > 0 && (
                <Badge variant="secondary">
                  {selectedUsers.length} selected
                </Badge>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading matching users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No matching users found
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="cursor-pointer hover:bg-muted/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                            data-testid={`checkbox-user-${user.id}`}
                          />
                          
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium truncate">{user.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${getMatchColor(user.matchScore)}`}>
                                  {Math.round(user.matchScore)}%
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getMatchColor(user.matchScore)}`}
                                >
                                  {getMatchLabel(user.matchScore)} Match
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">{user.bio}</p>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Match Score:</span>
                                <Progress value={user.matchScore} className="flex-1 h-2" />
                              </div>
                              
                              {user.skills && user.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {user.skills.slice(0, 3).map((skill, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {user.skills.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{user.skills.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Personal Message (Optional)</label>
            <Textarea
              placeholder="Add a personal message to introduce your project..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              data-testid="textarea-share-message"
            />
          </div>

          </div>
        </ScrollArea>

        {/* Actions - Fixed at bottom */}
        <div className="border-t pt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => shareProjectMutation.mutate()}
            disabled={selectedUsers.length === 0 || shareProjectMutation.isPending}
            data-testid="button-share-project"
          >
            {shareProjectMutation.isPending ? "Sharing..." : `Share with ${selectedUsers.length} users`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}