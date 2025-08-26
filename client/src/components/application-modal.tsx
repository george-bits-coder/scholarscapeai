import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Project } from "@shared/schema";

const applicationSchema = z.object({
  coverLetter: z.string().min(50, "Cover letter must be at least 50 characters"),
  proposalUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type ApplicationData = z.infer<typeof applicationSchema>;

interface ApplicationModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export default function ApplicationModal({ project, isOpen, onClose }: ApplicationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ApplicationData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      coverLetter: "",
      proposalUrl: "",
    },
  });

  const applicationMutation = useMutation({
    mutationFn: async (data: ApplicationData) => {
      const response = await apiRequest("POST", "/api/applications", {
        ...data,
        projectId: project.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Application submitted",
        description: "Your application has been sent to the project owner.",
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Application failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ApplicationData) => {
    applicationMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="application-modal">
        <DialogHeader>
          <DialogTitle>Apply to Project</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-2" data-testid="project-title">
            {project.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2" data-testid="project-description">
            {project.description}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="coverLetter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Letter *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain why you're interested in this project and how your skills match the requirements..."
                      className="min-h-32"
                      data-testid="input-cover-letter"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proposalUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposal/Portfolio URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://your-portfolio.com/project-proposal"
                      data-testid="input-proposal-url"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={applicationMutation.isPending}
                data-testid="button-submit-application"
              >
                {applicationMutation.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
