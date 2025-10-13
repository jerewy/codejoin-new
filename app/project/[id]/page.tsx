// app/project/[id]/page.tsx

import { createServerSupabase } from "@/lib/supabaseServer";
import ProjectWorkspace from "@/components/project-workspace";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import CollaboratorsList from "@/components/collaborators-list";
import { Collaborator, ProjectChatMessageWithAuthor } from "@/lib/types";
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

const extractMessageAuthorId = (
  record:
    | {
        user_id?: string | null;
        metadata?: Record<string, unknown> | null;
        [key: string]: unknown;
      }
    | null
) => {
  if (!record) {
    return null;
  }

  const directId = record.user_id;
  if (typeof directId === "string" && directId.trim().length > 0) {
    return directId;
  }

  const metadata = record.metadata as Record<string, unknown> | null | undefined;
  if (!metadata) {
    return null;
  }

  const candidateKeys = [
    "author_id",
    "authorId",
    "user_id",
    "userId",
    "profile_id",
    "profileId",
  ];

  for (const key of candidateKeys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
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

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.warn('Failed to get current user:', userError);
  }

  // Fetch data needed for the header
  let project: { name: string | null } | null = null;
  let nodes;

  type ProfileRow = {
    id: string;
    full_name: string | null;
    user_avatar: string | null;
  };

  type CollaboratorRow = {
    user_id: string;
    role: string;
  };

  let conversationId: string | null = null;
  let chatMessages: ProjectChatMessageWithAuthor[] = [];

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

    // Try to get existing team chat conversation, or create one
    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("project_id", params.id)
      .eq("type", "team-chat")
      .maybeSingle();

    if (conversationError && conversationError.code !== "PGRST116") {
      console.warn("Failed to load team chat conversation", conversationError);
    }

    if (conversationData?.id) {
      conversationId = conversationData.id;
      console.log(`DEBUG: Found existing team chat conversation: ${conversationId}`);
    } else if (!conversationData) {
      // Create a new team chat conversation using the database function
      const { data: createdConversation, error: createConversationError } = await supabase
        .rpc('ensure_team_chat_conversation', {
          project_uuid: params.id,
          user_uuid: user?.id
        });

      if (createConversationError) {
        console.warn("Failed to create team chat conversation", createConversationError);
        // Fallback to manual creation
        const { data: fallbackConversation, error: fallbackError } = await supabase
          .from("conversations")
          .insert({
            project_id: params.id,
            type: 'team-chat',
            created_by: user?.id
          })
          .select("id")
          .single();

        if (fallbackError) {
          console.warn("Failed to create fallback team chat conversation", fallbackError);
        } else if (fallbackConversation?.id) {
          conversationId = fallbackConversation.id;
          console.log(`DEBUG: Created fallback team chat conversation: ${conversationId}`);
        }
      } else if (createdConversation) {
        conversationId = createdConversation;
        console.log(`DEBUG: Created new team chat conversation: ${conversationId}`);
      }
    }

    if (conversationId) {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.warn("Failed to load messages", messagesError);
      } else if (messagesData) {
        type MessageRow = {
          id: string;
          content: string | null;
          created_at: string;
          metadata: Record<string, unknown> | null;
          role?: string | null;
          user_id?: string | null;
        } & Record<string, unknown>;

        const messageRows = messagesData as MessageRow[];

        const missingProfileIds = Array.from(
          new Set(
            messageRows
              .map((row) => extractMessageAuthorId(row))
              .filter(
                (id): id is string =>
                  typeof id === "string" &&
                  id.length > 0 &&
                  !profilesById.has(id)
              )
          )
        );

        if (missingProfileIds.length > 0) {
          const { data: extraProfiles, error: extraProfilesError } = await supabase
            .from("profiles")
            .select("id, full_name, user_avatar")
            .in("id", missingProfileIds);

          if (extraProfilesError) {
            console.warn("Failed to load message author profiles", extraProfilesError);
          } else if (extraProfiles) {
            for (const profile of extraProfiles as ProfileRow[]) {
              profilesById.set(profile.id, {
                full_name: profile.full_name ?? null,
                user_avatar: profile.user_avatar ?? null,
              });
            }
          }
        }

        chatMessages = messageRows.map((row) => {
          const resolvedUserId = extractMessageAuthorId(row);
          const profile = resolvedUserId
            ? profilesById.get(resolvedUserId)
            : undefined;

          return {
            id: row.id,
            content: row.content ?? "",
            created_at: row.created_at,
            user_id: resolvedUserId ?? null,
            role: row.role ?? null,
            user_full_name: profile?.full_name ?? null,
            user_avatar: profile?.user_avatar ?? null,
            metadata: row.metadata ?? null,
          } satisfies ProjectChatMessageWithAuthor;
        });
      }
    }

    // If database queries fail, provide mock data for development
    if (projectError || nodesError || !project || !nodes) {
      console.warn("Database query failed, using mock data:", {
        projectError,
        nodesError,
      });

      project = { name: params.id ?? "Project" };
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
      conversationId = null;
      chatMessages = [];
    }
  } catch (error) {
    console.error("Supabase error:", error);

    // Provide mock data as fallback
    project = { name: params.id ?? "Project" };
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
    conversationId = null;
    chatMessages = [];
  }

  const projectName =
    typeof project?.name === "string" && project.name.trim().length > 0
      ? project.name
      : params.id ?? "Project";

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
          <h1 className="text-sm font-medium truncate">{projectName}</h1>
          <Badge variant="outline" className="text-xs hidden lg:inline-flex">
            Multi-language
          </Badge>
          <div className="hidden xl:block ml-2">
            <CollaboratorsList collaborators={collaborators} />
          </div>
        </div>
        <ProjectActions
          projectId={params.id}
          projectName={projectName}
          files={nodes}
        />
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">
        <ProjectWorkspace
          initialNodes={nodes}
          projectId={params.id}
          conversationId={conversationId}
          initialChatMessages={chatMessages}
          teamMembers={collaborators}
        />
      </main>
    </div>
  );
}
