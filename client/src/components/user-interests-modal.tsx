import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Sparkles, BookOpen, Lightbulb } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserInterests } from "@shared/schema";

interface UserInterestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserInterestsModal({ isOpen, onClose }: UserInterestsModalProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [researchAreas, setResearchAreas] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [newResearchArea, setNewResearchArea] = useState("");
  const { toast } = useToast();

  // Get current user interests
  const { data: interests, isLoading } = useQuery<UserInterests>({
    queryKey: ["/api/user-interests"],
    enabled: isOpen,
  });

  // Update user interests mutation
  const updateInterestsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/user-interests", {
        keywords,
        researchAreas
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Interests Updated",
        description: "Your interests have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-interests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations/projects"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Interests",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Load existing interests when modal opens
  useEffect(() => {
    if (interests) {
      setKeywords(interests.keywords || []);
      setResearchAreas(interests.researchAreas || []);
    }
  }, [interests]);

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords(prev => [...prev, trimmed]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(prev => prev.filter(k => k !== keyword));
  };

  const addResearchArea = () => {
    const trimmed = newResearchArea.trim();
    if (trimmed && !researchAreas.includes(trimmed)) {
      setResearchAreas(prev => [...prev, trimmed]);
      setNewResearchArea("");
    }
  };

  const removeResearchArea = (area: string) => {
    setResearchAreas(prev => prev.filter(a => a !== area));
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleResearchAreaKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addResearchArea();
    }
  };

  const predefinedKeywords = [
    "Machine Learning", "Artificial Intelligence", "Data Science", "Web Development",
    "Mobile Development", "Cybersecurity", "Blockchain", "Cloud Computing",
    "Computer Vision", "Natural Language Processing", "Robotics", "IoT"
  ];

  const predefinedResearchAreas = [
    "Computer Science", "Biology", "Chemistry", "Physics", "Mathematics",
    "Psychology", "Economics", "Environmental Science", "Medicine", "Engineering",
    "Social Sciences", "Education", "Business", "Literature", "History"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Manage Your Interests
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Tell us about your interests to get better project recommendations and matching
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading your interests...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Keywords Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <Label className="text-base font-medium">Technical Keywords & Skills</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Add keywords related to your technical skills and interests
              </p>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add a keyword (e.g., Python, React, Machine Learning)"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={handleKeywordKeyPress}
                  className="flex-1"
                  data-testid="input-new-keyword"
                />
                <Button onClick={addKeyword} size="sm" data-testid="button-add-keyword">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Current Keywords */}
              {keywords.length > 0 && (
                <ScrollArea className="max-h-24">
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {keyword}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeKeyword(keyword)}
                          data-testid={`remove-keyword-${index}`}
                        />
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Suggested Keywords */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Suggested Keywords:</Label>
                <div className="flex flex-wrap gap-2">
                  {predefinedKeywords
                    .filter(keyword => !keywords.includes(keyword))
                    .slice(0, 8)
                    .map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => {
                          setKeywords(prev => [...prev, keyword]);
                        }}
                        data-testid={`suggested-keyword-${keyword}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {keyword}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>

            {/* Research Areas Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-green-600" />
                <Label className="text-base font-medium">Research Areas</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Add academic fields and research areas you're interested in
              </p>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add a research area (e.g., Computer Science, Biology)"
                  value={newResearchArea}
                  onChange={(e) => setNewResearchArea(e.target.value)}
                  onKeyDown={handleResearchAreaKeyPress}
                  className="flex-1"
                  data-testid="input-new-research-area"
                />
                <Button onClick={addResearchArea} size="sm" data-testid="button-add-research-area">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Current Research Areas */}
              {researchAreas.length > 0 && (
                <ScrollArea className="max-h-24">
                  <div className="flex flex-wrap gap-2">
                    {researchAreas.map((area, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {area}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeResearchArea(area)}
                          data-testid={`remove-research-area-${index}`}
                        />
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Suggested Research Areas */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Suggested Research Areas:</Label>
                <div className="flex flex-wrap gap-2">
                  {predefinedResearchAreas
                    .filter(area => !researchAreas.includes(area))
                    .slice(0, 8)
                    .map((area) => (
                      <Badge
                        key={area}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => {
                          setResearchAreas(prev => [...prev, area]);
                        }}
                        data-testid={`suggested-research-area-${area}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {area}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => updateInterestsMutation.mutate()}
                disabled={updateInterestsMutation.isPending}
                data-testid="button-save-interests"
              >
                {updateInterestsMutation.isPending ? "Saving..." : "Save Interests"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}