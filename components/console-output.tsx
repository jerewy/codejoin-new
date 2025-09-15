"use client";

import { useState, useEffect, useRef } from "react";

export default function ConsoleOutput() {
  const [logs] = useState([
    {
      type: "log",
      message: "Application started successfully",
      time: "14:32:01",
    },
    {
      type: "info",
      message: "Connected to development server",
      time: "14:32:02",
    },
    {
      type: "warn",
      message: "Deprecated function used in script.js:15",
      time: "14:32:05",
    },
    { type: "log", message: "User clicked button", time: "14:32:10" },
    {
      type: "error",
      message: "TypeError: Cannot read property of undefined",
      time: "14:32:15",
    },
  ]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getLogColor = (type: string) => {
    switch (type) {
      case "error":
        return "text-red-500";
      case "warn":
        return "text-yellow-500";
      case "info":
        return "text-blue-500";
      default:
        return "text-foreground";
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [logs]);

  return (
    <div className="w-full h-full flex flex-col font-mono text-sm">
      {/* 3. Attach the ref to the scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 space-y-1 p-4 overflow-y-auto"
      >
        {logs.map((log, index) => (
          <div key={index} className="flex gap-2">
            <span className="text-zinc-500 text-xs">{log.time}</span>
            <span className={`text-xs uppercase ${getLogColor(log.type)}`}>
              [{log.type}]
            </span>
            <span className={getLogColor(log.type)}>{log.message}</span>
          </div>
        ))}
      </div>

      {/* This prompt is the "fixed footer" - it will never scroll */}
      <div className="flex items-center border-t px-4 py-2">
        <span className="text-green-500">{">"}</span>
        <div className="w-2 h-4 bg-white ml-1 animate-pulse"></div>
      </div>
    </div>
  );
}
