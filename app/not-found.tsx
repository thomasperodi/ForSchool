import Link from 'next/link';

export default function NotFound() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
            fontFamily: 'system-ui, sans-serif',
            color: '#374151',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <h1 style={{ fontSize: '5rem', margin: 0, fontWeight: 800, color: '#6366f1' }}>404</h1>
            <p style={{ fontSize: '1.5rem', margin: '1rem 0' }}>
                Oops! La pagina che cerchi non esiste.<br />
                Forse si è persa tra i compiti!
            </p>
            <span style={{ fontSize: '3rem', margin: '1rem 0' }}>🧐📚</span>
            <Link href="/" style={{
                marginTop: '2rem',
                padding: '0.75rem 2rem',
                background: '#6366f1',
                color: '#fff',
                borderRadius: '999px',
                textDecoration: 'none',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(99,102,241,0.15)'
            }}>
                Torna alla Home
            </Link>
        </div>
    );
}