"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    collaboration: true,
    updates: true,
  })

  const [profile, setProfile] = useState({
    name: "John Doe",
    email: "john@example.com",
    bio: "Full-stack developer passionate about collaborative coding",
    location: "San Francisco, CA",
    website: "https://johndoe.dev",
  })

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 container py-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="billing">
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Zap className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and public profile.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      Change Avatar
                    </Button>
                    <p className="text-sm text-muted-foreground mt-1">JPG, PNG or GIF. Max size 2MB.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Choose your preferred theme for the interface.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div
                    className={`border rounded-lg p-4 cursor-pointer ${theme === "light" ? "border-primary" : ""}`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="h-4 w-4" />
                      <span className="font-medium">Light</span>
                    </div>
                    <div className="w-full h-20 bg-white border rounded"></div>
                  </div>
                  <div
                    className={`border rounded-lg p-4 cursor-pointer ${theme === "dark" ? "border-primary" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="h-4 w-4" />
                      <span className="font-medium">Dark</span>
                    </div>
                    <div className="w-full h-20 bg-zinc-900 border rounded"></div>
                  </div>
                  <div
                    className={`border rounded-lg p-4 cursor-pointer ${theme === "system" ? "border-primary" : ""}`}
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

            <Card>
              <CardHeader>
                <CardTitle>Editor Preferences</CardTitle>
                <CardDescription>Customize your coding environment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Font Size</Label>
                    <Select defaultValue="14">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12px</SelectItem>
                        <SelectItem value="14">14px</SelectItem>
                        <SelectItem value="16">16px</SelectItem>
                        <SelectItem value="18">18px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tab Size</Label>
                    <Select defaultValue="2">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 spaces</SelectItem>
                        <SelectItem value="4">4 spaces</SelectItem>
                        <SelectItem value="8">8 spaces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Line Numbers</Label>
                      <p className="text-sm text-muted-foreground">Show line numbers in the editor</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Word Wrap</Label>
                      <p className="text-sm text-muted-foreground">Wrap long lines</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Save</Label>
                      <p className="text-sm text-muted-foreground">Automatically save changes</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified about activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Collaboration Updates</Label>
                      <p className="text-sm text-muted-foreground">When someone joins or edits your projects</p>
                    </div>
                    <Switch
                      checked={notifications.collaboration}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, collaboration: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Product Updates</Label>
                      <p className="text-sm text-muted-foreground">News about new features and updates</p>
                    </div>
                    <Switch
                      checked={notifications.updates}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, updates: checked })}
                    />
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
                <CardDescription>Manage your account security settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Current Password</Label>
                    <Input type="password" placeholder="Enter current password" />
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

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Secure your account with 2FA</p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage your API keys for integrations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Personal Access Token</p>
                    <p className="text-sm text-muted-foreground">Created on Dec 15, 2024</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Regenerate
                    </Button>
                    <Button variant="destructive" size="sm">
                      Revoke
                    </Button>
                  </div>
                </div>
                <Button>
                  <Key className="h-4 w-4 mr-2" />
                  Generate New Token
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Settings */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Manage your subscription and billing information.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Pro Plan</h3>
                      <Badge>Current</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">$12/month • Renews on Jan 15, 2025</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Change Plan</Button>
                    <Button variant="destructive">Cancel</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Update your payment information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-6 bg-blue-600 rounded text-white text-xs flex items-center justify-center">
                      VISA
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/26</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Update
                  </Button>
                </div>
                <Button variant="outline">Add Payment Method</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Settings */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Connect your accounts to sync data and enable features.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Github className="h-6 w-6" />
                    <div>
                      <p className="font-medium">GitHub</p>
                      <p className="text-sm text-muted-foreground">Connected as @johndoe</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Disconnect
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Globe className="h-6 w-6" />
                    <div>
                      <p className="font-medium">Vercel</p>
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Connect
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Zap className="h-6 w-6" />
                    <div>
                      <p className="font-medium">OpenAI</p>
                      <p className="text-sm text-muted-foreground">Connected</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Settings</CardTitle>
                <CardDescription>Configure AI features and preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Code Suggestions</Label>
                    <p className="text-sm text-muted-foreground">Enable AI-powered code completion</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Voice Assistant</Label>
                    <p className="text-sm text-muted-foreground">Enable voice interactions with AI</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select defaultValue="gpt-4">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4 (Recommended)</SelectItem>
                      <SelectItem value="gpt-3.5">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="claude">Claude 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
