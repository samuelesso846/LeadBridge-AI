import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get('slug')
  if (slug) await supabaseAdmin.rpc('increment_views', { page_slug: slug })
  return NextResponse.json({ ok: true })
}
