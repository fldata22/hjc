import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { RequireAuth } from './auth/RequireAuth';
import { MissionControl } from './screens/MissionControl';
import { MissionControlMobile } from './screens/mobile/MissionControlMobile';
import { PowersListMobile } from './screens/mobile/PowersListMobile';
import { PowerDetailMobile } from './screens/mobile/PowerDetailMobile';
import { PastorsDirectoryMobile } from './screens/mobile/PastorsDirectoryMobile';
import { PastorProfileMobile } from './screens/mobile/PastorProfileMobile';
import { QuickLogMobile } from './screens/mobile/QuickLogMobile';
import { WeeklyAssessmentMobile } from './screens/mobile/WeeklyAssessmentMobile';
import { ActivityLogMobile } from './screens/mobile/ActivityLogMobile';
import { HomeScreen as DirectorHome } from './screens/app/HomeScreen';
import { FormsScreen as DirectorForms } from './screens/app/FormsScreen';
import { PillarsScreen as DirectorPillars } from './screens/app/PillarsScreen';
import { WeeklyScreen as DirectorWeekly } from './screens/app/WeeklyScreen';
import { ActivityScreen as DirectorActivity } from './screens/app/ActivityScreen';
import { MaybeMobileRedirect } from './components/MaybeMobileRedirect';

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
      <Route path="/" element={<RequireAuth><MaybeMobileRedirect><MissionControl /></MaybeMobileRedirect></RequireAuth>} />
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
      {/* Mobile companion */}
      <Route path="/m/" element={<RequireAuth><MissionControlMobile /></RequireAuth>} />
      <Route path="/m/powers" element={<RequireAuth><PowersListMobile /></RequireAuth>} />
      <Route path="/m/powers/:code" element={<RequireAuth><PowerDetailMobile /></RequireAuth>} />
      <Route path="/m/pastors" element={<RequireAuth><PastorsDirectoryMobile /></RequireAuth>} />
      <Route path="/m/pastors/:id" element={<RequireAuth><PastorProfileMobile /></RequireAuth>} />
      <Route path="/m/log" element={<RequireAuth><QuickLogMobile /></RequireAuth>} />
      <Route path="/m/assessment" element={<RequireAuth><WeeklyAssessmentMobile /></RequireAuth>} />
      <Route path="/m/activity" element={<RequireAuth><ActivityLogMobile /></RequireAuth>} />
      <Route path="/m/more" element={<RequireAuth><div style={{ padding: 40 }}>More — coming soon</div></RequireAuth>} />
      {/* Director (phone-first hi-fi from director-app.html design) */}
      <Route path="/d/" element={<RequireAuth><DirectorHome /></RequireAuth>} />
      <Route path="/d/forms" element={<RequireAuth><DirectorForms /></RequireAuth>} />
      <Route path="/d/pillars" element={<RequireAuth><DirectorPillars /></RequireAuth>} />
      <Route path="/d/weekly" element={<RequireAuth><DirectorWeekly /></RequireAuth>} />
      <Route path="/d/activity" element={<RequireAuth><DirectorActivity /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
