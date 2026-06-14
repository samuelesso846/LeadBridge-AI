import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'
import { scoreLead } from '../../../lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { prenom, nom, email, phone, message, slug } = await req.json()
    if (!prenom) return NextResponse.json({ error: 'Prénom requis' }, { status: 400 })

    const { data: page } = await supabaseAdmin.from('pages').select('*').eq('slug', slug).single()
    if (!page) return NextResponse.json({ error: 'Page introuvable' }, { status: 404 })

    let score = 50, aiSummary = ''
    try {
      const analysis = await scoreLead({ message: message || prenom, source: 'Page', businessName: page.business_name })
      score = analysis.score || 50
      aiSummary = analysis.resume || ''
    } catch {}

    const { data: lead, error } = await supabaseAdmin.from('leads').insert({
      user_id: page.user_id, page_id: page.id,
      prenom, nom: nom || '', email, phone, message,
      source: 'Page', statut: 'nouveau', score, ai_summary: aiSummary
    }).select().single()

    if (error) throw error

    await supabaseAdmin.from('notifications').insert({
      user_id: page.user_id,
      title: `🔗 Nouveau lead via votre page : ${prenom} ${nom || ''}`,
      icon: '🔗'
    })

    return NextResponse.json({ success: true, lead })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
