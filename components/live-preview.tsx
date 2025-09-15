"use client";

import { useEffect, useState } from "react";

interface LivePreviewProps {
  files: Array<{ name: string; content: string }>;
}

export default function LivePreview({ files }: LivePreviewProps) {
  const [previewContent, setPreviewContent] = useState("");

  useEffect(() => {
    const htmlFile = files.find((f) => f.name.endsWith(".html"));
    const cssFile = files.find((f) => f.name.endsWith(".css"));
    const jsFile = files.find((f) => f.name.endsWith(".js"));

    if (htmlFile) {
      let content = htmlFile.content;

      // Inject CSS
      if (cssFile) {
        content = content.replace(
          '<link rel="stylesheet" href="styles.css">',
          `<style>${cssFile.content}</style>`
        );
      }

      // Inject JS
      if (jsFile) {
        content = content.replace(
          '<script src="script.js"></script>',
          `<script>${jsFile.content}</script>`
        );
      }

      setPreviewContent(content);
    }
  }, [files]);

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
