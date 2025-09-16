"use client";

import { Button } from "@/components/ui/button";
import { Play, Save, Share2, Settings } from "lucide-react";

export default function ProjectActions() {
  const dispatch = (type: string) => {
    window.dispatchEvent(new CustomEvent(`project:${type}`));
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => dispatch("run")}>
        <Play className="h-4 w-4 mr-1" /> Run
      </Button>
      <Button variant="outline" size="sm" onClick={() => dispatch("save")}>
        <Save className="h-4 w-4 mr-1" /> Save
      </Button>
      <Button variant="outline" size="sm" onClick={() => dispatch("share")}>
        <Share2 className="h-4 w-4 mr-1" /> Share
      </Button>
      <Button variant="outline" size="sm">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}
