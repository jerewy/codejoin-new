'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Share2,
  Copy,
  Mail,
  Eye,
  Edit3,
  Trash2,
  Link,
  UserPlus,
  Globe,
  Lock
} from "lucide-react"
import { toast } from "sonner"

interface ProjectSharingModalProps {
  projectId: string
  projectName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface SharedUser {
  id: string
  email: string
  name?: string
  avatar?: string
  role: 'viewer' | 'editor' | 'admin'
  addedAt: Date
}

export default function ProjectSharingModal({
  projectId,
  projectName,
  isOpen,
  onOpenChange,
}: ProjectSharingModalProps) {
  const [shareLink, setShareLink] = useState(`${window.location.origin}/project/${projectId}`)
  const [linkAccess, setLinkAccess] = useState<'private' | 'view' | 'edit'>('private')
  const [emailToAdd, setEmailToAdd] = useState('')
  const [roleToAdd, setRoleToAdd] = useState<'viewer' | 'editor'>('viewer')
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([
    {
      id: '1',
      email: 'john@example.com',
      name: 'John Doe',
      avatar: '/placeholder.svg',
      role: 'editor',
      addedAt: new Date(2024, 0, 15)
    },
    {
      id: '2',
      email: 'sarah@example.com',
      name: 'Sarah Wilson',
      role: 'viewer',
      addedAt: new Date(2024, 0, 20)
    }
  ])

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      toast.success('Share link copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const addUserByEmail = async () => {
    if (!emailToAdd) return

    // Simulate API call
    const newUser: SharedUser = {
      id: Date.now().toString(),
      email: emailToAdd,
      role: roleToAdd,
      addedAt: new Date()
    }

    setSharedUsers(prev => [...prev, newUser])
    setEmailToAdd('')
    setRoleToAdd('viewer')
    toast.success(`Invitation sent to ${emailToAdd}`)
  }

  const removeUser = (userId: string) => {
    setSharedUsers(prev => prev.filter(user => user.id !== userId))
    toast.success('User removed from project')
  }

  const updateUserRole = (userId: string, newRole: SharedUser['role']) => {
    setSharedUsers(prev =>
      prev.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    )
    toast.success('User role updated')
  }

  const updateLinkAccess = (access: 'private' | 'view' | 'edit') => {
    setLinkAccess(access)
    // Generate different link based on access level
    const baseUrl = `${window.location.origin}/project/${projectId}`
    switch (access) {
      case 'view':
        setShareLink(`${baseUrl}?access=view`)
        break
      case 'edit':
        setShareLink(`${baseUrl}?access=edit`)
        break
      default:
        setShareLink(baseUrl)
    }
  }

  const getRoleColor = (role: SharedUser['role']) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'editor': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: SharedUser['role']) => {
    switch (role) {
      case 'admin': return <Lock className="h-3 w-3" />
      case 'editor': return <Edit3 className="h-3 w-3" />
      case 'viewer': return <Eye className="h-3 w-3" />
      default: return <Eye className="h-3 w-3" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{projectName}"
          </DialogTitle>
          <DialogDescription>
            Collaborate with others by sharing your project
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 px-1">
          {/* Link Sharing */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Label className="text-base font-medium">Share with link</Label>
              <Select value={linkAccess} onValueChange={updateLinkAccess}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Private
                    </div>
                  </SelectItem>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View only
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      Can edit
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Input value={shareLink} readOnly className="flex-1" />
              <Button onClick={copyShareLink} variant="outline" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {linkAccess !== 'private' && (
              <p className="text-sm text-muted-foreground">
                {linkAccess === 'view'
                  ? 'Anyone with this link can view the project'
                  : 'Anyone with this link can view and edit the project'
                }
              </p>
            )}
          </div>

          <Separator />

          {/* Add People */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Add people</Label>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Enter email address"
                value={emailToAdd}
                onChange={(e) => setEmailToAdd(e.target.value)}
                className="flex-1"
              />
              <div className="flex gap-2">
                <Select value={roleToAdd} onValueChange={(value: 'viewer' | 'editor') => setRoleToAdd(value)}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addUserByEmail} disabled={!emailToAdd} className="shrink-0">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Current Collaborators */}
          <div className="space-y-4">
            <Label className="text-base font-medium">
              People with access ({sharedUsers.length})
            </Label>

            <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
              {sharedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {user.avatar && (
                      <img
                        src={user.avatar}
                        alt={user.name || user.email}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {user.name || user.email}
                      </span>
                      {user.name && (
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`${getRoleColor(user.role)} flex items-center gap-1`}
                    >
                      {getRoleIcon(user.role)}
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>

                    <Select
                      value={user.role}
                      onValueChange={(value: SharedUser['role']) => updateUserRole(user.id, value)}
                    >
                      <SelectTrigger className="w-20 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUser(user.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex justify-end gap-2 pt-3 border-t mt-3 flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}