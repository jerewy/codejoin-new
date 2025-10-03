# CodeJoin - AI-Powered Collaborative Coding Platform

A real-time collaborative coding platform where students can learn programming together through peer interaction and AI-powered assistance.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker (for backend code execution)
- 4GB RAM recommended

### Frontend Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open your browser**
   ```
   http://localhost:3000
   ```

### Supabase Configuration

Marketing and other unauthenticated pages render without any Supabase credentials. To enable sign-up flows, dashboards, and any authenticated experience, create a `.env.local` file with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
```

When the variables are not provided, the UI treats visitors as logged out, disables Supabase-driven actions, and surfaces explanatory messages on protected routes. Add the values and restart the dev server to unlock full functionality.

### Backend Setup (Code Execution Service)

1. **Navigate to backend directory**
   ```bash
   cd code-execution-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Pull Docker images for code execution**
   ```bash
   npm run docker:build
   ```

5. **Start the backend server**
   ```bash
   npm start
   # or for development with auto-restart
   npm run dev
   ```

The backend will run on `http://localhost:3001`

## 📁 Project Structure

```
codejoin-new/
├── components/              # React components
│   ├── code-editor.tsx     # Monaco-based code editor
│   ├── project-workspace.tsx # Main workspace interface
│   └── backend-status.tsx   # Backend connection status
├── lib/                    # Utility libraries
│   └── api/               # API integration layer
├── code-execution-backend/ # Docker-based code execution service
│   ├── src/               # Backend source code
│   ├── docker/            # Docker configurations
│   └── scripts/           # Setup and utility scripts
└── ...
```

## 🛠️ Available Scripts

### Frontend Commands

- `npm run dev` - Start development server (Next.js)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Backend Commands

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run docker:build` - Pull/build required Docker images
- `npm test` - Run tests

## 🔧 Technology Stack

### Frontend
- **Next.js 15** - React framework with SSR
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Monaco Editor** - VS Code-like code editor
- **Radix UI** - Accessible component library

### Backend
- **Node.js & Express** - Server runtime and framework
- **Docker** - Secure code execution isolation
- **Winston** - Logging
- **Rate Limiting** - API protection

## 📚 Features

### Current Features
- Real-time collaborative code editor
- Multi-language syntax highlighting
- Backend code execution service (20+ languages)
- Project workspace management
- Backend connection monitoring

### Planned Features (from PRD)
- AI code assistant integration
- Room-based collaboration
- Real-time chat and communication
- User authentication and profiles
- Project templates and sharing

## 🔒 Security

The code execution backend includes comprehensive security measures:
- Docker container isolation
- No network access for executed code
- Resource limits (memory, CPU, time)
- Non-root user execution
- Input validation and sanitization

## 🌐 API Endpoints

### Code Execution API (`localhost:3001`)

- `POST /api/execute` - Execute code in secure container
- `GET /api/languages` - Get supported programming languages
- `GET /api/system` - System information (requires API key)
- `GET /health` - Health check endpoint

Example code execution:
```javascript
const response = await fetch('http://localhost:3001/api/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    language: 'python',
    code: 'print("Hello, World!")',
    input: '',
    timeout: 10000
  })
});
```

## 📖 Documentation

- [Handling Missing Supabase Configuration](docs/supabase-missing-config.md) - Background, fixes, and workflows for optional Supabase credentials
- [Backend Documentation](code-execution-backend/README.md) - Detailed backend setup and API docs
- [Product Requirements](prd.md) - Complete product specification

## ✅ Current Status & Working Features

### ✅ Completed (Session 2025-09-23)
- **Backend Code Execution**: Fully working with Docker containers
- **11 Programming Languages Supported**: Python, Java, JavaScript, C++, C, Go, Rust, etc.
- **Security Features**: Container isolation, resource limits, no network access
- **API Integration**: RESTful API with authentication (`X-API-Key: test123`)
- **Performance**: Fast execution (Python ~350ms, Java ~930ms)
- **UI Layout**: Fixed VS Code-like layout with no scrolling
- **Monaco Editor**: Dark theme properly configured
- **Container Fixes**: Resolved Docker execution and file handling issues

### ✅ Supported Languages (11 Essential Languages)

**Essential Core (5):**
- **JavaScript** ✅ - 450ms execution time - Web development, Node.js backends
- **Python** ✅ - 350ms execution time - Data science, AI/ML, automation
- **Java** ✅ - 930ms execution time - Enterprise apps, Android development
- **TypeScript** 🔄 - Type-safe JavaScript for larger projects
- **SQL** 🔄 - Database management (SQLite for demos)

**Specialized but Very Popular (6):**
- **C#** 🔄 - Microsoft ecosystem, game development
- **Go** 🔄 - Modern backend services, cloud infrastructure
- **Rust** 🔄 - System programming, performance-critical apps
- **Swift** 🔄 - iOS/macOS development
- **C++** 🔄 - System programming, game engines, high-performance
- **C** 🔄 - System programming, embedded systems

**Legend:** ✅ Tested & Working | 🔄 Configured & Ready

### 🔧 Recent Session Fixes (2025-09-23)
- **Docker Backend Issues**: Fixed container execution, file copying, and timeout handling
- **Java Configuration**: Updated to use `code-exec-multi` image instead of `openjdk:17-alpine`
- **UI Layout Problems**: Fixed header disappearing and viewport scrolling issues
- **Monaco Editor Theme**: Resolved white background, now properly displays VS Code dark theme
- **Container Security**: Maintained all security restrictions while fixing execution
- **Performance**: All languages now execute within expected timeframes

### 🔧 Next Development Priorities
1. **Frontend Integration** - Connect React frontend to backend API
2. **Language Selector UI** - Dropdown for choosing from 12 essential languages
3. **Real-time Collaboration** - Multiple users editing same code
4. **AI Assistant Integration** - Code suggestions and help
5. **User Authentication** - Login/registration system
6. **Project Management** - Save/load projects
7. **Chat System** - Real-time communication between collaborators

### 🚀 How to Continue Development

**Backend is ready!** Start with frontend integration:
```bash
# Backend (already working)
cd code-execution-backend && npm run dev  # Port 3001

# Frontend (needs API integration)
npm run dev  # Port 3000
```

### 🐳 Docker prerequisites for the execution service

- The majority of languages (Java, TypeScript, SQL, C#, Go, Rust) now run inside the consolidated `code-exec-multi` image. Build or refresh it locally with `cd code-execution-backend && npm run docker:build` before running tests that touch those languages.
- Ensure Docker Desktop (Windows/macOS) or the Docker daemon (`dockerd`) on Linux is running. When Docker is offline the backend logs show `Docker connection failed: Unknown error`, and language tests exit with "Docker is not running or not accessible".
- If you prefer to use language-specific base images again, adjust `code-execution-backend/src/config/languages.js` and rebuild the relevant images. The backend will pick up the change on the next execution.

**API Usage Example**:
```javascript
// Execute Python code
fetch('http://localhost:3001/api/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'test123'
  },
  body: JSON.stringify({
    language: 'python',
    code: 'print("Hello World")'
  })
})
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.
