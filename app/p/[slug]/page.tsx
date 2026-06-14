'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function PublicPage({ params }: { params: { slug: string } }) {
  const [page, setPage] = useState<any>(null)
  const [form, setForm] = useState({ prenom: '', email: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('pages').select('*').eq('slug', params.slug).eq('active', true).single()
      .then(({ data }) => {
        if (data) setPage(data)
        // Incrémenter les vues
        fetch(`/api/page/view?slug=${params.slug}`)
      })
  }, [params.slug])

  async function submit() {
    if (!form.prenom || (!form.email && !form.phone)) {
      setError('Prénom et email ou téléphone requis.'); return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug: params.slug })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSent(true)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  if (!page) return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: '#f8faff', fontFamily: 'system-ui,sans-serif', color: '#555' }}>
      Chargement...
    </div>
  )

  if (sent) return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'linear-gradient(135deg,#4f8ef7,#7c3aed)', fontFamily: 'system-ui,sans-serif', color: '#fff', textAlign: 'center', padding: 20 }}>
      <div>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Message envoyé !</h2>
        <p style={{ fontSize: 16, opacity: .85 }}>Merci {form.prenom} ! {page.business_name} vous recontacte très bientôt.</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8faff', fontFamily: 'system-ui,sans-serif' }}>
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#4f8ef7,#7c3aed)', padding: '40px 20px 28px', textAlign: 'center', color: '#fff' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', margin: '0 auto 14px', display: 'grid', placeItems: 'center', fontSize: 34, border: '3px solid rgba(255,255,255,0.35)' }}>
          {page.emoji || '🚀'}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>{page.business_name}</h1>
        <p style={{ fontSize: 14, opacity: .88, margin: 0 }}>{page.bio}</p>
      </div>

      {/* FORM */}
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '24px 20px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 4 }}>Laissez votre demande</h2>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>Nous vous répondons rapidement !</p>

        {[
          { key: 'prenom', placeholder: 'Votre prénom *', type: 'text' },
          { key: 'email', placeholder: 'Votre email', type: 'email' },
          { key: 'phone', placeholder: 'Votre WhatsApp / téléphone', type: 'tel' },
        ].map(f => (
          <input key={f.key} type={f.type} placeholder={f.placeholder}
            value={(form as any)[f.key]}
            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            style={pubInput}
          />
        ))}
        <textarea placeholder="Votre message ou demande..." rows={3}
          value={form.message}
          onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
          style={{ ...pubInput, resize: 'vertical' }}
        />

        {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{error}</div>}

        <button onClick={submit} disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#7c3aed)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10, opacity: loading ? .7 : 1 }}>
          {loading ? 'Envoi...' : `Envoyer ma demande 🚀`}
        </button>

        {page.whatsapp && (
          <a href={`https://wa.me/${page.whatsapp.replace(/\D/g, '')}`} target="_blank" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 13, borderRadius: 12, border: '2px solid #25d366', background: 'rgba(37,211,102,0.06)', color: '#128c7e', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box', marginBottom: 10 }}>
            💬 Contacter sur WhatsApp
          </a>
        )}

        {/* Liens réseaux */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          {page.facebook_url && <a href={page.facebook_url} target="_blank" style={socialLink}>📘 Facebook</a>}
          {page.instagram_url && <a href={page.instagram_url} target="_blank" style={socialLink}>📸 Instagram</a>}
          {page.linkedin_url && <a href={page.linkedin_url} target="_blank" style={socialLink}>💼 LinkedIn</a>}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#aaa' }}>
          Propulsé par <strong style={{ color: '#4f8ef7' }}>LeadBridge AI</strong>
        </div>
      </div>
    </div>
  )
}

const pubInput: React.CSSProperties = {
  width: '100%', padding: '12px 14px', marginBottom: 10, border: '1.5px solid #e2e8f0',
  borderRadius: 10, fontSize: 14, fontFamily: 'system-ui,sans-serif', outline: 'none',
  color: '#111', background: '#fff', boxSizing: 'border-box'
}
const socialLink: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 999, border: '1.5px solid #e2e8f0',
  fontSize: 13, fontWeight: 600, color: '#555', textDecoration: 'none', background: '#fff'
}
