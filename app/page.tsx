'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAuth() {
    setLoading(true); setError('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        if (error) throw error
        alert('Vérifiez votre email pour confirmer votre compte !')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/dashboard'
      }
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #07090f 0%, #0d1117 50%, #07090f 100%)' }}>
      {/* HERO */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 22, fontWeight: 900, background: 'linear-gradient(90deg,#4f8ef7,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            LeadBridge AI
          </div>
          <button onClick={() => setMode('login')} style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.3)', color: '#4f8ef7', padding: '8px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            Se connecter
          </button>
        </nav>

        <div style={{ textAlign: 'center', padding: '80px 0 60px' }}>
          <div style={{ display: 'inline-block', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 999, padding: '6px 16px', fontSize: 13, color: '#4f8ef7', fontWeight: 700, marginBottom: 24 }}>
            🤖 Agent IA pour vos réseaux sociaux
          </div>
          <h1 style={{ fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, marginBottom: 20 }}>
            Transformez vos<br/>
            <span style={{ background: 'linear-gradient(90deg,#4f8ef7,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              abonnés en clients
            </span>
          </h1>
          <p style={{ fontSize: 18, color: '#7b8ab8', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Connectez Facebook, Instagram ou LinkedIn. L'IA répond à vos prospects, gère vos leads et développe votre audience sans intervention manuelle.
          </p>

          {/* FORM */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 28, maxWidth: 400, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['login','signup'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: mode === m ? 'linear-gradient(135deg,#4f8ef7,#7c3aed)' : 'transparent', color: mode === m ? '#fff' : '#7b8ab8', transition: 'all .15s' }}>
                  {m === 'login' ? 'Connexion' : 'Inscription'}
                </button>
              ))}
            </div>
            {mode === 'signup' && (
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" style={inputStyle}/>
            )}
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle}/>
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" type="password" style={inputStyle}/>
            {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button onClick={handleAuth} disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#7c3aed)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Chargement...' : mode === 'login' ? '→ Accéder au dashboard' : '→ Créer mon compte'}
            </button>
          </div>
        </div>

        {/* FEATURES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 16, paddingBottom: 80 }}>
          {[
            { icon: '🤖', title: 'IA qui répond', desc: 'Répond automatiquement aux commentaires et DM de vos prospects 24h/24' },
            { icon: '🎯', title: 'Scoring des leads', desc: 'L\'IA analyse chaque prospect et détecte les intentions d\'achat' },
            { icon: '📊', title: 'CRM intelligent', desc: 'Pipeline visuel, historique complet, relances automatiques' },
            { icon: '🔗', title: 'Lien unique', desc: 'Une page publique professionnelle pour capturer tous vos leads' },
          ].map(f => (
            <div key={f.title} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: '#7b8ab8', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', marginBottom: 10, borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
  color: '#f0f4ff', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
}
