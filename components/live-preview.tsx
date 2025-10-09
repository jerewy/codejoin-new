"use client";

import { useEffect, useState, useRef } from "react";
import { ProjectNodeFromDB } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, Eye, Code, Smartphone, Tablet, Monitor } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface LivePreviewProps {
  nodes: ProjectNodeFromDB[];
}

export default function LivePreview({ nodes }: LivePreviewProps) {
  const [previewContent, setPreviewContent] = useState("");
  const [viewportSize, setViewportSize] = useState("desktop");
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const refreshPreview = () => {
    setIsLoading(true);
    // Trigger a re-render by updating the key
    setTimeout(() => setIsLoading(false), 500);
  };

  const openInNewTab = () => {
    if (previewContent) {
      const blob = new Blob([previewContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    const htmlFile = nodes.find((f) => f.name.endsWith(".html") || f.name.endsWith(".htm"));
    const cssFiles = nodes.filter((f) => f.name.endsWith(".css") || f.name.endsWith(".scss") || f.name.endsWith(".sass"));
    const jsFiles = nodes.filter((f) => f.name.endsWith(".js") || f.name.endsWith(".ts") || f.name.endsWith(".jsx") || f.name.endsWith(".tsx"));

    if (htmlFile) {
      let content = htmlFile.content ?? "";

      // Inject CSS files
      if (cssFiles.length > 0) {
        const cssContent = cssFiles.map(f => f.content || '').join('\n');
        const styleTag = `<style>\n${cssContent}\n</style>`;

        if (content.includes('</head>')) {
          content = content.replace('</head>', `${styleTag}\n</head>`);
        } else {
          content = `${styleTag}\n${content}`;
        }
      }

      // Inject JavaScript files
      if (jsFiles.length > 0) {
        const jsContent = jsFiles.map(f => {
          let code = f.content || '';
          // Basic TypeScript to JavaScript conversion for preview
          if (f.name.endsWith('.ts') || f.name.endsWith('.tsx')) {
            code = code
              .replace(/:\s*\w+/g, '') // Remove type annotations
              .replace(/interface\s+\w+\s*{[^}]*}/g, '') // Remove interfaces
              .replace(/type\s+\w+\s*=[^;]+;/g, ''); // Remove type aliases
          }
          return code;
        }).join('\n');

        const scriptTag = `<script>\ntry {\n${jsContent}\n} catch(e) { console.error('Script error:', e); }\n</script>`;

        if (content.includes('</body>')) {
          content = content.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          content = `${content}\n${scriptTag}`;
        }
      }

      // Add viewport meta tag if not present
      if (!content.includes('viewport') && content.includes('<head>')) {
        content = content.replace('<head>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1.0">');
      }

      // Add error handling script
      const errorHandlingScript = `
        <script>
          window.addEventListener('error', function(e) {
            console.error('Runtime error:', e.error);
          });
          window.addEventListener('unhandledrejection', function(e) {
            console.error('Unhandled promise rejection:', e.reason);
          });
        </script>
      `;
      content = content.replace('</head>', `${errorHandlingScript}</head>`);

      setPreviewContent(content);
    } else {
      // Create a simple preview page if no HTML file exists
      const fallbackHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Preview</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f5f5f5;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .preview-message {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
            }
            .preview-message h2 {
              color: #666;
              margin-bottom: 16px;
            }
            .preview-message p {
              color: #888;
              line-height: 1.5;
            }
            ${cssFiles.map(f => f.content || '').join('\n')}
          </style>
        </head>
        <body>
          <div class="preview-message">
            <h2>No HTML File Found</h2>
            <p>Create an HTML file to see live preview here.</p>
            ${cssFiles.length > 0 ? '<p><small>CSS files are loaded and ready to use.</small></p>' : ''}
          </div>
          <script>
            ${jsFiles.map(f => f.content || '').join('\n')}
          </script>
        </body>
        </html>
      `;
      setPreviewContent(fallbackHTML);
    }
  }, [nodes]);

  const getViewportDimensions = () => {
    try {
      switch (viewportSize) {
        case "mobile":
          return { width: "375px", height: "667px" };
        case "tablet":
          return { width: "768px", height: "1024px" };
        default:
          return { width: "100%", height: "100%" };
      }
    } catch (error) {
      console.error("Error getting viewport dimensions:", error);
      // Fallback dimensions
      return { width: "100%", height: "100%" };
    }
  };

  const dimensions = getViewportDimensions();

  return (
    <div className="flex-1 flex flex-col bg-gray-100">
      {/* Preview Controls */}
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Live Preview</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport Size Toggle */}
          <ToggleGroup
            type="single"
            value={viewportSize}
            onValueChange={(value) => {
              if (value) setViewportSize(value);
            }}
            className="h-8"
          >
            <ToggleGroupItem value="mobile" aria-label="Mobile view">
              <Smartphone className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="tablet" aria-label="Tablet view">
              <Tablet className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="desktop" aria-label="Desktop view">
              <Monitor className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshPreview}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openInNewTab}
            disabled={!previewContent}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="mx-auto bg-white rounded-lg shadow-lg overflow-hidden"
          style={{
            width: dimensions?.width || "100%",
            height: viewportSize === "desktop" ? "100%" : (dimensions?.height || "100%"),
            minHeight: viewportSize === "desktop" ? "500px" : "auto",
            maxWidth: "100%",
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={previewContent}
            className="w-full h-full border-0"
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            key={isLoading ? Date.now() : 'stable'}
            style={{
              minHeight: viewportSize === "desktop" ? "500px" : (dimensions?.height || "500px"),
            }}
          />
        </div>
      </div>
    </div>
  );
}