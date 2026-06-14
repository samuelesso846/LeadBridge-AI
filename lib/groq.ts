import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Répondre à un message entrant d'un prospect
export async function generateLeadResponse(params: {
  businessName: string
  aiPersona: string
  prospectName: string
  prospectMessage: string
  platform: string
  history?: { role: string; content: string }[]
}) {
  const { businessName, aiPersona, prospectName, prospectMessage, platform, history = [] } = params

  const systemPrompt = `Tu es l'assistant IA de "${businessName}". 
Tu joues le rôle d'un ${aiPersona}.
Tu réponds aux prospects sur ${platform} de manière professionnelle, chaleureuse et orientée conversion.
Tu qualifies les prospects, détectes les intentions d'achat, proposes des rendez-vous si pertinent.
Tes réponses sont courtes (2-4 phrases max), naturelles, jamais robotiques.
Tu parles toujours en français sauf si le prospect écrit dans une autre langue.`

  const messages = [
    ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: `${prospectName} dit : "${prospectMessage}"` }
  ]

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    max_tokens: 300,
    temperature: 0.7
  })

  return response.choices[0].message.content || ''
}

// Analyser et scorer un lead
export async function scoreLead(params: {
  message: string
  source: string
  businessName: string
}) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'system',
      content: 'Tu analyses des messages de prospects et retournes UNIQUEMENT un JSON valide.'
    }, {
      role: 'user',
      content: `Analyse ce message d'un prospect pour "${params.businessName}" venant de ${params.source}:
"${params.message}"

Retourne UNIQUEMENT ce JSON (rien d'autre):
{
  "score": <nombre entre 0 et 100>,
  "intention": "<achat|information|curiosite|spam>",
  "resume": "<résumé en 1 phrase>",
  "action_suggeree": "<prochaine action recommandée>",
  "urgent": <true|false>
}`
    }],
    max_tokens: 200,
    temperature: 0.1
  })

  try {
    const text = response.choices[0].message.content || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { score: 50, intention: 'information', resume: params.message.slice(0, 100), action_suggeree: 'Contacter le prospect', urgent: false }
  }
}

// Assistant commercial pour le dashboard
export async function chatWithAssistant(params: {
  message: string
  history: { role: string; content: string }[]
  context: { totalLeads: number; businessName: string }
}) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'system',
      content: `Tu es l'assistant commercial IA de LeadBridge AI pour "${params.context.businessName}".
Tu aides le propriétaire à convertir ses prospects en clients.
Tu rédiges des messages de relance, analyses des leads, donnes des conseils commerciaux.
Le compte a actuellement ${params.context.totalLeads} leads.
Tu réponds en français, de façon concise et actionnable.`
    },
    ...params.history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: params.message }
    ],
    max_tokens: 800,
    temperature: 0.7
  })

  return response.choices[0].message.content || ''
}
