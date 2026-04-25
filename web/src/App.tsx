import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { RequireAuth } from './auth/RequireAuth';
import { MissionControl } from './screens/MissionControl';

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>{title}</h1>
      <p>Coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><MissionControl /></RequireAuth>} />
      <Route path="/powers" element={<RequireAuth><PlaceholderScreen title="PAVEDDD powers" /></RequireAuth>} />
      <Route path="/pastors" element={<RequireAuth><PlaceholderScreen title="Pastors" /></RequireAuth>} />
      <Route path="/committees" element={<RequireAuth><PlaceholderScreen title="Committees" /></RequireAuth>} />
      <Route path="/pledges" element={<RequireAuth><PlaceholderScreen title="Pledges" /></RequireAuth>} />
      <Route path="/conference" element={<RequireAuth><PlaceholderScreen title="Conference" /></RequireAuth>} />
      <Route path="/publicity" element={<RequireAuth><PlaceholderScreen title="Publicity" /></RequireAuth>} />
      <Route path="/govt" element={<RequireAuth><PlaceholderScreen title="Govt & permits" /></RequireAuth>} />
      <Route path="/budget" element={<RequireAuth><PlaceholderScreen title="Budget" /></RequireAuth>} />
      <Route path="/preparation" element={<RequireAuth><PlaceholderScreen title="Preparation" /></RequireAuth>} />
      <Route path="/activity" element={<RequireAuth><PlaceholderScreen title="Activity log" /></RequireAuth>} />
      <Route path="/assessment" element={<RequireAuth><PlaceholderScreen title="Weekly assessment" /></RequireAuth>} />
      <Route path="/inbox" element={<RequireAuth><PlaceholderScreen title="Inbox" /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
