import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertOpportunitySchema } from "@shared/schema";

// Form schema extending the base opportunity schema
const opportunityFormSchema = insertOpportunitySchema.extend({
  skillsInput: z.string().optional(),
  interestsInput: z.string().optional(),
});

type OpportunityFormData = z.infer<typeof opportunityFormSchema>;

interface CreateOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateOpportunityModal({ isOpen, onClose }: CreateOpportunityModalProps) {
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      title: "",
      description: "",
      availableHours: 10,
      preferredCompensation: 0,
      availability: "",
      remote: true,
      preferredLocation: "",
      academicLevel: "undergraduate",
      status: "active",
    },
  });

  const createOpportunityMutation = useMutation({
    mutationFn: async (data: OpportunityFormData) => {
      const opportunityData = {
        ...data,
        skills,
        interests,
      };
      delete opportunityData.skillsInput;
      delete opportunityData.interestsInput;
      
      const response = await apiRequest("POST", "/api/opportunities", opportunityData);
      if (!response.ok) {
        throw new Error("Failed to create opportunity");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Opportunity posted successfully!",
        description: "Your research opportunity post is now live and visible to professors.",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to post opportunity",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    reset();
    setSkills([]);
    setInterests([]);
    setSkillInput("");
    setInterestInput("");
    onClose();
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      const newSkills = [...skills, skillInput.trim()];
      setSkills(newSkills);
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const addInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      const newInterests = [...interests, interestInput.trim()];
      setInterests(newInterests);
      setInterestInput("");
    }
  };

  const removeInterest = (interestToRemove: string) => {
    setInterests(interests.filter(interest => interest !== interestToRemove));
  };

  const onSubmit = (data: OpportunityFormData) => {
    createOpportunityMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="create-opportunity-modal">
        <DialogHeader>
          <DialogTitle>Post Research Opportunity</DialogTitle>
          <p className="text-sm text-gray-600">
            Let professors know what kind of research opportunity you're looking for
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Opportunity Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Seeking Machine Learning Research Position"
              {...register("title")}
              data-testid="input-title"
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what you're looking for, your goals, and what you can contribute..."
              rows={4}
              {...register("description")}
              data-testid="input-description"
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Academic Level */}
            <div>
              <Label htmlFor="academicLevel">Academic Level *</Label>
              <Select 
                onValueChange={(value) => setValue("academicLevel", value)}
                defaultValue="undergraduate"
              >
                <SelectTrigger data-testid="select-academic-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="undergraduate">Undergraduate</SelectItem>
                  <SelectItem value="graduate">Graduate Student</SelectItem>
                  <SelectItem value="postdoc">Postdoctoral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Available Hours */}
            <div>
              <Label htmlFor="availableHours">Hours Available Per Week</Label>
              <Input
                id="availableHours"
                type="number"
                placeholder="10"
                {...register("availableHours", { valueAsNumber: true })}
                data-testid="input-available-hours"
              />
            </div>
          </div>

          {/* Skills */}
          <div>
            <Label>Skills I Have</Label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add a skill and press Enter"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                data-testid="input-skills"
              />
              <Button type="button" onClick={addSkill} variant="outline" size="sm">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                  {skill}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-600"
                    onClick={() => removeSkill(skill)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Research Interests */}
          <div>
            <Label>Research Areas of Interest</Label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add research interest and press Enter"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInterest();
                  }
                }}
                data-testid="input-interests"
              />
              <Button type="button" onClick={addInterest} variant="outline" size="sm">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Badge key={interest} variant="outline" className="flex items-center gap-1">
                  {interest}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-600"
                    onClick={() => removeInterest(interest)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Preferred Compensation */}
            <div>
              <Label htmlFor="preferredCompensation">Preferred Compensation ($/hour)</Label>
              <Input
                id="preferredCompensation"
                type="number"
                placeholder="0 for unpaid"
                {...register("preferredCompensation", { valueAsNumber: true })}
                data-testid="input-compensation"
              />
            </div>

            {/* Availability */}
            <div>
              <Label htmlFor="availability">Availability</Label>
              <Input
                id="availability"
                placeholder="e.g., Spring 2024, Summer internship"
                {...register("availability")}
                data-testid="input-availability"
              />
            </div>
          </div>

          {/* Remote Work */}
          <div className="flex items-center space-x-2">
            <Switch
              id="remote"
              checked={watch("remote") ?? true}
              onCheckedChange={(checked) => setValue("remote", checked)}
              data-testid="switch-remote"
            />
            <Label htmlFor="remote">Open to remote opportunities</Label>
          </div>

          {/* Preferred Location */}
          {!watch("remote") && (
            <div>
              <Label htmlFor="preferredLocation">Preferred Location</Label>
              <Input
                id="preferredLocation"
                placeholder="City, State or University"
                {...register("preferredLocation")}
                data-testid="input-location"
              />
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createOpportunityMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-submit"
            >
              {createOpportunityMutation.isPending ? "Posting..." : "Post Opportunity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}