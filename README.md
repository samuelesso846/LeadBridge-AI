# LeadBridge AI 🚀

> Connectez votre page Facebook, Instagram ou LinkedIn.
> L'IA répond à vos prospects, gère vos leads et développe votre audience automatiquement.

## Déploiement en 5 minutes

### 1. Supabase — Base de données
1. Allez sur https://supabase.com
2. Ouvrez votre projet LeadBridge AI
3. Allez dans **SQL Editor** → **New Query**
4. Copiez-collez le contenu de `supabase/schema.sql`
5. Cliquez **Run**

### 2. Variables d'environnement Vercel
Dans Vercel → votre projet → Settings → Environment Variables, ajoutez :

| Variable | Valeur |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | https://mphflhluhfaqaweekexp.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | votre clé sb_publishable... |
| SUPABASE_SERVICE_KEY | votre clé sb_secret... |
| GROQ_API_KEY | votre clé groq |
| LINKEDIN_CLIENT_ID | 77f75014i37d7y |
| LINKEDIN_CLIENT_SECRET | votre secret linkedin |
| NEXTAUTH_SECRET | leadbridge2026secret |
| NEXTAUTH_URL | https://lead-bridge-ai.vercel.app |

### 3. GitHub — Pousser le code
```bash
git init
git add .
git commit -m "LeadBridge AI - Initial commit"
git remote add origin https://github.com/samueless0846/LeadBridge-AI.git
git push -u origin main
```

### 4. Vercel — Déployer
- Retournez sur Vercel
- Cliquez **Deploy**
- En 2 minutes votre app est en ligne sur : https://lead-bridge-ai.vercel.app

