import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Edit, Trash2, Eye, User, Clock, DollarSign, MapPin } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Opportunity } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface OpportunityCardProps {
  opportunity: Opportunity & { student: any };
}

export default function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isOwner = user?.id === opportunity.studentId;

  const deleteOpportunityMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/opportunities/${opportunity.id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete opportunity");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Opportunity deleted successfully",
        description: "Your opportunity post has been permanently deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete opportunity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "filled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleCardClick = () => {
    // Navigate to opportunity details page (to be implemented)
    console.log("Navigate to opportunity details:", opportunity.id);
  };

  return (
    <Card 
      className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
      data-testid="opportunity-card"
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid="opportunity-title">
              {opportunity.title}
            </h3>
            <Badge 
              className={getStatusColor(opportunity.status)}
              data-testid="opportunity-status"
            >
              {opportunity.status === "filled" ? "Position Filled" : opportunity.status}
            </Badge>
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  data-testid="button-opportunity-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-5 h-5 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Edit opportunity");
                  }}
                  data-testid="menu-item-edit"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Opportunity
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="text-red-600"
                  data-testid="menu-item-delete"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Opportunity
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-4 line-clamp-3" data-testid="opportunity-description">
          {opportunity.description}
        </p>

        {/* Student Info */}
        <div className="flex items-center space-x-2 mb-4 p-3 bg-white rounded-lg border">
          <User className="w-4 h-4 text-blue-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900" data-testid="student-name">
              {opportunity.student?.name || "Student"}
            </p>
            <p className="text-sm text-gray-600">
              {opportunity.academicLevel} • {opportunity.student?.affiliation || "University"}
            </p>
          </div>
        </div>

        {/* Skills */}
        {opportunity.skills && opportunity.skills.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Skills I have:</p>
            <div className="flex flex-wrap gap-2">
              {opportunity.skills.slice(0, 4).map((skill) => (
                <Badge 
                  key={skill} 
                  variant="secondary" 
                  className="text-xs bg-blue-100 text-blue-800"
                  data-testid="skill-badge"
                >
                  {skill}
                </Badge>
              ))}
              {opportunity.skills.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{opportunity.skills.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Interests */}
        {opportunity.interests && opportunity.interests.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Research interests:</p>
            <div className="flex flex-wrap gap-2">
              {opportunity.interests.slice(0, 3).map((interest) => (
                <Badge 
                  key={interest} 
                  variant="outline" 
                  className="text-xs"
                  data-testid="interest-badge"
                >
                  {interest}
                </Badge>
              ))}
              {opportunity.interests.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{opportunity.interests.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Opportunity Details */}
        <div className="flex justify-between items-center text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            {opportunity.availableHours && (
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{opportunity.availableHours}h/week</span>
              </div>
            )}
            {opportunity.preferredCompensation && (
              <div className="flex items-center space-x-1">
                <DollarSign className="w-4 h-4" />
                <span>${opportunity.preferredCompensation}</span>
              </div>
            )}
            {opportunity.preferredLocation && !opportunity.remote && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{opportunity.preferredLocation}</span>
              </div>
            )}
            {opportunity.remote && (
              <span className="text-green-600">Remote OK</span>
            )}
          </div>
          {opportunity.availability && (
            <span data-testid="opportunity-availability">{opportunity.availability}</span>
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="delete-opportunity-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{opportunity.title}"? This action cannot be undone and will permanently remove your opportunity post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOpportunityMutation.mutate()}
              disabled={deleteOpportunityMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteOpportunityMutation.isPending ? "Deleting..." : "Delete Opportunity"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}