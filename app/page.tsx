'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAuth() {
    if (!email || !password) { setError('Email et mot de passe requis'); return }
    setLoading(true); setError('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: name } }
        })
        if (error) throw error
        alert('Vérifiez votre email pour confirmer votre compte !')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.session) router.push('/dashboard')
      }
    } catch (e: any) {
      setError(e.message || 'Erreur de connexion')
    }
    setLoading(false)
  }

  const inp: React.CSSProperties = {
    width:'100%', padding:'11px 14px', marginBottom:10, borderRadius:10,
    border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)',
    color:'#f0f4ff', fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit'
  }

  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'linear-gradient(135deg,#07090f,#0d1117)',padding:20}}>
      <div style={{width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:28,fontWeight:900,background:'linear-gradient(90deg,#4f8ef7,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>LeadBridge AI</div>
          <div style={{fontSize:13,color:'#7b8ab8',marginTop:6}}>Transformez vos abonnés en clients</div>
        </div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:20,padding:24}}>
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            {(['login','signup'] as const).map(m=>(
              <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:9,borderRadius:10,border:mode!==m?'1px solid rgba(255,255,255,0.1)':'none',cursor:'pointer',fontWeight:700,fontSize:14,background:mode===m?'linear-gradient(135deg,#4f8ef7,#7c3aed)':'transparent',color:mode===m?'#fff':'#7b8ab8',fontFamily:'inherit'}}>
                {m==='login'?'Connexion':'Inscription'}
              </button>
            ))}
          </div>
          {mode==='signup'&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Votre nom" style={inp}/>}
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={inp}/>
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" type="password" style={inp}/>
          {error&&<div style={{color:'#ef4444',fontSize:13,marginBottom:10}}>{error}</div>}
          <button onClick={handleAuth} disabled={loading} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:'linear-gradient(135deg,#4f8ef7,#7c3aed)',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',opacity:loading?.7:1,fontFamily:'inherit'}}>
            {loading?'Chargement...':mode==='login'?'→ Accéder au dashboard':'→ Créer mon compte'}
          </button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:16}}>
          {[{icon:'🤖',t:'IA qui répond',d:'Répond aux DM 24h/24'},{icon:'🎯',t:'Scoring leads',d:'Détecte les acheteurs'},{icon:'📊',t:'CRM intelligent',d:'Pipeline visuel'},{icon:'🔗',t:'Lien unique',d:'Page publique pro'}].map(f=>(
            <div key={f.t} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:14}}>
              <div style={{fontSize:22,marginBottom:6}}>{f.icon}</div>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{f.t}</div>
              <div style={{fontSize:12,color:'#7b8ab8'}}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
