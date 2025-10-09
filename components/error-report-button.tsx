"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug, Send, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ErrorReport {
  type: "module-call" | "generic" | "chunk-load" | "network";
  message: string;
  stack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  version?: string;
  userId?: string;
}

interface ErrorReportButtonProps {
  error?: Error;
  errorInfo?: {
    componentStack?: string;
    digest?: string;
  };
  onReport?: (report: ErrorReport) => void;
}

export function ErrorReportButton({ error, errorInfo, onReport }: ErrorReportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const getErrorType = (message?: string): ErrorReport["type"] => {
    if (!message) return "generic";

    if (message.includes("Cannot read properties of undefined") && message.includes("reading 'call'")) {
      return "module-call";
    }
    if (message.includes("Loading chunk") || message.includes("ChunkLoadError")) {
      return "chunk-load";
    }
    if (message.includes("fetch") || message.includes("network")) {
      return "network";
    }
    return "generic";
  };

  const generateErrorReport = (): ErrorReport => {
    return {
      type: getErrorType(error?.message),
      message: error?.message || "Unknown error occurred",
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      version: document.querySelector('meta[name="build-hash"]')?.getAttribute('content') || 'unknown',
      userId: 'anonymous', // You can integrate with your auth system
    };
  };

  const copyReportToClipboard = async () => {
    const report = generateErrorReport();
    const reportText = `Error Report - ${new Date().toLocaleString()}

Type: ${report.type.toUpperCase()}
Message: ${report.message}
Timestamp: ${report.timestamp}
URL: ${report.url}
Version: ${report.version}
User Agent: ${report.userAgent}

Stack Trace:
${report.stack || 'No stack trace available'}

Additional Context:
${errorInfo?.componentStack || 'No component stack available'}
${errorInfo?.digest ? `\nError ID: ${errorInfo.digest}` : ''}

User Description:
${reportDescription || 'No user description provided'}`;

    try {
      await navigator.clipboard.writeText(reportText);
      setIsCopied(true);
      toast.success("Error report copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy report to clipboard");
    }
  };

  const submitReport = async () => {
    setIsSubmitting(true);

    const report = {
      ...generateErrorReport(),
      userDescription: reportDescription,
      additionalContext: errorInfo,
    };

    try {
      // Call the provided onReport callback or send to your error reporting service
      if (onReport) {
        await onReport(report);
      } else {
        // Default behavior: send to console and show success message
        console.log("Error report submitted:", report);
      }

      toast.success("Error report submitted successfully");
      setIsDialogOpen(false);
      setReportDescription("");
    } catch (err) {
      toast.error("Failed to submit error report");
      console.error("Error report submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorReport = generateErrorReport();
  const getTypeIcon = (type: ErrorReport["type"]) => {
    switch (type) {
      case "module-call":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "chunk-load":
        return <Bug className="h-4 w-4 text-yellow-500" />;
      case "network":
        return <Bug className="h-4 w-4 text-blue-500" />;
      default:
        return <Bug className="h-4 w-4 text-red-500" />;
    }
  };

  const getTypeColor = (type: ErrorReport["type"]) => {
    switch (type) {
      case "module-call":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "chunk-load":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "network":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bug className="mr-2 h-4 w-4" />
          Report Error
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon(errorReport.type)}
            Error Report
          </DialogTitle>
          <DialogDescription>
            Help us improve the application by reporting this error
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge className={getTypeColor(errorReport.type)}>
                  {errorReport.type.toUpperCase()}
                </Badge>
                Error Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <div className="font-mono text-xs p-2 bg-gray-50 rounded border break-all">
                  {errorReport.message}
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Time: {new Date(errorReport.timestamp).toLocaleString()}</div>
                <div>Version: {errorReport.version}</div>
                <div>URL: {errorReport.url}</div>
              </div>
            </CardContent>
          </Card>

          {/* User Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              What were you doing when this error occurred?
            </label>
            <Textarea
              placeholder="Please describe what you were doing and any steps that led to this error..."
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Technical Details */}
          {(errorReport.stack || errorInfo?.componentStack) && (
            <details className="space-y-2">
              <summary className="text-sm font-medium cursor-pointer hover:text-gray-600">
                Technical Details
              </summary>
              <div className="space-y-2">
                {errorReport.stack && (
                  <div>
                    <h4 className="text-xs font-medium mb-1">Stack Trace:</h4>
                    <pre className="text-xs p-2 bg-gray-50 rounded border overflow-x-auto whitespace-pre-wrap">
                      {errorReport.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <h4 className="text-xs font-medium mb-1">Component Stack:</h4>
                    <pre className="text-xs p-2 bg-gray-50 rounded border overflow-x-auto whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={submitReport}
              disabled={isSubmitting}
              className="flex-1"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
            <Button
              onClick={copyReportToClipboard}
              variant="outline"
              disabled={isCopied}
            >
              {isCopied ? (
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {isCopied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}