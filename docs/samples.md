<!-- Samples for template -->

{
id: "react-app",
name: "React App",
description: "Modern React application with TypeScript",
icon: Code,
tags: ["React", "TypeScript", "Vite"],
color: "bg-blue-500",
// 👇 Structure updated with nested 'children'
structure: [
{
name: "index.html",
type: "file",
content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>React App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>`,
},
{
name: "src",
type: "folder",
children: [
{
name: "main.tsx",
type: "file",
content: `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App.tsx'\nimport './index.css'\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n <React.StrictMode>\n <App />\n </React.StrictMode>,\n)`,
},
{
name: "App.tsx",
type: "file",
content: `function App() {\n return (\n <h1>Hello, React!</h1>\n )\n}\n\nexport default App`,
},
{
name: "index.css",
type: "file",
content: `body { margin: 0; font-family: sans-serif; }`,
},
],
},
],
},
{
id: "nextjs-app",
name: "Next.js App",
description: "Full-stack Next.js application",
icon: Globe,
tags: ["Next.js", "React", "TypeScript"],
color: "bg-black",
// 👇 Structure updated with nested 'children'
structure: [
{
name: "app",
type: "folder",
children: [
{
name: "layout.tsx",
type: "file",
content: `export default function RootLayout({ children }: { children: React.ReactNode }) {\n return (\n <html lang="en">\n <body>{children}</body>\n </html>\n )\n}`,
},
{
name: "page.tsx",
type: "file",
content: `export default function Home() {\n return <h1>Hello, Next.js!</h1>\n}`,
},
],
},
{ name: "public", type: "folder", children: [] },
],
},
{
id: "vue-app",
name: "Vue.js App",
description: "Vue.js application with Composition API",
icon: Zap,
tags: ["Vue.js", "TypeScript", "Vite"],
color: "bg-green-500",
// 👇 Structure updated with nested 'children'
structure: [
{
name: "index.html",
type: "file",
content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8">\n    <title>Vue App</title>\n  </head>\n  <body>\n    <div id="app"></div>\n    <script type="module" src="/src/main.ts"></script>\n  </body>\n</html>`,
},
{
name: "src",
type: "folder",
children: [
{
name: "main.ts",
type: "file",
content: `import { createApp } from 'vue'\nimport App from './App.vue'\n\ncreateApp(App).mount('#app')`,
},
{
name: "App.vue",
type: "file",
content: `<template>\n <h1>Hello, Vue!</h1>\n</template>`,
},
],
},
],
},
{
id: "mobile-app",
name: "React Native",
description: "Cross-platform mobile application",
icon: Smartphone,
tags: ["React Native", "Expo", "TypeScript"],
color: "bg-purple-500",
// 👇 This structure is already flat and correct
structure: [
{
name: "App.tsx",
type: "file",
content: `import { StatusBar } from 'expo-status-bar';\nimport { StyleSheet, Text, View } from 'react-native';\n\nexport default function App() {\n  return (\n    <View style={styles.container}>\n      <Text>Hello, React Native!</Text>\n      <StatusBar style="auto" />\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n    backgroundColor: '#fff',\n    alignItems: 'center',\n    justifyContent: 'center',\n  },\n});`,
},
{ name: "assets", type: "folder", children: [] },
],
},
{
id: "game",
name: "Game Project",
description: "2D/3D game development",
icon: Gamepad2,
tags: ["JavaScript", "Canvas", "WebGL"],
color: "bg-red-500",
// 👇 This structure is already flat and correct
structure: [
{
name: "index.html",
type: "file",
content: `<!DOCTYPE html>\n<html>\n<head>\n <title>Game</title>\n <link rel="stylesheet" href="style.css">\n</head>\n<body>\n <canvas id="gameCanvas" width="800" height="600"></canvas>\n <script src="game.js"></script>\n</body>\n</html>`,
},
{
name: "style.css",
type: "file",
content: `body { margin: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }\ncanvas { border: 1px solid white; }`,
},
{
name: "game.js",
type: "file",
content: `const canvas = document.getElementById('gameCanvas');\nconst ctx = canvas.getContext('2d');\n\nfunction gameLoop() {\n ctx.fillStyle = 'black';\n ctx.fillRect(0, 0, canvas.width, canvas.height);\n\n ctx.fillStyle = 'white';\n ctx.font = '48px sans-serif';\n ctx.fillText('Hello, Game Dev!', 200, 300);\n\n requestAnimationFrame(gameLoop);\n}\n\ngameLoop();`,
},
],
},
{
id: "ai-project",
name: "AI/ML Project",
description: "Machine learning and AI project",
icon: Bot,
tags: ["Python", "TensorFlow", "PyTorch"],
color: "bg-orange-500",
// 👇 This structure is already flat and correct
structure: [
{
name: "main.py",
type: "file",
content: `def main():\n    print("Hello, AI World!")\n\nif __name__ == "__main__":\n    main()`,
},
{ name: "data", type: "folder", children: [] },
{
name: "README.md",
type: "file",
content: `# AI Project\n\nThis is a placeholder for the AI/ML project.`,
},
],
},
{
id: "api",
name: "REST API",
description: "Backend API with Node.js",
icon: Database,
tags: ["Node.js", "Express", "MongoDB"],
color: "bg-indigo-500",
// 👇 This structure is already flat and correct
structure: [
{
name: "index.js",
type: "file",
content: `const express = require('express');\nconst app = express();\nconst port = 3001;\n\napp.get('/', (req, res) => {\n res.send('Hello, API!');\n});\n\napp.listen(port, () => {\n console.log(\`Server running at http://localhost:\${port}\`);\n});`,
},
{
name: "package.json",
type: "file",
content: `{ "name": "api-server", "version": "1.0.0", "main": "index.js", "scripts": { "start": "node index.js" }, "dependencies": { "express": "^4.18.2" } }`,
},
],
},
{
id: "static-site",
name: "Static Website",
description: "Static website with HTML/CSS/JS",
icon: Palette,
tags: ["HTML", "CSS", "JavaScript"],
color: "bg-pink-500",
// 👇 This structure is already flat and correct
structure: [
{
name: "index.html",
type: "file",
content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n <meta charset="UTF-8">\n <meta name="viewport" content="width=device-width, initial-scale=1.0">\n <title>My Project</title>\n <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n <h1>Hello, World!</h1>\n <script src="script.js"></script>\n</body>\n</html>`,
},
{
name: "styles.css",
type: "file",
content: `body {\n font-family: sans-serif;\n display: grid;\n place-content: center;\n height: 100vh;\n margin: 0;\n}`,
},
{
name: "script.js",
type: "file",
content: `console.log("Hello from your new project!");`,
},
],
},
