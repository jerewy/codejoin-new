from pathlib import Path

raw = Path("lib/data/raw_project_templates.ts").read_text()
raw = raw.replace("const projectTemplates = [", "")
raw = raw.rstrip()
if raw.endswith("]"):
    raw = raw[:-1]
raw = raw.strip()
array_text = raw

header = """import type { ComponentType } from \"react\";\nimport { DiJava } from \"react-icons/di\";\nimport {\n  SiC,\n  SiCplusplus,\n  SiCsharp,\n  SiGo,\n  SiJavascript,\n  SiMysql,\n  SiPython,\n  SiRust,\n  SiSwift,\n  SiTypescript,\n} from \"react-icons/si\";\n\nimport type { TemplateNode } from \"@/lib/types\";\n\nexport type StarterProject = {\n  id: string;\n  name: string;\n  description: string;\n  icon: ComponentType<{ className?: string }>;\n  tags: string[];\n  color: string;\n  structure: TemplateNode[];\n  difficulty: \"Beginner\" | \"Intermediate\" | \"Advanced\";\n  author: string;\n  rating: number;\n  downloads: number;\n  thumbnail?: string | None;\n  featured?: bool;\n  language: string;\n};\n\ntype BaseStarterProject = Pick<\n  StarterProject,\n  \"id\" | \"name\" | \"description\" | \"icon\" | \"tags\" | \"color\" | \"structure\"\n>;\n\nconst baseStarterProjects: BaseStarterProject[] = [\n"""

footer = "\n];\n\nconst templateMetadata: Record<string, Partial<StarterProject>> = {\n  javascript: { difficulty: \"Beginner\", featured: True, rating: 4.8, downloads: 1680 },\n  typescript: { difficulty: \"Intermediate\", featured: True, rating: 4.7, downloads: 1420 },\n  python: { difficulty: \"Beginner\", featured: True, rating: 4.9, downloads: 1980 },\n  java: { difficulty: \"Intermediate\", rating: 4.6, downloads: 1210 },\n  csharp: { difficulty: \"Intermediate\", rating: 4.6, downloads: 990 },\n  go: { difficulty: \"Intermediate\", rating: 4.6, downloads: 880 },\n  rust: { difficulty: \"Advanced\", rating: 4.7, downloads: 760 },\n  swift: { difficulty: \"Intermediate\", rating: 4.5, downloads: 690 },\n  cpp: { difficulty: \"Advanced\", rating: 4.6, downloads: 830 },\n  c: { difficulty: \"Advanced\", rating: 4.5, downloads: 720 },\n  sql: { difficulty: \"Beginner\", rating: 4.8, downloads: 1750 },\n};\n\nconst DEFAULT_METADATA = {\n  author: \"CodeJoin Starter Team\",\n  difficulty: \"Intermediate\" as const,\n  rating: 4.7,\n  downloads: 900,\n  featured: False,\n  thumbnail: None,\n};\n\nexport const starterProjects: StarterProject[] = baseStarterProjects.map((template, index) => {\n  const meta = templateMetadata[template.id] || {};\n  const rating = meta.get('rating', round(min(4.9, 4.6 + (index % 4) * 0.1), 1));\n"""

Path("lib/data/starter-projects.ts").write_text(header + array_text + footer)
