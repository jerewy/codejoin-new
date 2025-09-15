// app/project/[id]/layout.tsx

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1">{children}</main>
    </div>
  );
}
