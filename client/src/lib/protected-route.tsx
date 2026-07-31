import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { ComponentType, useEffect } from "react";

export function ProtectedRoute({
  component: Component,
}: {
  component: ComponentType;
}) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    console.log("🔒 ProtectedRoute Debug:");
    console.log("  - isLoading:", isLoading);
    console.log("  - user:", user);
    console.log("  - user role:", user?.role);
    console.log("  - user id:", user?.id);
    console.log("  - Component:", Component.name);
    console.log("  - Full user object:", JSON.stringify(user, null, 2));
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    console.log("❌ No user found, redirecting to auth");
    return <Redirect to="/auth" />;
  }

  console.log("✅ User authenticated, rendering component");
  return <Component />;
}