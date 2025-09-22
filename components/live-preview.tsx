"use client";

import { useEffect, useState } from "react";
import { ProjectNodeFromDB } from "@/lib/types";

interface LivePreviewProps {
  nodes: ProjectNodeFromDB[];
}

export default function LivePreview({ nodes }: LivePreviewProps) {
  const [previewContent, setPreviewContent] = useState("");

  useEffect(() => {
    const htmlFile = nodes.find((f) => f.name.endsWith(".html"));
    const cssFile = nodes.find((f) => f.name.endsWith(".css"));
    const jsFile = nodes.find((f) => f.name.endsWith(".js"));

    if (htmlFile) {
      let content = htmlFile.content ?? "";

      if (cssFile) {
        // More robustly finds the CSS link
        content = content.replace(
          /<link\s+.*?href=".*?\.css".*?>/i,
          `<style>${cssFile.content ?? ""}</style>`
        );
      }

      if (jsFile) {
        // More robustly finds the JS script tag
        content = content.replace(
          /<script\s+.*?src=".*?\.js".*?><\/script>/i,
          `<script>${jsFile.content ?? ""}</script>`
        );
      }

      setPreviewContent(content);
    }
  }, [nodes]);

  return (
    <div className="flex-1 bg-white overflow-auto">
      <iframe
        srcDoc={previewContent}
        className="w-full h-full border-0"
        title="Live Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
