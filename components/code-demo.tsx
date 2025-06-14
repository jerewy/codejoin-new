"use client"

import { useState, useEffect } from "react"

export default function CodeDemo() {
  const [currentFrame, setCurrentFrame] = useState(0)
  const frames = [
    {
      code: `function calculateTotal(items) {
  return items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
}`,
      cursor: { line: 2, ch: 10 },
      user: "Sarah",
    },
    {
      code: `function calculateTotal(items) {
  return items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
}`,
      cursor: { line: 2, ch: 17 },
      user: "Mike",
    },
    {
      code: `function calculateTotal(items) {
  // Apply discount if available
  return items.reduce((total, item) => {
    const itemTotal = item.price * item.quantity;
    return total + itemTotal;
  }, 0);
}`,
      cursor: { line: 4, ch: 12 },
      user: "Sarah",
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const frame = frames[currentFrame]

  return (
    <div className="rounded-md overflow-hidden">
      <div className="bg-zinc-800 text-white p-2 flex justify-between items-center">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="text-xs">collaborative-editor.js</div>
        <div className="text-xs px-2 py-1 bg-zinc-700 rounded-md">{frame.user} is typing...</div>
      </div>
      <div className="bg-zinc-900 text-white p-4 font-mono text-sm h-[300px] overflow-auto">
        <pre className="whitespace-pre-wrap">
          {frame.code.split("\n").map((line, i) => (
            <div key={i} className="leading-6">
              {line}
              {i === frame.cursor.line && (
                <span className="inline-block w-0.5 h-5 bg-white animate-blink ml-0.5"></span>
              )}
            </div>
          ))}
        </pre>
      </div>
      <div className="bg-zinc-800 text-white p-2 flex justify-between items-center text-xs">
        <div>JavaScript</div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>2 users online</span>
        </div>
      </div>
    </div>
  )
}
