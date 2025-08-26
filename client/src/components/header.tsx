import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { Bell, ChevronDown } from "lucide-react";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeNav, setActiveNav] = useState("dashboard");

  // Fetch notifications
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
  });

  const unreadCount = notifications.filter((n: any) => !n.readAt).length;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RC</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">ResearchCollab</span>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => {
                  setActiveNav("dashboard");
                  setLocation("/");
                }}
                className={`${
                  activeNav === "dashboard" 
                    ? "text-primary font-medium border-b-2 border-primary pb-1" 
                    : "text-gray-600 hover:text-gray-900 transition-colors"
                }`}
                data-testid="nav-dashboard"
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveNav("projects")}
                className={`${
                  activeNav === "projects" 
                    ? "text-primary font-medium border-b-2 border-primary pb-1" 
                    : "text-gray-600 hover:text-gray-900 transition-colors"
                }`}
                data-testid="nav-projects"
              >
                Projects
              </button>
              <button
                onClick={() => setActiveNav("researchers")}
                className={`${
                  activeNav === "researchers" 
                    ? "text-primary font-medium border-b-2 border-primary pb-1" 
                    : "text-gray-600 hover:text-gray-900 transition-colors"
                }`}
                data-testid="nav-researchers"
              >
                Researchers
              </button>
              <button
                onClick={() => setActiveNav("grants")}
                className={`${
                  activeNav === "grants" 
                    ? "text-primary font-medium border-b-2 border-primary pb-1" 
                    : "text-gray-600 hover:text-gray-900 transition-colors"
                }`}
                data-testid="nav-grants"
              >
                Grants
              </button>
            </nav>
          </div>
          
          {/* User Section */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => {
                // TODO: Implement notifications panel
                alert(`You have ${unreadCount} unread notifications`);
              }}
              data-testid="button-notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs"
                  data-testid="notification-count"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3" data-testid="button-user-menu">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.profileImage || undefined} />
                    <AvatarFallback>
                      {user?.name?.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900" data-testid="user-name">
                      {user?.name}
                    </div>
                    <div className="text-xs text-gray-500" data-testid="user-affiliation">
                      {user?.affiliation}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem 
                  onClick={() => {
                    // TODO: Navigate to profile page
                    alert('Profile page coming soon!');
                  }}
                  data-testid="menu-profile"
                >
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    // TODO: Navigate to settings page
                    alert('Settings page coming soon!');
                  }}
                  data-testid="menu-settings"
                >
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleLogout}
                  data-testid="menu-logout"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
