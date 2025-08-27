import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FlyerUploader } from "@/components/flyer-uploader";

const projectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  field: z.string().min(1, "Field is required"),
  requiredSkills: z.string().min(1, "At least one skill is required"),
  timeline: z.string().min(1, "Timeline is required"),
  compensation: z.string().optional(),
  location: z.string().optional(),
  remote: z.boolean().default(false),
  status: z.enum(["planning", "active", "in_review", "completed"]).default("planning"),
  flyerUrl: z.string().optional(),
});

type ProjectData = z.infer<typeof projectSchema>;

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [flyerUrl, setFlyerUrl] = useState<string>("");

  const form = useForm<ProjectData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      description: "",
      field: "",
      requiredSkills: "",
      timeline: "",
      compensation: "",
      location: "",
      remote: false,
      status: "planning",
      flyerUrl: "",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectData) => {
      // Convert skills string to array and compensation to number
      const processedData = {
        ...data,
        requiredSkills: data.requiredSkills.split(',').map(skill => skill.trim()).filter(Boolean),
        compensation: data.compensation ? parseInt(data.compensation) : null,
      };
      
      const response = await apiRequest("POST", "/api/projects", processedData);
      const project = await response.json();
      
      // If there's a flyer URL, update the project with it
      if (flyerUrl) {
        await apiRequest("PUT", `/api/projects/${project.id}/flyer`, { flyerUrl });
      }
      
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project created successfully",
        description: "Your research project has been posted and is now visible to potential collaborators.",
      });
      onClose();
      form.reset();
      setFlyerUrl("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectData) => {
    createProjectMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="create-project-modal">
        <DialogHeader>
          <DialogTitle>Create New Research Project</DialogTitle>
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
                      placeholder="Provide a detailed description of your research project, objectives, methodology, and expected outcomes..."
                      rows={4}
                      data-testid="textarea-project-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field */}
            <FormField
              control={form.control}
              name="field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Research Field *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-project-field">
                        <SelectValue placeholder="Select research field" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Machine Learning">Machine Learning</SelectItem>
                      <SelectItem value="Artificial Intelligence">Artificial Intelligence</SelectItem>
                      <SelectItem value="Data Science">Data Science</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Psychology">Psychology</SelectItem>
                      <SelectItem value="Economics">Economics</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Required Skills */}
            <FormField
              control={form.control}
              name="requiredSkills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Skills *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Python, Machine Learning, TensorFlow, Statistics, Data Analysis..."
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

            {/* Timeline */}
            <FormField
              control={form.control}
              name="timeline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Timeline *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-project-timeline">
                        <SelectValue placeholder="Select project duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1-3 months">1-3 months</SelectItem>
                      <SelectItem value="3-6 months">3-6 months</SelectItem>
                      <SelectItem value="6-12 months">6-12 months</SelectItem>
                      <SelectItem value="1+ years">1+ years</SelectItem>
                      <SelectItem value="Ongoing">Ongoing</SelectItem>
                    </SelectContent>
                  </Select>
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
                    Monthly compensation in USD (leave blank if unpaid)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Remote Work */}
            <FormField
              control={form.control}
              name="remote"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Remote Work</FormLabel>
                    <FormDescription>
                      Can this project be done remotely?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-remote"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Location (if not remote) */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location {!form.watch("remote") && "*"}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Stanford University, Palo Alto, CA"
                      data-testid="input-location"
                      disabled={form.watch("remote")}
                      {...field}
                    />
                  </FormControl>
                  {!form.watch("remote") && (
                    <FormDescription>
                      Where will this project take place?
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project Status */}
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

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-project"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createProjectMutation.isPending}
                data-testid="button-submit-project"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}