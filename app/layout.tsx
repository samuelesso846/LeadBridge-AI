import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'LeadBridge AI — Transformez vos abonnés en clients',
  description: 'Connectez vos réseaux sociaux. L\'IA gère vos prospects automatiquement.',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      </head>
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#07090f', color: '#f0f4ff' }}>
        {children}
      </body>
    </html>
  )
}
