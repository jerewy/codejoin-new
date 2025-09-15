// app/project/[id]/page.tsx

import { createServerSupabase } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ProjectWorkspace from "@/components/project-workspace";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  FileText,
  Settings,
  Share2,
  Save,
  Play,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import CollaboratorsList from "@/components/collaborators-list";
import { Collaborator } from "@/lib/types";

// This type is for your client component, so keep it exported
export type ProjectNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  content: string | null;
  language: string | null;
  parent_id: string | null;
};

export default async function ProjectPage({
  params: paramsPromise,
}: {
  params: { id: string };
}) {
  // Create a Supabase client for this server component
  const supabase = await createServerSupabase();
  // This would also be fetched from the database in a real app
  const collaborators: Collaborator[] = [];
  const params = await paramsPromise;

  // Fetch data needed for the header
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", params.id)
    .single();

  // Fetch the project's files and folders
  const { data: nodes, error } = await supabase
    .from("project_nodes")
    .select("*")
    .eq("project_id", params.id);

  if (error || !nodes || !project) {
    notFound();
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <Badge variant="outline" className="text-xs">
              Multi-language
            </Badge>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <CollaboratorsList collaborators={collaborators} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-1" /> Run
          </Button>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <ProjectWorkspace initialNodes={nodes} />
      </main>
    </div>
  );
}
