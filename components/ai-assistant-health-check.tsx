"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface HealthStatus {
  authenticated: boolean;
  userId: string | null;
  supabaseConnected: boolean;
  conversationService: boolean;
  lastChecked: string;
}

export function AIAssistantHealthCheck() {
  const { user } = useUser();
  const { toast } = useToast();
  const [status, setStatus] = useState<HealthStatus>({
    authenticated: false,
    userId: null,
    supabaseConnected: false,
    conversationService: false,
    lastChecked: new Date().toISOString(),
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);

    try {
      const healthStatus: HealthStatus = {
        authenticated: !!user?.id,
        userId: user?.id || null,
        supabaseConnected: false,
        conversationService: false,
        lastChecked: new Date().toISOString(),
      };

      // Check Supabase connection
      try {
        const response = await fetch('/api/health/supabase');
        healthStatus.supabaseConnected = response.ok;
      } catch (error) {
        console.error('Supabase health check failed:', error);
      }

      // Check conversation service
      try {
        if (healthStatus.authenticated) {
          const response = await fetch('/api/ai/conversations');
          healthStatus.conversationService = response.ok;
        }
      } catch (error) {
        console.error('Conversation service health check failed:', error);
      }

      setStatus(healthStatus);

      if (healthStatus.authenticated && healthStatus.supabaseConnected && healthStatus.conversationService) {
        toast({
          title: "✅ AI Assistant Healthy",
          description: "All systems are operational",
        });
      } else {
        toast({
          title: "⚠️ AI Assistant Issues Detected",
          description: "Some components may not be working correctly",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: "Health Check Failed",
        description: "Could not complete health check",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, [user]);

  const getStatusColor = (healthy: boolean) => {
    return healthy ? "bg-green-500" : "bg-red-500";
  };

  const getStatusText = (healthy: boolean) => {
    return healthy ? "Healthy" : "Issue";
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">AI Assistant Health</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={checkHealth}
          disabled={isChecking}
        >
          {isChecking ? "Checking..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Authentication</span>
          <Badge variant={status.authenticated ? "default" : "destructive"}>
            {status.authenticated ? user?.id?.substring(0, 8) + "..." : "Not Authenticated"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Supabase Connection</span>
          <Badge variant={status.supabaseConnected ? "default" : "destructive"}>
            {getStatusText(status.supabaseConnected)}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Conversation Service</span>
          <Badge variant={status.conversationService ? "default" : "destructive"}>
            {getStatusText(status.conversationService)}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Last checked: {new Date(status.lastChecked).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}