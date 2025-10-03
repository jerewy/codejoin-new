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
import ProjectActions from "@/components/project-actions";

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
  let collaborators: Collaborator[] = [];
  const params = await paramsPromise;

  // Fetch data needed for the header
  let project;
  let nodes;

  try {
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("name")
      .eq("id", params.id)
      .single();

    // Fetch the project's files and folders
    const { data: nodesData, error: nodesError } = await supabase
      .from("project_nodes")
      .select("*")
      .eq("project_id", params.id);

    const { data: collaboratorsData, error: collaboratorsError } = await supabase
      .from("collaborators")
      .select("user_id, role")
      .eq("project_id", params.id);

    let profilesById = new Map<string, { full_name: string | null; user_avatar: string | null }>();

    if (!collaboratorsError && collaboratorsData && collaboratorsData.length > 0) {
      const collaboratorIds = collaboratorsData
        .map((row) => row?.user_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      if (collaboratorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, user_avatar")
          .in("id", collaboratorIds);

        if (profilesError) {
          console.warn("Failed to load collaborator profiles", profilesError);
        } else if (profilesData) {
          type ProfileRow = {
            id: string;
            full_name: string | null;
            user_avatar: string | null;
          };

          profilesById = new Map(
            (profilesData as ProfileRow[]).map((profile) => [
              profile.id,
              {
                full_name: profile.full_name ?? null,
                user_avatar: profile.user_avatar ?? null,
              },
            ])
          );
        }
      }
    }

    project = projectData;
    nodes = nodesData;

    if (collaboratorsError) {
      console.warn("Failed to load collaborators", collaboratorsError);
    } else if (collaboratorsData) {
      type CollaboratorRow = {
        user_id: string;
        role: string;
      };

      collaborators = (collaboratorsData as CollaboratorRow[]).map(({ user_id, role }) => {
        const profile = user_id ? profilesById.get(user_id) : undefined;

        return {
          user_id,
          role,
          full_name: profile?.full_name ?? null,
          user_avatar: profile?.user_avatar ?? null,
        } satisfies Collaborator;
      });
    }

    // If database queries fail, provide mock data for development
    if (projectError || nodesError || !project || !nodes) {
      console.warn("Database query failed, using mock data:", {
        projectError,
        nodesError,
      });

      project = { name: `Project ${params.id}` };
      nodes = [
        {
          id: "1",
          project_id: params.id,
          name: "index.html",
          type: "file",
          content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Welcome to CodeJoin</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n    <p>Welcome to your CodeJoin project!</p>\n</body>\n</html>`,
          language: "html",
          parent_id: null
        },
        {
          id: "2",
          project_id: params.id,
          name: "script.js",
          type: "file",
          content: `console.log("Hello from CodeJoin!");`,
          language: "javascript",
          parent_id: null
        },
        {
          id: "3",
          project_id: params.id,
          name: "style.css",
          type: "file",
          content: `body {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n    background-color: #f5f5f5;\n}\n\nh1 {\n    color: #333;\n}`,
          language: "css",
          parent_id: null
        }
      ];
    }
  } catch (error) {
    console.error("Supabase error:", error);

    // Provide mock data as fallback
    project = { name: `Project ${params.id}` };
    nodes = [
      {
        id: "1",
        project_id: params.id,
        name: "index.html",
        type: "file",
        content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Welcome to CodeJoin</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n    <p>Welcome to your CodeJoin project!</p>\n</body>\n</html>`,
        language: "html",
        parent_id: null
      },
      {
        id: "2",
        project_id: params.id,
        name: "script.js",
        type: "file",
        content: `console.log("Hello from CodeJoin!");`,
        language: "javascript",
        parent_id: null
      }
    ];
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-3 py-2 border-b bg-background z-10 flex-shrink-0 h-12">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-4" />
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <h1 className="text-sm font-medium truncate">{project.name}</h1>
          <Badge variant="outline" className="text-xs hidden lg:inline-flex">
            Multi-language
          </Badge>
          <div className="hidden xl:block ml-2">
            <CollaboratorsList collaborators={collaborators} />
          </div>
        </div>
        <ProjectActions
          projectId={params.id}
          projectName={project.name}
          files={nodes}
        />
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">
        <ProjectWorkspace initialNodes={nodes} projectId={params.id} />
      </main>
    </div>
  );
}
