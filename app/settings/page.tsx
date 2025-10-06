"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useThemePersistent } from "@/hooks/use-theme-persistent";
import {
  ArrowLeft,
  Bell,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  User,
  Users,
  Zap,
} from "lucide-react";

import ProfileSettingsCard from "@/components/profile-settings-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { settingsAPI } from "@/lib/settings-api";
import { UserPreferences } from "@/types/settings";
import {
  getClientTheme,
  setClientThemeCookie,
} from "@/lib/theme-cookies-client";

type ThemeOption = "light" | "dark" | "system";

type PreferencesState = {
  theme: ThemeOption;
  language: string;
  timezone: string;
};

type NotificationState = {
  email: boolean;
  push: boolean;
  collaboration: boolean;
  product: boolean;
};

type PasswordState = {
  current: string;
  next: string;
  confirm: string;
};

const resolveLocalTimezone = (): string => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Ensure the detected timezone is in our options list
    if (timezone && timezoneOptions.includes(timezone)) {
      return timezone;
    }
    return "UTC";
  } catch (error) {
    console.error("Failed to resolve local timezone", error);
    return "UTC";
  }
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString();
};

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "ru", label: "Русский" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
];

const timezoneOptions = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "America/Denver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Africa/Johannesburg",
];

export default function SettingsPage() {
  const { theme: activeTheme, setTheme } = useThemePersistent();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [emailConfirmedAt, setEmailConfirmedAt] = useState<string | null>(null);
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false);

  const [preferences, setPreferences] = useState<PreferencesState>(() => ({
    theme: (activeTheme as ThemeOption) ?? "system",
    language: "en",
    timezone: resolveLocalTimezone(),
  }));

  const [notifications, setNotifications] = useState<NotificationState>({
    email: true,
    push: false,
    collaboration: true,
    product: true,
  });

  const [passwords, setPasswords] = useState<PasswordState>({
    current: "",
    next: "",
    confirm: "",
  });

  const isAuthenticated = Boolean(userId);

  const languageItems = useMemo(() => {
    const entries = new Map(
      languageOptions.map((option) => [option.value, option.label])
    );

    if (preferences.language && !entries.has(preferences.language)) {
      entries.set(preferences.language, preferences.language);
    }

    return Array.from(entries, ([value, label]) => ({ value, label }));
  }, [preferences.language]);

  const timezoneItems = useMemo(() => {
    const options = new Set(timezoneOptions);

    if (preferences.timezone) {
      options.add(preferences.timezone);
    }

    return Array.from(options);
  }, [preferences.timezone]);

  const persistSettings = useCallback(
    async (
      nextPreferences: PreferencesState,
      nextNotifications: NotificationState,
      successMessage?: string
    ) => {
      if (!userId) {
        return false;
      }

      setIsSavingSettings(true);

      try {
        // Update preferences using the API (excluding theme as it's now stored locally)
        const updatedPreferences = await settingsAPI.updatePreferences({
          language: nextPreferences.language,
          timezone: nextPreferences.timezone,
          notification_email: nextNotifications.email,
          notification_push: nextNotifications.push,
          notification_collaboration: nextNotifications.collaboration,
          notification_product: nextNotifications.product,
        });

        if (successMessage) {
          toast({
            title: "Settings updated",
            description: successMessage,
          });
        }

        setSettingsError(null);
        return true;
      } catch (error) {
        console.error("Failed to persist user settings", error);
        toast({
          variant: "destructive",
          title: "Unable to save settings",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while saving your settings.",
        });
        setSettingsError(
          "Some preferences could not be saved. Try again later."
        );
        return false;
      } finally {
        setIsSavingSettings(false);
      }
    },
    [userId, supabase, toast]
  );

  const fetchSettings = useCallback(async (): Promise<boolean> => {
    if (!supabase) {
      setSettingsError(
        "Supabase environment variables are not configured. Preferences cannot be synced."
      );
      setUserId(null);
      setIsLoadingSettings(false);
      return false;
    }

    setIsLoadingSettings(true);

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      const user = data?.user;

      if (!user) {
        setUserId(null);
        setAccountEmail("");
        setEmailConfirmedAt(null);
        setLastSignInAt(null);
        setSettingsError("You need to sign in to manage your settings.");
        return false;
      }

      setUserId(user.id);
      setAccountEmail(user.email ?? "");
      setEmailConfirmedAt(user.email_confirmed_at ?? null);
      setLastSignInAt(user.last_sign_in_at ?? null);

      // Get theme from cookie (local storage)
      const localTheme = getClientTheme();

      // Get preferences using the new API (excluding theme)
      try {
        const userPreferences = await settingsAPI.getPreferences();

        const nextPreferences: PreferencesState = {
          theme: localTheme ?? "system",
          language: userPreferences.language ?? "en",
          timezone: userPreferences.timezone ?? resolveLocalTimezone(),
        };

        setPreferences(nextPreferences);
        // Ensure the active theme matches local preference
        if (activeTheme !== localTheme) {
          setTheme(localTheme);
        }

        const nextNotifications: NotificationState = {
          email: userPreferences.notification_email,
          push: userPreferences.notification_push,
          collaboration: userPreferences.notification_collaboration,
          product: userPreferences.notification_product,
        };

        setNotifications(nextNotifications);
        setSettingsError(null);
      } catch (apiError) {
        console.error(
          "Failed to load preferences from API, using defaults",
          apiError
        );

        // Use defaults if API fails
        const nextPreferences: PreferencesState = {
          theme: localTheme ?? "system",
          language: "en",
          timezone: resolveLocalTimezone(),
        };

        setPreferences(nextPreferences);
        // Ensure the active theme matches local preference
        if (activeTheme !== localTheme) {
          setTheme(localTheme);
        }

        setNotifications({
          email: true,
          push: false,
          collaboration: true,
          product: true,
        });

        setSettingsError("Could not load saved preferences, using defaults.");
      }

      return true;
    } catch (error) {
      console.error("Unexpected error loading settings", error);
      setUserId(null);
      setAccountEmail("");
      setEmailConfirmedAt(null);
      setLastSignInAt(null);
      setSettingsError(
        "We couldn't load your account settings. Try again later."
      );
      toast({
        variant: "destructive",
        title: "Failed to load settings",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
      });
      return false;
    } finally {
      setIsLoadingSettings(false);
    }
  }, [activeTheme, supabase, toast, setTheme]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchSettings();
        } else {
          setUserId(null);
          setAccountEmail("");
          setEmailConfirmedAt(null);
          setLastSignInAt(null);
          // Keep the local theme setting when signing out
          const localTheme = getClientTheme();
          setPreferences((previous) => ({
            ...previous,
            theme: localTheme,
            language: "en",
            timezone: resolveLocalTimezone(),
          }));
          setNotifications({
            email: true,
            push: false,
            collaboration: true,
            product: true,
          });
          setSettingsError("You need to sign in to manage your settings.");
        }
      }
    );

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [fetchSettings, supabase]);

  const handleThemeSelect = useCallback(
    (nextTheme: ThemeOption) => {
      const previous = preferences;
      const nextPreferences = { ...preferences, theme: nextTheme };

      setPreferences(nextPreferences);
      setTheme(nextTheme);

      // Save theme to local cookie
      setClientThemeCookie(nextTheme);

      // Show success toast
      toast({
        title: "Theme updated",
        description: `Theme changed to ${
          nextTheme === "system" ? "match your system" : nextTheme
        }. Saved locally.`,
      });
    },
    [preferences, setTheme, toast]
  );

  const handleNotificationToggle = useCallback(
    (key: keyof NotificationState, label: string) =>
      async (checked: boolean) => {
        const previous = notifications;
        const next = { ...notifications, [key]: checked };

        setNotifications(next);

        if (!supabase || !userId) {
          return;
        }

        const success = await persistSettings(
          preferences,
          next,
          `${label} ${checked ? "enabled" : "disabled"}.`
        );

        if (!success) {
          setNotifications(previous);
        }
      },
    [notifications, persistSettings, preferences, supabase, userId]
  );

  const handleLanguageChange = useCallback(
    async (value: string) => {
      const previous = preferences;
      const nextPreferences = { ...preferences, language: value };
      setPreferences(nextPreferences);

      if (!supabase || !userId) {
        return;
      }

      const success = await persistSettings(
        nextPreferences,
        notifications,
        "Language preference updated."
      );

      if (!success) {
        setPreferences(previous);
      }
    },
    [notifications, persistSettings, preferences, supabase, userId]
  );

  const handleTimezoneChange = useCallback(
    async (value: string) => {
      const previous = preferences;
      const nextPreferences = { ...preferences, timezone: value };
      setPreferences(nextPreferences);

      if (!supabase || !userId) {
        return;
      }

      const success = await persistSettings(
        nextPreferences,
        notifications,
        "Timezone updated."
      );

      if (!success) {
        setPreferences(previous);
      }
    },
    [notifications, persistSettings, preferences, supabase, userId]
  );

  const handlePasswordSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!supabase || !userId) {
        toast({
          variant: "destructive",
          title: "You need to sign in",
          description: "Sign in again to update your password.",
        });
        return;
      }

      if (!accountEmail) {
        toast({
          variant: "destructive",
          title: "Email required",
          description:
            "We couldn't determine your account email to verify the password.",
        });
        return;
      }

      if (!passwords.current || !passwords.next || !passwords.confirm) {
        toast({
          variant: "destructive",
          title: "Missing information",
          description: "Fill in all password fields before submitting.",
        });
        return;
      }

      if (passwords.next.length < 8) {
        toast({
          variant: "destructive",
          title: "Password too short",
          description: "Use at least 8 characters for your new password.",
        });
        return;
      }

      if (passwords.next !== passwords.confirm) {
        toast({
          variant: "destructive",
          title: "Passwords do not match",
          description: "Confirm the new password before saving.",
        });
        return;
      }

      setIsUpdatingPassword(true);

      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: accountEmail,
          password: passwords.current,
        });

        if (signInError) {
          throw new Error("Your current password is incorrect.");
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: passwords.next,
        });

        if (updateError) {
          throw updateError;
        }

        setPasswords({ current: "", next: "", confirm: "" });

        toast({
          title: "Password updated",
          description: "Your password has been changed successfully.",
        });
      } catch (error) {
        console.error("Failed to update password", error);
        toast({
          variant: "destructive",
          title: "Unable to update password",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setIsUpdatingPassword(false);
      }
    },
    [accountEmail, passwords, supabase, toast, userId]
  );

  const handleSignOutOthers = useCallback(async () => {
    if (!supabase || !userId) {
      toast({
        variant: "destructive",
        title: "You need to sign in",
        description: "Sign in again to manage sessions.",
      });
      return;
    }

    setIsRevokingSessions(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });

      if (error) {
        throw error;
      }

      toast({
        title: "Signed out other devices",
        description:
          "We've disconnected other sessions linked to your account.",
      });
    } catch (error) {
      console.error("Failed to revoke sessions", error);
      toast({
        variant: "destructive",
        title: "Unable to sign out other sessions",
        description:
          error instanceof Error ? error.message : "Please try again shortly.",
      });
    } finally {
      setIsRevokingSessions(false);
    }
  }, [supabase, toast, userId]);

  const handleRefreshSessions = useCallback(async () => {
    if (!supabase || !userId) {
      toast({
        variant: "destructive",
        title: "You need to sign in",
        description: "Sign in again to refresh your session data.",
      });
      return;
    }

    setIsRefreshingSessions(true);

    const success = await fetchSettings();

    setIsRefreshingSessions(false);

    if (success) {
      toast({
        title: "Session refreshed",
        description: "We pulled the latest account session details.",
      });
    }
  }, [fetchSettings, supabase, toast, userId]);

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
          <TabsList className="grid w-full grid-cols-3 md:w-auto md:grid-cols-3">
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <ProfileSettingsCard />
          </TabsContent>

          {/* Preference Settings */}
          <TabsContent value="preferences" className="space-y-6">
            {settingsError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {settingsError}
              </div>
            )}
            {isLoadingSettings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading preferences...
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>Theme</CardTitle>
                      <CardDescription>
                        Choose how CodeJoin should look. Theme is saved locally
                        in your browser.
                      </CardDescription>
                    </div>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 text-xs"
                    >
                      <Zap className="h-3 w-3" />
                      Saved locally
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      {["light", "dark", "system"].map((option) => {
                        const label =
                          option === "light"
                            ? "Light"
                            : option === "dark"
                            ? "Dark"
                            : "System";
                        const Icon =
                          option === "light"
                            ? Sun
                            : option === "dark"
                            ? Moon
                            : Monitor;
                        const isActive = preferences.theme === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              handleThemeSelect(option as ThemeOption)
                            }
                            className={`rounded-lg border bg-card p-4 text-left transition hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 ${
                              isActive
                                ? "border-primary ring-1 ring-primary/40"
                                : "border-border"
                            }`}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="font-medium">{label}</span>
                            </div>
                            <div
                              className={`h-20 w-full rounded border ${
                                option === "dark"
                                  ? "bg-zinc-900"
                                  : option === "light"
                                  ? "bg-white"
                                  : "bg-gradient-to-r from-white to-zinc-900"
                              }`}
                            />
                            <p className="mt-2 text-xs text-muted-foreground">
                              {option === "system"
                                ? "Automatically adapts between light and dark based on your OS."
                                : `Always use the ${label.toLowerCase()} theme.`}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your theme preference is saved locally in this browser and
                      will persist across sessions. Theme changes apply
                      immediately without requiring an account.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Regional preferences</CardTitle>
                    <CardDescription>
                      Choose how CodeJoin should localize content such as
                      timestamps and UI copy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={preferences.language}
                        onValueChange={handleLanguageChange}
                        disabled={
                          isLoadingSettings ||
                          isSavingSettings ||
                          !supabase ||
                          !userId
                        }
                      >
                        <SelectTrigger id="language">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {languageItems.map((language) => (
                            <SelectItem
                              key={language.value}
                              value={language.value}
                            >
                              {language.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Interface copy and date formats will adjust based on the
                        language you select.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={preferences.timezone}
                        onValueChange={handleTimezoneChange}
                        disabled={
                          isLoadingSettings ||
                          isSavingSettings ||
                          !supabase ||
                          !userId
                        }
                      >
                        <SelectTrigger id="timezone">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {timezoneItems.map((timezone) => (
                            <SelectItem key={timezone} value={timezone}>
                              {timezone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        We'll use this timezone when sending reminders and
                        scheduling automation.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Password & Authentication</CardTitle>
                <CardDescription>
                  Update your password and make sure your account stays
                  protected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="Enter current password"
                        autoComplete="current-password"
                        value={passwords.current}
                        onChange={(event) =>
                          setPasswords((previous) => ({
                            ...previous,
                            current: event.target.value,
                          }))
                        }
                        disabled={
                          isUpdatingPassword ||
                          isLoadingSettings ||
                          !supabase ||
                          !userId
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        value={passwords.next}
                        onChange={(event) =>
                          setPasswords((previous) => ({
                            ...previous,
                            next: event.target.value,
                          }))
                        }
                        disabled={
                          isUpdatingPassword ||
                          isLoadingSettings ||
                          !supabase ||
                          !userId
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="confirm-password">
                        Confirm new password
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        value={passwords.confirm}
                        onChange={(event) =>
                          setPasswords((previous) => ({
                            ...previous,
                            confirm: event.target.value,
                          }))
                        }
                        disabled={
                          isUpdatingPassword ||
                          isLoadingSettings ||
                          !supabase ||
                          !userId
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Use at least 8 characters with a mix of letters,
                        numbers, and symbols.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      {emailConfirmedAt
                        ? `Email verified on ${formatDateTime(
                            emailConfirmedAt
                          )}`
                        : "Verify your email address to enable password resets."}
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        isUpdatingPassword ||
                        isLoadingSettings ||
                        !supabase ||
                        !userId
                      }
                    >
                      {isUpdatingPassword ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating
                        </span>
                      ) : (
                        "Update password"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active sessions</CardTitle>
                <CardDescription>
                  Sign out other devices and keep an eye on where you are logged
                  in.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Current session</p>
                    <p className="text-sm text-muted-foreground">
                      Last signed in {formatDateTime(lastSignInAt)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-400/50 bg-emerald-500/10 text-emerald-500"
                  >
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  If you notice unfamiliar activity, revoke other sessions and
                  change your password immediately.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleRefreshSessions}
                    disabled={
                      isRefreshingSessions ||
                      isLoadingSettings ||
                      !supabase ||
                      !userId
                    }
                  >
                    {isRefreshingSessions ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Refreshing
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Refresh sessions
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    type="button"
                    onClick={handleSignOutOthers}
                    disabled={
                      isRevokingSessions ||
                      isLoadingSettings ||
                      !supabase ||
                      !userId
                    }
                  >
                    {isRevokingSessions ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing out
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogOut className="h-4 w-4" />
                        Sign out other sessions
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
