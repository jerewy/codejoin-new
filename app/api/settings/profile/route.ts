import { createServerSupabase } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for profile settings
const ProfileSettingsSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
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

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return NextResponse.json({
      success: true,
      data: profile || {
        id: user.id,
        email: user.email,
        full_name: '',
        bio: '',
        location: '',
        website: '',
        user_avatar: '',
      }
    })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
    const validatedData = ProfileSettingsSchema.parse(body)

    // Update user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        ...validatedData,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Also update auth metadata for full_name
    if (validatedData.full_name) {
      await supabase.auth.updateUser({
        data: { full_name: validatedData.full_name }
      })
    }

    return NextResponse.json({
      success: true,
      data: profile
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}