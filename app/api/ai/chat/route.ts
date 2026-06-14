import { NextRequest, NextResponse } from 'next/server'
import { chatWithAssistant } from '../../../../lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { message, history, context } = await req.json()
    const reply = await chatWithAssistant({ message, history, context })
    return NextResponse.json({ reply })
  } catch (e: any) {
    return NextResponse.json({ reply: 'Erreur IA : ' + e.message }, { status: 500 })
  }
}
