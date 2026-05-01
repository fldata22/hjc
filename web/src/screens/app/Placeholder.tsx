import { ResponsiveShell, type TabKey } from './Shell';
import './app.css';

export const Placeholder = ({ title, active }: { title: string; active?: TabKey }) => (
  <ResponsiveShell active={active ?? 'home'}>
    <div className="scroll">
      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          Coming soon
        </div>
        <h1
          className="serif"
          style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.05 }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 12, lineHeight: 1.5 }}>
          This screen isn't built yet. Check back later.
        </p>
      </div>
    </div>
  </ResponsiveShell>
);
