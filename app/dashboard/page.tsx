'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const STATUTS = ['nouveau','contacte','qualifie','gagne','perdu']
const SL: Record<string,string> = {nouveau:'Nouveau',contacte:'Contacté',qualifie:'Qualifié',gagne:'Gagné',perdu:'Perdu'}
const SC: Record<string,string> = {nouveau:'#06b6d4',contacte:'#f59e0b',qualifie:'#4f8ef7',gagne:'#10b981',perdu:'#ef4444'}
const ICONS: Record<string,string> = {Facebook:'📘',Instagram:'📸',WhatsApp:'💬',LinkedIn:'💼',Manuel:'✏️',Page:'🔗'}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [page, setPage] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [chatMessages, setChatMessages] = useState<{role:string,content:string}[]>([
    {role:'assistant',content:'Bonjour ! Je suis votre assistant commercial IA. Comment puis-je vous aider à convertir vos prospects ?'}
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [showAddLead, setShowAddLead] = useState(false)
  const [newLead, setNewLead] = useState({prenom:'',nom:'',email:'',phone:'',message:'',source:'Manuel'})
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [newNote, setNewNote] = useState('')
  const [leadNotes, setLeadNotes] = useState<any[]>([])
  const [pageForm, setPageForm] = useState({business_name:'',bio:'',emoji:'🚀',whatsapp:'',facebook_url:'',instagram_url:'',linkedin_url:'',ai_persona:'assistant commercial professionnel'})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/'; return }
      setUser(data.user)
      loadData(data.user.id)
      // Temps réel
      const sub = supabase.channel('leads-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads', filter: `user_id=eq.${data.user.id}` },
          payload => { setLeads(prev => [payload.new, ...prev]) })
        .subscribe()
      return () => { supabase.removeChannel(sub) }
    })
  }, [])

  async function loadData(userId: string) {
    const [leadsRes, pageRes, notifsRes] = await Promise.all([
      supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('pages').select('*').eq('user_id', userId).single(),
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
    ])
    if (leadsRes.data) setLeads(leadsRes.data)
    if (pageRes.data) { setPage(pageRes.data); setPageForm(pageRes.data) }
    if (notifsRes.data) setNotifications(notifsRes.data)
  }

  async function addLead() {
    if (!newLead.prenom) return
    setSaving(true)
    const { data, error } = await supabase.from('leads').insert({
      ...newLead, user_id: user.id, page_id: page?.id || null
    }).select().single()
    if (!error && data) {
      await supabase.from('notifications').insert({ user_id: user.id, title: `Nouveau lead : ${newLead.prenom} ${newLead.nom}`, icon: '👤' })
      setShowAddLead(false)
      setNewLead({prenom:'',nom:'',email:'',phone:'',message:'',source:'Manuel'})
    }
    setSaving(false)
  }

  async function updateLeadStatus(leadId: string, statut: string) {
    await supabase.from('leads').update({ statut, updated_at: new Date().toISOString() }).eq('id', leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? {...l, statut} : l))
    if (selectedLead?.id === leadId) setSelectedLead((prev: any) => ({...prev, statut}))
  }

  async function deleteLead(leadId: string) {
    if (!confirm('Supprimer ce lead ?')) return
    await supabase.from('leads').delete().eq('id', leadId)
    setLeads(prev => prev.filter(l => l.id !== leadId))
    setSelectedLead(null)
  }

  async function openLead(lead: any) {
    setSelectedLead(lead)
    const { data } = await supabase.from('notes').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false })
    setLeadNotes(data || [])
  }

  async function addNote() {
    if (!newNote.trim() || !selectedLead) return
    const { data } = await supabase.from('notes').insert({ lead_id: selectedLead.id, user_id: user.id, content: newNote }).select().single()
    if (data) setLeadNotes(prev => [data, ...prev])
    setNewNote('')
  }

  async function savePage() {
    setSaving(true)
    const slug = pageForm.business_name.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
    if (page) {
      await supabase.from('pages').update({...pageForm, slug}).eq('id', page.id)
    } else {
      const { data } = await supabase.from('pages').insert({...pageForm, slug, user_id: user.id}).select().single()
      if (data) setPage(data)
    }
    await loadData(user.id)
    setSaving(false)
    alert('Page sauvegardée ✅')
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput; setChatInput(''); setChatLoading(true)
    const newHistory = [...chatMessages, {role:'user',content:msg}]
    setChatMessages(newHistory)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ message: msg, history: chatMessages, context: { totalLeads: leads.length, businessName: page?.business_name || 'Mon Business' } })
      })
      const data = await res.json()
      setChatMessages([...newHistory, {role:'assistant',content:data.reply}])
    } catch { setChatMessages([...newHistory, {role:'assistant',content:'Erreur de connexion. Vérifiez votre clé Groq.'}]) }
    setChatLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const total = leads.length
  const gagnes = leads.filter(l => l.statut === 'gagne').length
  const nouveaux = leads.filter(l => l.statut === 'nouveau').length
  const conv = total ? Math.round(gagnes/total*100) : 0
  const slug = page?.slug || 'votre-business'
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://lead-bridge-ai.vercel.app'}/p/${slug}`

  if (!user) return <div style={{display:'grid',placeItems:'center',height:'100vh',color:'#7b8ab8'}}>Chargement...</div>

  return (
    <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gridTemplateRows:'56px 1fr',height:'100vh',fontFamily:'Inter,system-ui,sans-serif'}}>

      {/* TOPBAR */}
      <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',padding:'0 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'#0d1117',gap:12,zIndex:10}}>
        <div style={{fontSize:17,fontWeight:900,background:'linear-gradient(90deg,#4f8ef7,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>LeadBridge AI</div>
        <div style={{fontSize:12,color:'#3d4f70',marginLeft:8,paddingLeft:8,borderLeft:'1px solid rgba(255,255,255,0.07)'}}>Dashboard</div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:13,color:'#7b8ab8'}}>{user.email?.split('@')[0]}</div>
          <button onClick={signOut} style={{padding:'6px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'#7b8ab8',cursor:'pointer',fontSize:13}}>Déconnexion</button>
        </div>
      </div>

      {/* SIDEBAR */}
      <nav style={{background:'#0d1117',borderRight:'1px solid rgba(255,255,255,0.07)',padding:'12px 10px',display:'flex',flexDirection:'column',gap:4,overflowY:'auto'}}>
        {[
          {id:'dashboard',icon:'📊',label:'Dashboard'},
          {id:'leads',icon:'👥',label:'Leads',badge:nouveaux||undefined},
          {id:'pipeline',icon:'🎯',label:'Pipeline'},
          {id:'page',icon:'🔗',label:'Ma Page'},
          {id:'ai',icon:'🤖',label:'Assistant IA'},
          {id:'social',icon:'📱',label:'Réseaux'},
          {id:'notifs',icon:'🔔',label:'Notifications',badge:notifications.filter(n=>!n.read).length||undefined},
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 10px',borderRadius:10,border:activeTab===item.id?'1px solid rgba(79,142,247,0.2)':'1px solid transparent',background:activeTab===item.id?'rgba(79,142,247,0.12)':'transparent',color:activeTab===item.id?'#4f8ef7':'#7b8ab8',cursor:'pointer',fontSize:14,fontWeight:500,textAlign:'left',width:'100%'}}>
            <span>{item.icon}</span>
            <span style={{flex:1}}>{item.label}</span>
            {item.badge ? <span style={{fontSize:11,padding:'2px 6px',borderRadius:999,background:'#4f8ef7',color:'#fff',fontWeight:700}}>{item.badge}</span> : null}
          </button>
        ))}
        <div style={{marginTop:'auto',padding:'12px 8px 4px',fontSize:12,color:'#3d4f70'}}>
          <strong style={{color:'#7b8ab8'}}>Plan Gratuit</strong><br/>{total}/50 leads
          <div style={{height:4,background:'rgba(255,255,255,0.07)',borderRadius:999,marginTop:6,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${Math.min(total/50*100,100)}%`,background:'linear-gradient(90deg,#4f8ef7,#7c3aed)',borderRadius:999}}/>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{overflowY:'auto',background:'#07090f',padding:28}}>

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Bonjour 👋</h1>
            <p style={{color:'#7b8ab8',marginBottom:24,fontSize:14}}>{new Date().toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
              {[{val:total,label:'Total leads',color:'#4f8ef7'},{val:gagnes,label:'Convertis',color:'#10b981'},{val:conv+'%',label:'Conversion',color:'#f59e0b'},{val:nouveaux,label:'Nouveaux',color:'#06b6d4'}].map(s => (
                <div key={s.label} style={{background:'#111827',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:18}}>
                  <div style={{fontSize:32,fontWeight:900,color:s.color}}>{s.val}</div>
                  <div style={{fontSize:13,color:'#7b8ab8',marginTop:6}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{background:'#111827',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:20}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
                  <strong>Derniers leads</strong>
                  <button onClick={() => setActiveTab('leads')} style={{background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#7b8ab8',padding:'4px 10px',borderRadius:8,cursor:'pointer',fontSize:13}}>Voir tous →</button>
                </div>
                {leads.slice(0,5).map(l => (
                  <div key={l.id} onClick={() => openLead(l)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:'pointer'}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#4f8ef7,#7c3aed)',display:'grid',placeItems:'center',fontWeight:800,fontSize:13,flexShrink:0}}>{l.prenom[0]}{(l.nom||'')[0]||''}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:14}}>{l.prenom} {l.nom}</div>
                      <div style={{fontSize:12,color:'#7b8ab8'}}>{ICONS[l.source]||''} {l.source}</div>
                    </div>
                    <span style={{fontSize:11,padding:'3px 8px',borderRadius:999,background:`${SC[l.statut]}20`,border:`1px solid ${SC[l.statut]}40`,color:SC[l.statut],fontWeight:700}}>{SL[l.statut]}</span>
                  </div>
                ))}
                {!leads.length && <div style={{textAlign:'center',padding:30,color:'#3d4f70'}}>Aucun lead encore.<br/>Partagez votre page publique !</div>}
              </div>
              <div style={{background:'#111827',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:20}}>
                <strong style={{display:'block',marginBottom:14}}>Votre lien public</strong>
                <div style={{background:'rgba(79,142,247,0.08)',border:'1px solid rgba(79,142,247,0.2)',borderRadius:10,padding:'12px 14px',fontSize:13,fontFamily:'monospace',color:'#4f8ef7',marginBottom:12,wordBreak:'break-all'}}>{publicUrl}</div>
                <button onClick={() => {navigator.clipboard.writeText(publicUrl)}} style={{...btnStyle,marginBottom:8}}>📋 Copier le lien</button>
                <button onClick={() => window.open(publicUrl,'_blank')} style={ghostBtnStyle}>👁 Voir la page</button>
                <hr style={{border:'none',borderTop:'1px solid rgba(255,255,255,0.07)',margin:'16px 0'}}/>
                <strong style={{display:'block',marginBottom:10}}>Répartition sources</strong>
                {Object.entries(leads.reduce((acc:any,l) => ({...acc,[l.source]:(acc[l.source]||0)+1}),{})).map(([s,c]:any) => (
                  <div key={s} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                    <span style={{fontSize:13,minWidth:80}}>{ICONS[s]||''} {s}</span>
                    <div style={{flex:1,height:6,background:'rgba(255,255,255,0.07)',borderRadius:999,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.round(c/total*100)}%`,background:'linear-gradient(90deg,#4f8ef7,#7c3aed)',borderRadius:999}}/>
                    </div>
                    <span style={{fontSize:12,color:'#7b8ab8'}}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LEADS ── */}
        {activeTab === 'leads' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div><h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Leads</h1><p style={{color:'#7b8ab8',fontSize:14}}>Tous vos prospects</p></div>
              <button onClick={() => setShowAddLead(true)} style={btnStyle}>+ Nouveau lead</button>
            </div>
            <div style={{background:'#111827',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                <thead>
                  <tr style={{background:'rgba(255,255,255,0.02)'}}>
                    {['Nom','Contact','Source','Statut','Score','Date','Actions'].map(h => (
                      <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'#3d4f70',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map(l => (
                    <tr key={l.id} onClick={() => openLead(l)} style={{cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                      <td style={{padding:'12px 14px',fontWeight:600}}>{l.prenom} {l.nom}</td>
                      <td style={{padding:'12px 14px',color:'#7b8ab8',fontSize:13}}>{l.email||l.phone||'—'}</td>
                      <td style={{padding:'12px 14px',fontSize:13,color:'#7b8ab8'}}>{ICONS[l.source]||''} {l.source}</td>
                      <td style={{padding:'12px 14px'}}><span style={{fontSize:11,padding:'3px 8px',borderRadius:999,background:`${SC[l.statut]}20`,border:`1px solid ${SC[l.statut]}40`,color:SC[l.statut],fontWeight:700}}>{SL[l.statut]}</span></td>
                      <td style={{padding:'12px 14px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:40,height:6,background:'rgba(255,255,255,0.07)',borderRadius:999,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${l.score||0}%`,background:l.score>70?'#10b981':l.score>40?'#f59e0b':'#ef4444',borderRadius:999}}/>
                          </div>
                          <span style={{fontSize:12,color:'#7b8ab8'}}>{l.score||0}</span>
                        </div>
                      </td>
                      <td style={{padding:'12px 14px',fontSize:13,color:'#7b8ab8'}}>{new Date(l.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={{padding:'12px 14px'}}>
                        <div style={{display:'flex',gap:6}} onClick={e => e.stopPropagation()}>
                          {l.phone && <button onClick={() => window.open(`https://wa.me/${l.phone.replace(/\D/g,'')}`) } style={{...ghostBtnStyle,padding:'4px 8px',fontSize:12}}>💬</button>}
                          <button onClick={() => deleteLead(l.id)} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#ef4444',padding:'4px 8px',borderRadius:6,cursor:'pointer',fontSize:12}}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!leads.length && <div style={{textAlign:'center',padding:40,color:'#3d4f70'}}>Aucun lead. Ajoutez-en un ou partagez votre page !</div>}
            </div>
          </div>
        )}

        {/* ── PIPELINE ── */}
        {activeTab === 'pipeline' && (
          <div>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Pipeline</h1>
            <p style={{color:'#7b8ab8',fontSize:14,marginBottom:20}}>Vue kanban de vos prospects</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
              {STATUTS.map(s => (
                <div key={s} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:12,minHeight:300}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:SC[s]}}>
                    <span>{SL[s]}</span>
                    <span style={{fontSize:11,padding:'2px 6px',borderRadius:999,background:'rgba(255,255,255,0.06)',color:'#7b8ab8'}}>{leads.filter(l=>l.statut===s).length}</span>
                  </div>
                  {leads.filter(l => l.statut === s).map(l => (
                    <div key={l.id} onClick={() => openLead(l)} style={{background:'#161f2e',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:12,marginBottom:8,cursor:'pointer'}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{l.prenom} {l.nom}</div>
                      <div style={{fontSize:12,color:'#7b8ab8'}}>{ICONS[l.source]||''} {l.source}</div>
                      {l.score > 0 && <div style={{fontSize:11,marginTop:6,color:l.score>70?'#10b981':l.score>40?'#f59e0b':'#ef4444'}}>Score: {l.score}/100</div>}
                    </div>
                  ))}
                  {!leads.filter(l=>l.statut===s).length && <div style={{fontSize:13,color:'#3d4f70',textAlign:'center',padding:20}}>Vide</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MA PAGE ── */}
        {activeTab === 'page' && (
          <div>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Ma Page Publique</h1>
            <p style={{color:'#7b8ab8',fontSize:14,marginBottom:20}}>Votre lien unique pour capturer des leads</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <div style={{background:'#111827',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:20}}>
                {[
                  {label:'Nom du business *',key:'business_name',placeholder:'Mon Business'},
                  {label:'Bio / Slogan',key:'bio',placeholder:'Votre description courte...'},
                  {label:'Emoji',key:'emoji',placeholder:'🚀'},
                  {label:'WhatsApp',key:'whatsapp',placeholder:'+22891000000'},
                  {label:'Facebook URL',key:'facebook_url',placeholder:'https://facebook.com/...'},
                  {label:'Instagram URL',key:'instagram_url',placeholder:'https://instagram.com/...'},
                  {label:'LinkedIn URL',key:'linkedin_url',placeholder:'https://linkedin.com/...'},
                  {label:'Personnalité IA',key:'ai_persona',placeholder:'assistant commercial professionnel'},
                ].map(f => (
                  <div key={f.key} style={{marginBottom:12}}>
                    <label style={{display:'block',fontSize:12,fontWeight:600,color:'#7b8ab8',marginBottom:5}}>{f.label}</label>
                    <input value={(pageForm as any)[f.key]||''} onChange={e => setPageForm(prev => ({...prev,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inputStyle2}/>
                  </div>
                ))}
                <button onClick={savePage} disabled={saving} style={{...btnStyle,width:'100%',marginTop:8}}>
                  {saving ? 'Sauvegarde...' : '✅ Sauvegarder la page'}
                </button>
                {page && (
                  <div style={{marginTop:12}}>
                    <div style={{background:'rgba(79,142,247,0.08)',border:'1px solid rgba(79,142,247,0.2)',borderRadius:10,padding:'10px 14px',fontSize:12,fontFamily:'monospace',color:'#4f8ef7',marginBottom:8,wordBreak:'break-all'}}>{publicUrl}</div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={() => navigator.clipboard.writeText(publicUrl)} style={ghostBtnStyle}>📋 Copier</button>
                      <button onClick={() => window.open(publicUrl,'_blank')} style={ghostBtnStyle}>👁 Voir</button>
                    </div>
                  </div>
                )}
              </div>
              {/* Aperçu */}
              <div style={{background:'#111827',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:20}}>
                <strong style={{display:'block',marginBottom:16}}>Aperçu mobile</strong>
                <div style={{border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden',maxWidth:280,margin:'0 auto'}}>
                  <div style={{background:'linear-gradient(135deg,#4f8ef7,#7c3aed)',padding:'24px 16px 16px',textAlign:'center',color:'#fff'}}>
                    <div style={{width:60,height:60,borderRadius:'50%',background:'rgba(255,255,255,0.2)',margin:'0 auto 10px',display:'grid',placeItems:'center',fontSize:24,border:'3px solid rgba(255,255,255,0.3)'}}>{pageForm.emoji||'🚀'}</div>
                    <div style={{fontSize:17,fontWeight:800,marginBottom:4}}>{pageForm.business_name||'Mon Business'}</div>
                    <div style={{fontSize:12,opacity:.85}}>{pageForm.bio||'Contactez-nous'}</div>
                  </div>
                  <div style={{background:'#f8faff',padding:16}}>
                    {['Votre prénom','Votre email','Votre message'].map(p => (
                      <div key={p} style={{width:'100%',padding:'9px 12px',marginBottom:8,border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,color:'#888',background:'#fff'}}>{p}</div>
                    ))}
                    <div style={{width:'100%',padding:11,borderRadius:8,background:'linear-gradient(135deg,#4f8ef7,#7c3aed)',color:'#fff',textAlign:'center',fontWeight:700,fontSize:14}}>Envoyer 🚀</div>
                    {pageForm.whatsapp && <div style={{width:'100%',padding:10,borderRadius:8,border:'2px solid #25d366',color:'#128c7e',textAlign:'center',fontWeight:700,fontSize:13,marginTop:8}}>💬 WhatsApp</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ASSISTANT IA ── */}
        {activeTab === 'ai' && (
          <div>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Assistant IA</h1>
            <p style={{color:'#7b8ab8',fontSize:14,marginBottom:20}}>Votre commercial IA propulsé par Groq (Llama 3.3)</p>
            <div style={{background:'#111827',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,display:'flex',flexDirection:'column',height:'calc(100vh - 200px)'}}>
              <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:12}}>
                {chatMessages.map((m,i) => (
                  <div key={i} style={{maxWidth:'78%',padding:'12px 16px',fontSize:14,lineHeight:1.6,alignSelf:m.role==='user'?'flex-end':'flex-start',background:m.role==='user'?'linear-gradient(135deg,rgba(79,142,247,0.2),rgba(124,58,237,0.2))':'#161f2e',border:`1px solid ${m.role==='user'?'rgba(79,142,247,0.2)':'rgba(255,255,255,0.07)'}`,borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px'}}>
                    {m.role==='assistant' && <div style={{fontSize:11,fontWeight:700,color:'#4f8ef7',marginBottom:4,textTransform:'uppercase'}}>🤖 IA Commerciale</div>}
                    <div style={{whiteSpace:'pre-wrap'}}>{m.content}</div>
                  </div>
                ))}
                {chatLoading && <div style={{alignSelf:'flex-start',background:'#161f2e',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'12px 16px',fontSize:13,color:'#7b8ab8'}}>🤖 IA en train de répondre...</div>}
              </div>
              <div style={{display:'flex',gap:10,padding:16,borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&sendChat()} placeholder="Posez votre question commerciale..." style={{...inputStyle2,flex:1}}/>
                <button onClick={sendChat} disabled={chatLoading} style={btnStyle}>Envoyer ↗</button>
              </div>
            </div>
          </div>
        )}

        {/* ── RÉSEAUX SOCIAUX ── */}
        {activeTab === 'social' && (
          <div>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Réseaux Sociaux</h1>
            <p style={{color:'#7b8ab8',fontSize:14,marginBottom:20}}>Connectez vos pages pour que l'IA gère vos prospects automatiquement</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
              {[
                {platform:'linkedin',icon:'💼',name:'LinkedIn',color:'#0077b5',desc:'L\'IA répond aux commentaires et DM de votre page entreprise',connected:false},
                {platform:'facebook',icon:'📘',name:'Facebook',color:'#1877f2',desc:'Réponses automatiques aux messages et commentaires',connected:false},
                {platform:'instagram',icon:'📸',name:'Instagram',color:'#e1306c',desc:'Gestion des DM et commentaires Instagram Business',connected:false},
                {platform:'tiktok',icon:'🎵',name:'TikTok',color:'#000',desc:'Modération et réponses aux commentaires TikTok',connected:false},
              ].map(s => (
                <div key={s.platform} style={{background:'#111827',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:20}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                    <div style={{fontSize:28}}>{s.icon}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:16}}>{s.name}</div>
                      <div style={{fontSize:12,color:s.connected?'#10b981':'#7b8ab8'}}>{s.connected?'✅ Connecté':'Non connecté'}</div>
                    </div>
                  </div>
                  <p style={{fontSize:13,color:'#7b8ab8',marginBottom:14,lineHeight:1.6}}>{s.desc}</p>
                  {s.platform === 'linkedin' ? (
                    <a href="/api/auth/linkedin" style={{...btnStyle,display:'block',textAlign:'center',textDecoration:'none'}}>🔗 Connecter LinkedIn</a>
                  ) : (
                    <button style={{...ghostBtnStyle,width:'100%',opacity:.6}} disabled>Bientôt disponible</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeTab === 'notifs' && (
          <div>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Notifications</h1>
            <p style={{color:'#7b8ab8',fontSize:14,marginBottom:20}}>Vos dernières activités</p>
            {notifications.map(n => (
              <div key={n.id} style={{display:'flex',gap:12,padding:14,background:'#111827',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,marginBottom:8}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:n.read?'#3d4f70':'#4f8ef7',marginTop:5,flexShrink:0}}/>
                <div>
                  <div style={{fontSize:14,fontWeight:600}}>{n.icon} {n.title}</div>
                  <div style={{fontSize:12,color:'#3d4f70',marginTop:2}}>{new Date(n.created_at).toLocaleString('fr-FR')}</div>
                </div>
              </div>
            ))}
            {!notifications.length && <div style={{textAlign:'center',padding:40,color:'#3d4f70'}}>Aucune notification</div>}
          </div>
        )}
      </main>

      {/* MODAL DÉTAIL LEAD */}
      {selectedLead && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:100,display:'grid',placeItems:'center',backdropFilter:'blur(4px)'}} onClick={() => setSelectedLead(null)}>
          <div style={{background:'#111827',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,padding:28,width:'min(520px,95vw)',maxHeight:'90vh',overflowY:'auto',position:'relative'}} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedLead(null)} style={{position:'absolute',top:16,right:16,background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#7b8ab8',width:30,height:30,borderRadius:8,cursor:'pointer',fontSize:18}}>×</button>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
              <div style={{width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#4f8ef7,#7c3aed)',display:'grid',placeItems:'center',fontWeight:800,fontSize:18}}>{selectedLead.prenom[0]}{(selectedLead.nom||'')[0]||''}</div>
              <div>
                <div style={{fontSize:19,fontWeight:800}}>{selectedLead.prenom} {selectedLead.nom}</div>
                <div style={{fontSize:13,color:'#7b8ab8'}}>{ICONS[selectedLead.source]||''} {selectedLead.source} · Score: {selectedLead.score||0}/100</div>
              </div>
            </div>
            {selectedLead.email && <div style={{background:'#161f2e',borderRadius:10,padding:'10px 14px',fontSize:13,marginBottom:8}}>📧 {selectedLead.email}</div>}
            {selectedLead.phone && <div style={{background:'#161f2e',borderRadius:10,padding:'10px 14px',fontSize:13,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>📱 {selectedLead.phone}<button onClick={() => window.open(`https://wa.me/${selectedLead.phone.replace(/\D/g,'')}`)} style={ghostBtnStyle}>💬 WA</button></div>}
            {selectedLead.message && <div style={{background:'#161f2e',borderRadius:10,padding:'10px 14px',fontSize:13,fontStyle:'italic',color:'#7b8ab8',marginBottom:14}}>"{selectedLead.message}"</div>}
            {selectedLead.ai_summary && <div style={{background:'rgba(79,142,247,0.08)',border:'1px solid rgba(79,142,247,0.2)',borderRadius:10,padding:'10px 14px',fontSize:13,marginBottom:14}}>🤖 {selectedLead.ai_summary}</div>}
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#7b8ab8',marginBottom:6}}>Statut</label>
              <select value={selectedLead.statut} onChange={e => updateLeadStatus(selectedLead.id, e.target.value)} style={inputStyle2}>
                {STATUTS.map(s => <option key={s} value={s}>{SL[s]}</option>)}
              </select>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#7b8ab8',marginBottom:6}}>Ajouter une note</label>
              <div style={{display:'flex',gap:8}}>
                <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key==='Enter'&&addNote()} placeholder="Note ou prochaine action..." style={{...inputStyle2,flex:1}}/>
                <button onClick={addNote} style={btnStyle}>+</button>
              </div>
            </div>
            {leadNotes.map(n => (
              <div key={n.id} style={{background:'#161f2e',borderRadius:10,padding:'10px 14px',fontSize:13,marginBottom:6}}>
                <div style={{fontSize:11,color:'#3d4f70',marginBottom:3}}>{new Date(n.created_at).toLocaleString('fr-FR')}</div>
                {n.content}
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
              <button onClick={() => { setActiveTab('ai'); setChatInput(`Rédige un message de relance pour ${selectedLead.prenom} ${selectedLead.nom} venant de ${selectedLead.source}`); setSelectedLead(null) }} style={ghostBtnStyle}>🤖 Relance IA</button>
              <button onClick={() => deleteLead(selectedLead.id)} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#ef4444',padding:'6px 12px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>🗑 Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU LEAD */}
      {showAddLead && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:100,display:'grid',placeItems:'center',backdropFilter:'blur(4px)'}} onClick={() => setShowAddLead(false)}>
          <div style={{background:'#111827',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,padding:28,width:'min(480px,95vw)',position:'relative'}} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAddLead(false)} style={{position:'absolute',top:16,right:16,background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#7b8ab8',width:30,height:30,borderRadius:8,cursor:'pointer',fontSize:18}}>×</button>
            <div style={{fontSize:19,fontWeight:800,marginBottom:4}}>Nouveau lead</div>
            <div style={{fontSize:13,color:'#7b8ab8',marginBottom:20}}>Ajouter un prospect manuellement</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <input value={newLead.prenom} onChange={e => setNewLead(p => ({...p,prenom:e.target.value}))} placeholder="Prénom *" style={inputStyle2}/>
              <input value={newLead.nom} onChange={e => setNewLead(p => ({...p,nom:e.target.value}))} placeholder="Nom" style={inputStyle2}/>
            </div>
            <input value={newLead.email} onChange={e => setNewLead(p => ({...p,email:e.target.value}))} placeholder="Email" style={{...inputStyle2,marginBottom:10}}/>
            <input value={newLead.phone} onChange={e => setNewLead(p => ({...p,phone:e.target.value}))} placeholder="Téléphone / WhatsApp" style={{...inputStyle2,marginBottom:10}}/>
            <select value={newLead.source} onChange={e => setNewLead(p => ({...p,source:e.target.value}))} style={{...inputStyle2,marginBottom:10}}>
              {['Facebook','Instagram','WhatsApp','LinkedIn','Manuel'].map(s => <option key={s}>{s}</option>)}
            </select>
            <textarea value={newLead.message} onChange={e => setNewLead(p => ({...p,message:e.target.value}))} placeholder="Message ou note..." rows={3} style={{...inputStyle2,resize:'vertical',marginBottom:16}}/>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={() => setShowAddLead(false)} style={ghostBtnStyle}>Annuler</button>
              <button onClick={addLead} disabled={saving} style={btnStyle}>{saving?'Ajout...':'💾 Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {background:'linear-gradient(135deg,#4f8ef7,#7c3aed)',color:'#fff',border:'none',padding:'8px 16px',borderRadius:10,cursor:'pointer',fontSize:14,fontWeight:600,fontFamily:'inherit'}
const ghostBtnStyle: React.CSSProperties = {background:'transparent',border:'1px solid rgba(255,255,255,0.12)',color:'#f0f4ff',padding:'8px 14px',borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}
const inputStyle2: React.CSSProperties = {background:'#161f2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'#f0f4ff',fontSize:14,padding:'10px 14px',width:'100%',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}
