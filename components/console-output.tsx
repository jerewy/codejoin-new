"use client";

import { useState } from "react";

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

  return (
    <div className="h-full bg-zinc-900 text-white font-mono text-sm p-4 overflow-auto">
      {logs.map((log, index) => (
        <div key={index} className="flex gap-2 mb-1">
          <span className="text-zinc-500 text-xs">{log.time}</span>
          <span className={`text-xs uppercase ${getLogColor(log.type)}`}>
            [{log.type}]
          </span>
          <span className={getLogColor(log.type)}>{log.message}</span>
        </div>
      ))}
      <div className="flex items-center">
        <span className="text-green-500">{">"}</span>
        <div className="w-2 h-4 bg-white ml-1 animate-pulse"></div>
      </div>
    </div>
  );
}
