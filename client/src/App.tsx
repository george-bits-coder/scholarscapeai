import { Switch, Route } from "wouter";
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
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/projects" component={() => <ProtectedRoute component={ProjectsPage} />} />
      <Route path="/projects/:id" component={() => <ProtectedRoute component={ProjectDetail} />} />
      <Route path="/project/:id" component={() => <ProtectedRoute component={ProjectDetailsPage} />} />
      <Route path="/project/:id/chat" component={() => <ProtectedRoute component={ProjectChatPage} />} />
      <Route path="/researchers" component={() => <ProtectedRoute component={ResearchersPage} />} />
      <Route path="/researchers/:id" component={() => <ProtectedRoute component={ResearcherProfile} />} />
      <Route path="/grants" component={() => <ProtectedRoute component={GrantsPage} />} />
      <Route path="/messages" component={() => <ProtectedRoute component={MessagesPage} />} />
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