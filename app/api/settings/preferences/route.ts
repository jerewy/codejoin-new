import { createServerSupabase } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for preferences (theme_preference removed as it's now handled locally)
const PreferencesSchema = z.object({
  language: z.string().optional(),
  timezone: z.string().optional(),
  notification_email: z.boolean().optional(),
  notification_push: z.boolean().optional(),
  notification_collaboration: z.boolean().optional(),
  notification_product: z.boolean().optional(),
  profile_visibility: z.enum(['public', 'private', 'collaborators']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user settings
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    // Return default settings if none exist (theme_preference removed as it's now handled locally)
    const defaultSettings = {
      language: 'en',
      timezone: 'UTC',
      notification_email: true,
      notification_push: false,
      notification_collaboration: true,
      notification_product: true,
      profile_visibility: 'public',
    }

    return NextResponse.json({
      success: true,
      data: settings || defaultSettings
    })

  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = PreferencesSchema.parse(body)

    // Upsert user settings
    const { data: settings, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...validatedData,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}