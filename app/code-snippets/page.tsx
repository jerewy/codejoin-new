import CodeSnippetDemo from "@/components/code-snippet-demo"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Code Snippet Component Demo",
  description: "A modern, accessible code snippet component with automatic language detection, syntax highlighting, and theme awareness.",
}

export default function CodeSnippetsPage() {
  return <CodeSnippetDemo />
}