import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Supabase client not initialized'
        },
        { status: 500 }
      );
    }

    // Test basic connection by trying to fetch from a simple table
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Database connection failed',
          details: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      message: 'Supabase connection successful',
      timestamp: new Date().toISOString(),
      data: {
        connected: true,
        sampleData: data?.length || 0
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}