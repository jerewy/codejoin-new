from pathlib import Path
import textwrap

path = Path('app/settings/page.tsx')
text = path.read_text()
text = text.replace('\r\n', '\n')

text = text.replace(
    'import { useState } from "react";\n',
    'import { useCallback, useEffect, useState, FormEvent } from "react";\n'
    'import { supabase } from "@/lib/supabaseClient";\n'
    'import { useToast } from "@/hooks/use-toast";\n'
)

anchor = 'import { SidebarTrigger } from "@/components/ui/sidebar";\n\n'
insertion = textwrap.dedent('''type ProfileFormState = {\n  name: string;\n  email: string;\n  bio: string;\n  location: string;\n  website: string;\n};\n\nconst createEmptyProfile = (): ProfileFormState => ({\n  name: "",\n  email: "",\n  bio: "",\n  location: "",\n  website: "",\n});\n\n''')
if anchor not in text:
    raise ValueError('Unable to locate sidebar import anchor')
text = text.replace(anchor, anchor + insertion, 1)

state_old = textwrap.dedent('''export default function SettingsPage() {\n  const { theme, setTheme } = useTheme();\n  const [notifications, setNotifications] = useState({\n    email: true,\n    push: false,\n    collaboration: true,\n    updates: true,\n  });\n\n  const [profile, setProfile] = useState({\n    name: "John Doe",\n    email: "john@example.com",\n    bio: "Full-stack developer passionate about collaborative coding",\n    location: "San Francisco, CA",\n    website: "https://johndoe.dev",\n  });\n\n  return (\n''')

state_new = textwrap.dedent('''export default function SettingsPage() {\n  const { theme, setTheme } = useTheme();\n  const { toast } = useToast();\n  const [notifications, setNotifications] = useState({\n    email: true,\n    push: false,\n    collaboration: true,\n    updates: true,\n  });\n\n  const [profile, setProfile] = useState<ProfileFormState>(() => createEmptyProfile());\n  const [initialProfile, setInitialProfile] = useState<ProfileFormState | null>(null);\n  const [isLoadingProfile, setIsLoadingProfile] = useState(true);\n  const [isSavingProfile, setIsSavingProfile] = useState(false);\n  const [profileError, setProfileError] = useState<string | null>(null);\n  const [userId, setUserId] = useState<string | null>(null);\n\n  const fetchProfile = useCallback(async () => {\n    setIsLoadingProfile(true);\n\n    try {\n      const { data, error } = await supabase.auth.getUser();\n\n      if (error) {\n        console.error("Failed to fetch Supabase user", error);\n        setProfile(createEmptyProfile());\n        setInitialProfile(null);\n        setUserId(null);\n        setProfileError("We couldn't load your profile right now.");\n        toast({\n          variant: "destructive",\n          title: "Failed to load profile",\n          description: error.message,\n        });\n        return;\n      }\n\n      const user = data?.user;\n\n      if (!user) {\n        setProfile(createEmptyProfile());\n        setInitialProfile(null);\n        setUserId(null);\n        setProfileError("You need to sign in to manage your profile.");\n        return;\n      }\n\n      setUserId(user.id);\n      const metadata = (user.user_metadata or {})\n      ensure_string = lambda value: value if isinstance(value, str) else ""\n\n      next_profile: dict[str, str] = {\n        "name": ensure_string(metadata.get("full_name"))\n        or ensure_string(metadata.get("fullName"))\n        or ensure_string(metadata.get("name"))\n        or "",\n        "email": user.email or "",\n        "bio": ensure_string(metadata.get("bio")),\n        "location": ensure_string(metadata.get("location")),\n        "website": ensure_string(metadata.get("website")),\n      }\n\n      profile_row_response = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybe_single()\n''')
