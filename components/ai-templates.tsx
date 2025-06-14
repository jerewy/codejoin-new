"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Wand2, Copy, Download } from "lucide-react"

export default function AITemplates() {
  const [prompt, setPrompt] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const templates = [
    {
      title: "React Component",
      description: "Generate a React functional component",
      prompt: "Create a React component for a user profile card with props",
      category: "React",
    },
    {
      title: "API Endpoint",
      description: "Generate a REST API endpoint",
      prompt: "Create a Node.js Express endpoint for user authentication",
      category: "Backend",
    },
    {
      title: "Database Schema",
      description: "Generate database schema",
      prompt: "Create a MongoDB schema for an e-commerce product",
      category: "Database",
    },
    {
      title: "CSS Animation",
      description: "Generate CSS animations",
      prompt: "Create a smooth fade-in animation with CSS",
      category: "CSS",
    },
  ]

  const generateCode = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)

    // Simulate AI code generation
    setTimeout(() => {
      setGeneratedCode(`// Generated code based on: "${prompt}"
import React from 'react';

const UserProfileCard = ({ user }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-sm">
      <div className="flex items-center space-x-4">
        <img 
          src={user.avatar || "/placeholder.svg"} 
          alt={user.name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {user.name}
          </h3>
          <p className="text-gray-600">{user.role}</p>
        </div>
      </div>
      <p className="mt-4 text-gray-700">{user.bio}</p>
      <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        View Profile
      </button>
    </div>
  );
};

export default UserProfileCard;`)
      setIsGenerating(false)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Code Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Code Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Describe what you want to build:</label>
            <Textarea
              placeholder="e.g., Create a React component for a todo list with add, delete, and toggle functionality"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <Button onClick={generateCode} disabled={!prompt.trim() || isGenerating} className="gap-2">
            <Wand2 className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Code"}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Code */}
      {generatedCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Code</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-zinc-900 text-white p-4 rounded-lg overflow-x-auto text-sm">
              <code>{generatedCode}</code>
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setPrompt(template.prompt)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{template.title}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {template.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                <p className="text-xs italic text-primary">"{template.prompt}"</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
