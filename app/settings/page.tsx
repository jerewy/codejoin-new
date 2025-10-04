"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Settings,
  Palette,
  Bell,
  Shield,
  CreditCard,
  Github,
  Key,
  Moon,
  Sun,
  Monitor,
  Zap,
  Globe,
  ArrowLeft,
} from "lucide-react";
import { useTheme } from "next-themes";
import NavLinks from "@/components/nav-links";
import ProfileSettingsCard from "@/components/profile-settings-card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    collaboration: true,
    updates: true,
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          {/* Left side: Icon + Title */}
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 container py-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <ProfileSettingsCard />
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Choose your preferred theme for the interface.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div
                    className={`border rounded-lg p-4 cursor-pointer ${
                      theme === "light" ? "border-primary" : ""
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="h-4 w-4" />
                      <span className="font-medium">Light</span>
                    </div>
                    <div className="w-full h-20 bg-white border rounded"></div>
                  </div>
                  <div
                    className={`border rounded-lg p-4 cursor-pointer ${
                      theme === "dark" ? "border-primary" : ""
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="h-4 w-4" />
                      <span className="font-medium">Dark</span>
                    </div>
                    <div className="w-full h-20 bg-zinc-900 border rounded"></div>
                  </div>
                  <div
                    className={`border rounded-lg p-4 cursor-pointer ${
                      theme === "system" ? "border-primary" : ""
                    }`}
                    onClick={() => setTheme("system")}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="h-4 w-4" />
                      <span className="font-medium">System</span>
                    </div>
                    <div className="w-full h-20 bg-gradient-to-r from-white to-zinc-900 border rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Password & Authentication</CardTitle>
                <CardDescription>
                  Manage your account security settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <Label>New Password</Label>
                    <Input type="password" placeholder="Enter new password" />
                  </div>
                  <div>
                    <Label>Confirm New Password</Label>
                    <Input type="password" placeholder="Confirm new password" />
                  </div>
                  <Button>Update Password</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
