"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Code2, Copy, Check, Eye, EyeOff } from "lucide-react"
import CodeSnippet from "@/components/code-snippet"
import AIMessage from "@/components/ai-message"

const sampleCode = {
  javascript: `// JavaScript Example: Modern ES6+ Features
const fetchData = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

// Usage with async/await
const getUserData = async (userId) => {
  const data = await fetchUser(userId);
  return data;
};`,

  typescript: `// TypeScript Example: Type-Safe React Component
import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface UserCardProps {
  userId: number;
  onUpdate?: (user: User) => void;
}

const UserCard: React.FC<UserCardProps> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(\`/api/users/\${userId}\`);
        const userData: User = await response.json();
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
};`,

  python: `# Python Example: Data Processing with Pandas
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from typing import List, Dict, Optional

class DataProcessor:
    """A class for processing and analyzing data."""

    def __init__(self, data_path: str):
        self.data_path = data_path
        self.df = None

    def load_data(self) -> pd.DataFrame:
        """Load data from CSV file."""
        try:
            self.df = pd.read_csv(self.data_path)
            print(f"Data loaded successfully. Shape: {self.df.shape}")
            return self.df
        except FileNotFoundError:
            print(f"Error: File not found at {self.data_path}")
            return pd.DataFrame()

    def clean_data(self) -> pd.DataFrame:
        """Clean the data by handling missing values."""
        if self.df is None:
            raise ValueError("Data not loaded. Call load_data() first.")

        # Remove duplicates
        self.df = self.df.drop_duplicates()

        # Handle missing values
        numeric_columns = self.df.select_dtypes(include=[np.number]).columns
        self.df[numeric_columns] = self.df[numeric_columns].fillna(self.df[numeric_columns].median())

        return self.df

    def analyze_data(self) -> Dict[str, any]:
        """Perform basic data analysis."""
        if self.df is None:
            raise ValueError("Data not loaded.")

        analysis = {
            'shape': self.df.shape,
            'columns': list(self.df.columns),
            'data_types': self.df.dtypes.to_dict(),
            'missing_values': self.df.isnull().sum().to_dict(),
            'numeric_summary': self.df.describe().to_dict()
        }

        return analysis`,

  sql: `-- SQL Example: Complex Query with Joins and Aggregations
-- Get top performing users with their orders and revenue
WITH
user_stats AS (
    SELECT
        u.id,
        u.name,
        u.email,
        u.created_at,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MAX(o.created_at) as last_order_date
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE o.status = 'completed'
    GROUP BY u.id, u.name, u.email, u.created_at
),
user_segments AS (
    SELECT
        *,
        CASE
            WHEN total_spent > 1000 THEN 'VIP'
            WHEN total_spent > 500 THEN 'Premium'
            WHEN total_spent > 100 THEN 'Regular'
            ELSE 'New'
        END as customer_segment
    FROM user_stats
)
SELECT
    id,
    name,
    email,
    total_orders,
    total_spent,
    avg_order_value,
    last_order_date,
    customer_segment,
    RANK() OVER (ORDER BY total_spent DESC) as spending_rank
FROM user_segments
WHERE total_orders > 0
ORDER BY total_spent DESC
LIMIT 100;`,

  css: `/* CSS Example: Modern Responsive Design with CSS Grid and Flexbox */
.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 2rem;
  color: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.card:hover::before {
  transform: translateY(0);
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.card-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}`
}

const aiMessageContent = `I'll help you create a comprehensive React component with TypeScript. Here's a modern implementation that includes all the features you requested:

\`\`\`typescript
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
  className?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
}

const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onUpdate,
  className
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData(userId);
  }, [userId]);

  const fetchUserData = useCallback(async (id: string) => {
    try {
      const response = await fetch(\`/api/users/\${id}\`);
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) return <div>Loading user data...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <Card className={className}>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <Badge variant="secondary">{user.role}</Badge>
    </Card>
  );
};

export default UserProfile;
\`\`\`

This component includes:

- **TypeScript interfaces** for type safety
- **Async data fetching** with proper error handling
- **Loading states** and error boundaries
- **Customizable styling** with className prop
- **Responsive design** with Tailwind CSS

The component uses modern React patterns like hooks and is fully accessible. You can customize the styling by passing different props or modifying the CSS classes.

For the API endpoint, you'll need to create \`/api/users/[id]\` that returns user data in JSON format.`

export default function CodeSnippetDemo() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopy = async (code: string, language: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(language)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Code2 className="h-8 w-8 text-primary" />
          Code Snippet Component Demo
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A modern, accessible code snippet component with automatic language detection,
          syntax highlighting, copy functionality, and theme awareness.
        </p>
      </div>

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="languages">Languages</TabsTrigger>
          <TabsTrigger value="ai-message">AI Messages</TabsTrigger>
          <TabsTrigger value="customization">Customization</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
              <CardDescription>
                All the features included in the Code Snippet component
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Automatic Language Detection
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Detects programming languages from code patterns automatically
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Syntax Highlighting
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Beautiful syntax highlighting with 20+ themes
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Copy to Clipboard
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    One-click copy with visual feedback and fallback support
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Theme Awareness
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically adapts to light/dark theme changes
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Responsive Design
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Works perfectly on all screen sizes with proper scrolling
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Accessibility
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Keyboard navigation and screen reader support
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Basic Usage Example</CardTitle>
              <CardDescription>
                Simple implementation with automatic language detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeSnippet
                code={`import React from 'react';
import CodeSnippet from '@/components/code-snippet';

const MyComponent = () => {
  const code = \`console.log('Hello, World!');\`;

  return (
    <CodeSnippet
      code={code}
      language="javascript"
      showCopyButton={true}
      showLanguageBadge={true}
    />
  );
};`}
                autoDetectLanguage={true}
                maxHeight="250px"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="languages" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(sampleCode).map(([language, code]) => (
              <Card key={language}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize">{language}</CardTitle>
                    <Badge variant="outline">{language}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CodeSnippet
                    code={code}
                    language={language}
                    maxHeight="300px"
                    showCopyButton={true}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai-message" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Message Integration</CardTitle>
              <CardDescription>
                How the Code Snippet component integrates with AI chat messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <AIMessage
                  content={aiMessageContent}
                  timestamp="2:30 PM"
                  isAI={true}
                  authorName="AI Assistant"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Parser Features</CardTitle>
              <CardDescription>
                Automatic detection and formatting of code blocks in text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Supported Formats:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Markdown code blocks: \`\`\`language\ncode\`\`\`</li>
                  <li>• Inline code: \`code snippet\`</li>
                  <li>• Automatic language detection</li>
                  <li>• Multiple code blocks in one message</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customization Options</CardTitle>
              <CardDescription>
                All the ways you can customize the Code Snippet component
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Component Props</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <pre>{`interface CodeSnippetProps {
  code: string                    // Required: The code content
  language?: string               // Optional: Programming language
  title?: string                  // Optional: Custom title
  showCopyButton?: boolean        // Default: true
  showLanguageBadge?: boolean     // Default: true
  maxHeight?: string              // Default: "400px"
  className?: string              // Optional: Custom styling
  autoDetectLanguage?: boolean    // Default: true
}`}</pre>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Theme Examples</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CodeSnippet
                      code={`// Light Theme Example
const lightTheme = {
  background: '#ffffff',
  foreground: '#000000',
  primary: '#007acc'
};`}
                      language="javascript"
                      title="Light Theme"
                      className="border-2"
                    />
                    <CodeSnippet
                      code={`// Dark Theme Example
const darkTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  primary: '#569cd6'
};`}
                      language="javascript"
                      title="Dark Theme"
                      className="border-2 border-primary"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}