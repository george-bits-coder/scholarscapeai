import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FlyerUploader } from "./flyer-uploader";
import type { Project } from "@shared/schema";
import { useState } from "react";

const projectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  field: z.string().min(1, "Research field is required"),
  requiredSkills: z.string(),
  timeline: z.string(),
  compensation: z.string(),
  location: z.string(),
  remote: z.boolean(),
  status: z.enum(["planning", "active", "in_review", "completed"]),
});

type ProjectData = z.infer<typeof projectSchema>;

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProjectModal({ project, isOpen, onClose }: EditProjectModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [flyerUrl, setFlyerUrl] = useState(project.flyerUrl || "");

  const form = useForm<ProjectData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: project.title || "",
      description: project.description || "",
      field: "computer-science", // Default field - user can change
      requiredSkills: project.requiredSkills ? project.requiredSkills.join(", ") : "",
      timeline: project.timeline || "",
      compensation: project.compensation ? project.compensation.toString() : "",
      location: project.location || "",
      remote: project.remote || false,
      status: (project.status as "planning" | "active" | "in_review" | "completed") || "planning",
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: ProjectData) => {
      // Convert skills string to array and compensation to number
      const processedData = {
        ...data,
        requiredSkills: data.requiredSkills.split(',').map(skill => skill.trim()).filter(Boolean),
        compensation: data.compensation ? parseInt(data.compensation) : null,
      };
      
      const response = await apiRequest("PUT", `/api/projects/${project.id}`, processedData);
      const updatedProject = await response.json();
      
      // If there's a flyer URL, update the project with it
      if (flyerUrl && flyerUrl !== project.flyerUrl) {
        await apiRequest("PUT", `/api/projects/${project.id}/flyer`, { flyerUrl });
      }
      
      return updatedProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project updated successfully",
        description: "Your research project has been updated.",
      });
      onClose();
      form.reset();
      setFlyerUrl(project.flyerUrl || "");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectData) => {
    updateProjectMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="edit-project-modal">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., AI-Powered Climate Change Prediction Model"
                      data-testid="input-project-title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed description of your research project, objectives, and methodology..."
                      className="min-h-[100px]"
                      data-testid="input-project-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Research Field */}
              <FormField
                control={form.control}
                name="field"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Research Field *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-research-field">
                          <SelectValue placeholder="Select research field" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="computer-science">Computer Science</SelectItem>
                        <SelectItem value="biology">Biology</SelectItem>
                        <SelectItem value="chemistry">Chemistry</SelectItem>
                        <SelectItem value="physics">Physics</SelectItem>
                        <SelectItem value="psychology">Psychology</SelectItem>
                        <SelectItem value="neuroscience">Neuroscience</SelectItem>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="mathematics">Mathematics</SelectItem>
                        <SelectItem value="medicine">Medicine</SelectItem>
                        <SelectItem value="environmental-science">Environmental Science</SelectItem>
                        <SelectItem value="social-sciences">Social Sciences</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Required Skills */}
            <FormField
              control={form.control}
              name="requiredSkills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Skills</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Python, Machine Learning, Data Analysis, Statistics"
                      data-testid="input-required-skills"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Separate multiple skills with commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Timeline */}
              <FormField
                control={form.control}
                name="timeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeline</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 6 months, 1 year"
                        data-testid="input-timeline"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Compensation */}
              <FormField
                control={form.control}
                name="compensation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compensation (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 5000"
                        data-testid="input-compensation"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Monthly compensation in USD (leave blank if volunteer)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., New York, NY or University of Toronto"
                      data-testid="input-location"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Remote Work */}
            <FormField
              control={form.control}
              name="remote"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-remote"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Remote work available
                    </FormLabel>
                    <FormDescription>
                      Check if this project can be done remotely
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Project Flyer Upload */}
            <div className="border-t pt-4">
              <FlyerUploader
                onUpload={setFlyerUrl}
                currentFlyer={flyerUrl}
                className="w-full"
              />
              <FormDescription className="mt-2">
                Upload a flyer, poster, or detailed description to make your project more attractive to potential collaborators
              </FormDescription>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProjectMutation.isPending}
                data-testid="button-save-project"
              >
                {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}