// It's a good practice to define the shapes of your data.
// These types can be moved to a central 'types.ts' file later if you want.

export type Collaborator = {
  id: number;
  name: string;
  avatar: string;
  status: "online" | "away";
  cursor: { line: number; ch: number } | null;
};

export type ProjectFile = {
  name: string;
  type: "file";
  language: string;
  content: string;
};

export type Extension = {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  rating: number;
  downloads: number;
  icon: string;
  installed: boolean;
  enabled: boolean;
};

export type LanguageOption = {
  value: string;
  label: string;
};

// --- MOCK DATA ARRAYS ---

export const mockCollaborators: Collaborator[] = [
  {
    id: 1,
    name: "Sarah Chen",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "online",
    cursor: { line: 15, ch: 8 },
  },
  {
    id: 2,
    name: "Mike Rodriguez",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "online",
    cursor: { line: 23, ch: 12 },
  },
  {
    id: 3,
    name: "Alex Kim",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "away",
    cursor: null,
  },
];

export const mockFiles: ProjectFile[] = [
  {
    name: "index.html",
    type: "file",
    language: "html",
    content: `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CodeJoin Project</title>
      <link rel="stylesheet" href="styles.css">
  </head>
  <body>
      <div class="container">
          <h1>Welcome to CodeJoin</h1>
          <p>Real-time collaborative coding platform</p>
          <button onclick="showMessage()">Click me!</button>
          <div id="output"></div>
      </div>
      <script src="script.js"></script>
  </body>
  </html>`,
  },
  {
    name: "styles.css",
    type: "file",
    language: "css",
    content: `body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      min-height: 100vh;
  }
  .container {
      max-width: 800px;
      margin: 0 auto;
      text-align: center;
      padding: 50px 20px;
  }
  h1 {
      font-size: 3rem;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  }
  p {
      font-size: 1.2rem;
      margin-bottom: 30px;
      opacity: 0.9;
  }
  button {
      background: #ff6b6b;
      color: white;
      border: none;
      padding: 15px 30px;
      font-size: 1.1rem;
      border-radius: 25px;
      cursor: pointer;
      transition: transform 0.2s;
  }
  button:hover {
      transform: translateY(-2px);
  }
  #output {
      margin-top: 20px;
      padding: 20px;
      background: rgba(255,255,255,0.1);
      border-radius: 10px;
      min-height: 50px;
  }`,
  },
  {
    name: "script.js",
    type: "file",
    language: "javascript",
    content: `function showMessage() {
      const output = document.getElementById('output');
      const messages = [
          'Hello from CodeJoin!',
          'Collaborative coding is awesome!',
          'Real-time updates are working!',
          'AI suggestions coming soon...'
      ];
      
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      output.innerHTML = '<h3>' + randomMessage + '</h3>';
      
      // Add some animation
      output.style.transform = 'scale(0.95)';
      setTimeout(() => {
          output.style.transform = 'scale(1)';
      }, 100);
  }
  
  // Simulate real-time collaboration
  setInterval(() => {
      console.log('Checking for updates...');
  }, 5000);`,
  },
  {
    name: "app.py",
    type: "file",
    language: "python",
    content: `from flask import Flask, jsonify
  
  app = Flask(__name__)
  
  @app.route('/api/data', methods=['GET'])
  def get_data():
      data = {
          'message': 'Hello from Python backend!',
          'status': 'success',
          'code': 200
      }
      return jsonify(data)
  
  if __name__ == '__main__':
      app.run(debug=True)`,
  },
  {
    name: "schema.sql",
    type: "file",
    language: "sql",
    content: `CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      owner_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,
  },
];

export const mockExtensions: Extension[] = [
  {
    id: "prettier",
    name: "Prettier",
    description: "Code formatter",
    author: "Prettier",
    version: "2.8.4",
    rating: 4.9,
    downloads: 15000000,
    icon: "/placeholder.svg?height=40&width=40",
    installed: true,
    enabled: true,
  },
  {
    id: "eslint",
    name: "ESLint",
    description: "Linting utility",
    author: "ESLint Team",
    version: "8.36.0",
    rating: 4.8,
    downloads: 12000000,
    icon: "/placeholder.svg?height=40&width=40",
    installed: true,
    enabled: true,
  },
  {
    id: "python",
    name: "Python",
    description: "Python language support",
    author: "Microsoft",
    version: "2023.6.0",
    rating: 4.7,
    downloads: 8000000,
    icon: "/placeholder.svg?height=40&width=40",
    installed: true,
    enabled: true,
  },
];

export const mockLanguageOptions: LanguageOption[] = [
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
];
