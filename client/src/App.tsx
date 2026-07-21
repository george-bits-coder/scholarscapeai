
import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects-page";
import ProjectDetail from "@/pages/project-detail";
import ProjectDetailsPage from "@/pages/project-details";
import ResearcherProfile from "@/pages/researcher-profile";
import ResearchersPage from "@/pages/researchers-page";
import ProjectChatPage from "@/pages/project-chat-page";
import MessagesPage from "@/pages/messages-page";
import GrantsPage from "@/pages/grants-page";
import LandingPage from "@/pages/landing-page";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={LandingPage} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/projects" component={ProjectsPage} />
      <ProtectedRoute path="/projects/:id" component={ProjectDetail} />
      <ProtectedRoute path="/project/:id" component={ProjectDetailsPage} />
      <ProtectedRoute path="/project/:id/chat" component={ProjectChatPage} />
      <ProtectedRoute path="/researchers" component={ResearchersPage} />
      <ProtectedRoute path="/researchers/:id" component={ResearcherProfile} />
      <ProtectedRoute path="/grants" component={GrantsPage} />
      <ProtectedRoute path="/messages" component={MessagesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
