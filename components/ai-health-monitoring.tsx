"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Zap,
  Server,
  Cloud,
  Cpu,
  HardDrive,
  Wifi,
  Thermometer,
  Shield,
  RefreshCw,
  Settings,
  TrendingUp,
  Clock,
  Monitor,
  Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIHealthMonitoringProps {
  projectId?: string;
  userId?: string;
}

interface HealthStatus {
  model: string;
  status: "healthy" | "warning" | "critical" | "offline";
  uptime: number;
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  cpuUsage?: number;
  memoryUsage?: number;
  temperature?: number;
}

interface ServiceHealth {
  name: string;
  status: "operational" | "degraded" | "down";
  description: string;
  lastIncident?: Date;
}

interface SystemMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  systemLoad: number;
  activeConnections: number;
  queueSize: number;
}

export default function AIHealthMonitoring({ projectId, userId }: AIHealthMonitoringProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const [healthStatus, setHealthStatus] = useState<Record<string, HealthStatus>>({
    deepseek: {
      model: "DeepSeek Coder",
      status: "healthy",
      uptime: 99.8,
      lastCheck: new Date(),
      responseTime: 42,
      errorRate: 0.2,
      cpuUsage: 45,
      memoryUsage: 67,
      temperature: 65
    },
    gemini: {
      model: "Gemini Pro",
      status: "healthy",
      uptime: 99.9,
      lastCheck: new Date(),
      responseTime: 215,
      errorRate: 0.1
    }
  });

  const [services, setServices] = useState<ServiceHealth[]>([
    {
      name: "API Gateway",
      status: "operational",
      description: "Request routing and authentication"
    },
    {
      name: "Database",
      status: "operational",
      description: "Conversation storage and retrieval"
    },
    {
      name: "Model Cache",
      status: "operational",
      description: "Model inference caching"
    },
    {
      name: "WebSocket Service",
      status: "operational",
      description: "Real-time communication"
    }
  ]);

  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalRequests: 25847,
    successfulRequests: 25789,
    failedRequests: 58,
    avgResponseTime: 128,
    systemLoad: 34,
    activeConnections: 127,
    queueSize: 3
  });

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setHealthStatus(prev => ({
        deepseek: {
          ...prev.deepseek,
          responseTime: Math.max(30, Math.min(80, prev.deepseek.responseTime + (Math.random() - 0.5) * 10)),
          cpuUsage: Math.max(20, Math.min(80, (prev.deepseek.cpuUsage || 0) + (Math.random() - 0.5) * 10)),
          memoryUsage: Math.max(40, Math.min(90, (prev.deepseek.memoryUsage || 0) + (Math.random() - 0.5) * 8)),
          temperature: Math.max(50, Math.min(85, (prev.deepseek.temperature || 0) + (Math.random() - 0.5) * 5)),
          errorRate: Math.max(0, Math.min(2, prev.deepseek.errorRate + (Math.random() - 0.5) * 0.5)),
          lastCheck: new Date()
        },
        gemini: {
          ...prev.gemini,
          responseTime: Math.max(180, Math.min(350, prev.gemini.responseTime + (Math.random() - 0.5) * 20)),
          errorRate: Math.max(0, Math.min(1, prev.gemini.errorRate + (Math.random() - 0.5) * 0.3)),
          lastCheck: new Date()
        }
      }));

      setSystemMetrics(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 10),
        successfulRequests: prev.successfulRequests + Math.floor(Math.random() * 10),
        avgResponseTime: Math.max(100, Math.min(200, prev.avgResponseTime + (Math.random() - 0.5) * 20)),
        systemLoad: Math.max(20, Math.min(70, prev.systemLoad + (Math.random() - 0.5) * 10)),
        activeConnections: Math.max(50, Math.min(300, prev.activeConnections + (Math.random() - 0.5) * 20)),
        queueSize: Math.max(0, Math.min(20, prev.queueSize + (Math.random() - 0.5) * 3))
      }));

      setLastUpdate(new Date());
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const refreshHealth = async () => {
    setIsRefreshing(true);

    // Simulate health check
    await new Promise(resolve => setTimeout(resolve, 1000));

    setHealthStatus(prev => ({
      deepseek: {
        ...prev.deepseek,
        lastCheck: new Date(),
        status: prev.deepseek.errorRate > 1.5 ? "warning" : "healthy"
      },
      gemini: {
        ...prev.gemini,
        lastCheck: new Date(),
        status: prev.gemini.errorRate > 1 ? "warning" : "healthy"
      }
    }));

    setIsRefreshing(false);
    setLastUpdate(new Date());

    toast({
      title: "Health Check Complete",
      description: "All systems are operational",
    });
  };

  const getStatusIcon = (status: HealthStatus["status"] | ServiceHealth["status"]) => {
    switch (status) {
      case "healthy":
      case "operational":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "critical":
      case "down":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "offline":
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getStatusColor = (status: HealthStatus["status"] | ServiceHealth["status"]) => {
    switch (status) {
      case "healthy":
      case "operational":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "warning":
      case "degraded":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "critical":
      case "down":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "offline":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    }
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(1)}%`;
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getMetricColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return "text-green-600";
    if (value <= thresholds.warning) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                AI System Health Monitor
              </CardTitle>
              <CardDescription>
                Real-time monitoring of AI models and system services
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last update: {formatTimeAgo(lastUpdate)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? "bg-green-50 border-green-200" : ""}
              >
                <Activity className="h-4 w-4 mr-2" />
                Auto-refresh
              </Button>
              <Button
                size="sm"
                onClick={refreshHealth}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overall System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${healthStatus.deepseek.status === "healthy" ? "bg-green-500" : healthStatus.deepseek.status === "warning" ? "bg-yellow-500" : "bg-red-500"}`} />
              <span className="text-sm font-medium">DeepSeek</span>
            </div>
            <p className="text-2xl font-bold mt-2">{formatUptime(healthStatus.deepseek.uptime)}</p>
            <p className="text-xs text-muted-foreground">Uptime</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${healthStatus.gemini.status === "healthy" ? "bg-green-500" : healthStatus.gemini.status === "warning" ? "bg-yellow-500" : "bg-red-500"}`} />
              <span className="text-sm font-medium">Gemini</span>
            </div>
            <p className="text-2xl font-bold mt-2">{formatUptime(healthStatus.gemini.uptime)}</p>
            <p className="text-xs text-muted-foreground">Uptime</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Avg Response</span>
            </div>
            <p className="text-2xl font-bold mt-2">{systemMetrics.avgResponseTime}ms</p>
            <p className="text-xs text-muted-foreground">Response Time</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Load</span>
            </div>
            <p className="text-2xl font-bold mt-2">{systemMetrics.systemLoad}%</p>
            <p className="text-xs text-muted-foreground">System Load</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Health Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DeepSeek Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-green-600" />
              DeepSeek Coder Health
              <Badge className={getStatusColor(healthStatus.deepseek.status)}>
                {healthStatus.deepseek.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Response Time</p>
                <p className={`font-medium ${getMetricColor(healthStatus.deepseek.responseTime, { good: 50, warning: 100 })}`}>
                  {healthStatus.deepseek.responseTime}ms
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Error Rate</p>
                <p className={`font-medium ${getMetricColor(healthStatus.deepseek.errorRate, { good: 0.5, warning: 1.5 })}`}>
                  {healthStatus.deepseek.errorRate}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">CPU Usage</p>
                <div className="flex items-center gap-2">
                  <Progress value={healthStatus.deepseek.cpuUsage || 0} className="flex-1 h-2" />
                  <span className={`font-medium ${getMetricColor(healthStatus.deepseek.cpuUsage || 0, { good: 60, warning: 80 })}`}>
                    {healthStatus.deepseek.cpuUsage}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Memory Usage</p>
                <div className="flex items-center gap-2">
                  <Progress value={healthStatus.deepseek.memoryUsage || 0} className="flex-1 h-2" />
                  <span className={`font-medium ${getMetricColor(healthStatus.deepseek.memoryUsage || 0, { good: 70, warning: 85 })}`}>
                    {healthStatus.deepseek.memoryUsage}%
                  </span>
                </div>
              </div>
            </div>

            {healthStatus.deepseek.temperature && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Thermometer className="h-4 w-4 text-orange-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Temperature</p>
                  <p className={`text-lg font-bold ${getMetricColor(healthStatus.deepseek.temperature, { good: 70, warning: 80 })}`}>
                    {healthStatus.deepseek.temperature}°C
                  </p>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Last check: {formatTimeAgo(healthStatus.deepseek.lastCheck)}
            </div>
          </CardContent>
        </Card>

        {/* Gemini Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-600" />
              Gemini Pro Health
              <Badge className={getStatusColor(healthStatus.gemini.status)}>
                {healthStatus.gemini.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Response Time</p>
                <p className={`font-medium ${getMetricColor(healthStatus.gemini.responseTime, { good: 250, warning: 400 })}`}>
                  {healthStatus.gemini.responseTime}ms
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Error Rate</p>
                <p className={`font-medium ${getMetricColor(healthStatus.gemini.errorRate, { good: 0.5, warning: 1.0 })}`}>
                  {healthStatus.gemini.errorRate}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Service Level</p>
                <p className="font-medium text-green-600">99.9%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Region</p>
                <p className="font-medium">us-central1</p>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium">Cloud Service Status</p>
              </div>
              <p className="text-xs text-muted-foreground">
                All Google Cloud AI services are operational. No reported incidents in the last 30 days.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              Last check: {formatTimeAgo(healthStatus.gemini.lastCheck)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(service.status)}>
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{systemMetrics.totalRequests.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600">{systemMetrics.successfulRequests.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-2xl font-bold text-red-600">{systemMetrics.failedRequests}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-2xl font-bold text-blue-600">{systemMetrics.activeConnections}</p>
              <p className="text-sm text-muted-foreground">Active Connections</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Queue Size</p>
                <Badge variant={systemMetrics.queueSize > 10 ? "destructive" : "secondary"}>
                  {systemMetrics.queueSize}
                </Badge>
              </div>
              <Progress value={(systemMetrics.queueSize / 50) * 100} className="h-2" />
            </div>

            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Success Rate</p>
                <Badge variant="secondary">
                  {((systemMetrics.successfulRequests / systemMetrics.totalRequests) * 100).toFixed(1)}%
                </Badge>
              </div>
              <Progress value={(systemMetrics.successfulRequests / systemMetrics.totalRequests) * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}