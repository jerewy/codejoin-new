"use client"

import React from "react"
import AIMessageParser from "@/components/ai-message-parser"

// Test content with various code formats
const testContent = `
Hello! I'm here to help you with various programming languages and code examples.

## JavaScript Example

Here's a modern React component with hooks:

\`\`\`javascript
import React, { useState, useEffect } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
};

export default Counter;
\`\`\`

## Python Example

A simple Flask API endpoint:

\`\`\`python
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/users', methods=['GET', 'POST'])
def users():
    if request.method == 'POST':
        data = request.get_json()
        # Create new user logic here
        return jsonify({"message": "User created"}), 201

    # Get all users logic here
    return jsonify({"users": []})

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

## TypeScript Example

Type-safe interfaces and generics:

\`\`\`typescript:types.ts
interface User<T = any> {
  id: number;
  name: string;
  email: string;
  data?: T;
}

class UserService<T> {
  private users: User<T>[] = [];

  addUser(user: User<T>): void {
    this.users.push(user);
  }

  findUser(id: number): User<T> | undefined {
    return this.users.find(u => u.id === id);
  }
}
\`\`\`

## CSS Example

Modern CSS with flexbox and grid:

\`\`\`css
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  padding: 2rem;
}

.card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
}
\`\`\`

## SQL Example

Complex query with joins:

\`\`\`sql
SELECT
  u.id,
  u.name,
  u.email,
  COUNT(o.id) as order_count,
  SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
  AND o.status = 'completed'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC
LIMIT 10;
\`\`\`

## Inline Code Examples

You can use inline code like \`const name = "John"\` or \`function getData() {}\` in your text.

Here's a longer inline code example that should be converted to a block: \`const veryLongVariableName = "This is a very long inline code example that should be converted to a code block because it exceeds the maximum length limit"\`

## Mixed Content

Here's some text with \`console.log("debug info")\` inline code, followed by a full code block:

\`\`\`bash
#!/bin/bash

# Deploy script
echo "Starting deployment..."

# Build the application
npm run build

# Deploy to production
rsync -avz build/ user@server:/var/www/html/

echo "Deployment completed!"
\`\`\`

## Edge Cases

### Unclosed code block (should still render):
\`\`\`javascript
const incomplete = function() {
  console.log("This block is not properly closed");

### Empty code block:
\`\`\`html

\`\`\`

### Code with special characters:
\`\`\`regex
const pattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
\`\`\`

## Auto-detection Example

This function definition should be detected automatically:

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

And this CSS rule should also be detected:

.button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
}

That's all the examples! Feel free to ask for more specific code samples.
`

export default function TestCodeSnippets() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Code Snippet Parser Test</h1>

      <div className="space-y-6">
        <div className="p-4 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Parsed AI Response</h2>
          <AIMessageParser
            content={testContent}
            codeSnippetProps={{
              showLineNumbers: true,
              copyable: true,
              collapsible: true,
              theme: 'auto'
            }}
            enableAutoDetection={true}
            maxInlineLength={50}
          />
        </div>
      </div>
    </div>
  )
}