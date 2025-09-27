"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  starterProjects,
  featuredStarterProjects,
  starterProjectLanguages,
} from "@/lib/data/starter-projects";
import TemplateCard from "@/components/template-card";
import TemplatePreview from "@/components/template-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import NavLinks from "@/components/nav-links";
import { Search, RefreshCcw, Sparkles, Library } from "lucide-react";

interface CommunityTemplateRow {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  updated_at: string | null;
  visibility?: string | null;
  downloads?: number | null;
  rating?: number | null;
  tags?: string[] | null;
  owner_name?: string | null;
}

type TemplateSummary = Parameters<typeof TemplateCard>[0]["template"];

const DEFAULT_LANGUAGE = "all";
const DEFAULT_TAB = "starter";

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);
  const [languageFilter, setLanguageFilter] =
    useState<string>(DEFAULT_LANGUAGE);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateSummary | null>(null);

  const [communityTemplates, setCommunityTemplates] = useState<
    TemplateSummary[]
  >([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState<boolean>(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  const languages = useMemo(
    () => [
      { id: DEFAULT_LANGUAGE, name: "All stacks" },
      ...starterProjectLanguages.map((language) => ({
        id: language.id,
        name: language.name,
      })),
    ],
    []
  );

  const normalisedSearch = searchTerm.trim().toLowerCase();

  const filteredStarterProjects = useMemo(() => {
    return starterProjects.filter((template) => {
      const matchesLanguage =
        languageFilter === DEFAULT_LANGUAGE ||
        template.id === languageFilter ||
        template.language.toLowerCase() === languageFilter.toLowerCase();

      if (!matchesLanguage) {
        return false;
      }

      if (!normalisedSearch) {
        return true;
      }

      return (
        template.name.toLowerCase().includes(normalisedSearch) ||
        template.description.toLowerCase().includes(normalisedSearch) ||
        template.tags.some((tag) =>
          tag.toLowerCase().includes(normalisedSearch)
        )
      );
    });
  }, [languageFilter, normalisedSearch]);

  const loadCommunityTemplates = useCallback(async () => {
    setIsLoadingCommunity(true);
    setCommunityError(null);

    if (!supabase) {
      setCommunityError(
        "Community templates require Supabase to be configured."
      );
      setIsLoadingCommunity(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id,name,description,language,updated_at,visibility,downloads,rating,tags,owner_name"
        )
        .eq("visibility", "public")
        .order("updated_at", { ascending: false })
        .limit(40);

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as CommunityTemplateRow[];
      const mapped: TemplateSummary[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        description:
          row.description ?? "Public project shared by the community.",
        category: row.language,
        difficulty: "Community",
        downloads: row.downloads ?? 0,
        rating: row.rating ?? 4.6,
        tags: row.tags ?? (row.language ? [row.language] : []),
        author: row.owner_name ?? "Anonymous builder",
        thumbnail: null,
        featured: false,
        language: row.language ?? undefined,
        updatedAt: row.updated_at ?? undefined,
      }));

      setCommunityTemplates(mapped);
    } catch (error) {
      setCommunityError(
        error instanceof Error
          ? error.message
          : "Failed to load community templates"
      );
      setCommunityTemplates([]);
    } finally {
      setIsLoadingCommunity(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadCommunityTemplates();
  }, [loadCommunityTemplates]);

  const filteredCommunityTemplates = useMemo(() => {
    return communityTemplates.filter((template) => {
      const matchesLanguage =
        languageFilter === DEFAULT_LANGUAGE ||
        template.language?.toLowerCase() === languageFilter.toLowerCase();

      if (!matchesLanguage) {
        return false;
      }

      if (!normalisedSearch) {
        return true;
      }

      const tags = template.tags ?? [];

      return (
        template.name.toLowerCase().includes(normalisedSearch) ||
        template.description.toLowerCase().includes(normalisedSearch) ||
        tags.some((tag) => tag.toLowerCase().includes(normalisedSearch))
      );
    });
  }, [communityTemplates, languageFilter, normalisedSearch]);

  const handlePreview = (template: TemplateSummary) => {
    setSelectedTemplate(template);
  };

  const handleClosePreview = () => {
    setSelectedTemplate(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <Library className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Code Library</h1>
              <p className="text-sm text-muted-foreground">
                Starter kits for all 11 supported languages plus community-made
                projects.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container flex-1 py-6 space-y-8">
        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search library..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {languages.map((language) => (
                <Button
                  key={language.id}
                  variant={
                    languageFilter === language.id ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setLanguageFilter(language.id)}
                >
                  {language.name}
                </Button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="flex h-full flex-col justify-between gap-3 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>
                  {starterProjects.length} starter kits curated by the CodeJoin
                  team
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>
                  {communityTemplates.length} public projects shared by the
                  community
                </span>
              </div>
              <div className="flex justify-end">
                <Link href="/new-project">
                  <Button size="sm">Share your template</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="starter">Starter Kits</TabsTrigger>
              <TabsTrigger value="community">Community Showcase</TabsTrigger>
            </TabsList>
            {activeTab === "community" && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadCommunityTemplates}
                disabled={isLoadingCommunity}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>

          <TabsContent value="starter" className="space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Highlighted starters</h2>
                <Badge variant="outline">Curated</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {featuredStarterProjects.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    featured
                    onPreview={handlePreview}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">All starter kits</h2>
                <span className="text-sm text-muted-foreground">
                  {filteredStarterProjects.length} templates
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredStarterProjects.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onPreview={handlePreview}
                  />
                ))}
              </div>
              {filteredStarterProjects.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No starter kits match your filters just yet.
                  </CardContent>
                </Card>
              )}
            </section>
          </TabsContent>

          <TabsContent value="community" className="space-y-6">
            {communityError && (
              <Card>
                <CardContent className="py-6">
                  <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                    <p>{communityError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadCommunityTemplates}
                      disabled={isLoadingCommunity}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Try again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCommunityTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPreview={handlePreview}
                />
              ))}
            </div>

            {!communityError &&
              !isLoadingCommunity &&
              filteredCommunityTemplates.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No public templates for this language yet. Be the first to
                    share one!
                  </CardContent>
                </Card>
              )}

            {isLoadingCommunity && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Loading community templates...
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}
