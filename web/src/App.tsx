import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { RequireAuth } from './auth/RequireAuth';
import { HomeScreen } from './screens/app/HomeScreen';
import { FormsScreen } from './screens/app/FormsScreen';
import { PillarsScreen } from './screens/app/PillarsScreen';
import { WeeklyScreen } from './screens/app/WeeklyScreen';
import { ActivityScreen } from './screens/app/ActivityScreen';
import { BudgetScreen } from './screens/app/BudgetScreen';
import { PeopleScreen } from './screens/app/PeopleScreen';
import { Placeholder } from './screens/app/Placeholder';
import { BOTForm } from './screens/forms/BOTForm';
import { PCMListScreen } from './screens/forms/PCMListScreen';
import { PCMForm } from './screens/forms/PCMForm';
import { CPCForm } from './screens/forms/CPCForm';
import { DailyExpensesForm } from './screens/forms/DailyExpensesForm';
import { AwarenessSurveyForm } from './screens/forms/AwarenessSurveyForm';
import { TownProfileScreen } from './screens/forms/TownProfileScreen';
import { VenueInspectionForm } from './screens/forms/VenueInspectionForm';
import { MustDoChecklistScreen } from './screens/forms/MustDoChecklistScreen';
import { StakeholdersScreen } from './screens/forms/StakeholdersScreen';
import { PledgeMeetingsScreen } from './screens/forms/PledgeMeetingsScreen';
import { WorkersScreen } from './screens/forms/WorkersScreen';
import { PermitsScreen } from './screens/forms/PermitsScreen';
import { SoundLightingScreen } from './screens/forms/SoundLightingScreen';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Real screens at root */}
      <Route path="/" element={<RequireAuth><HomeScreen /></RequireAuth>} />
      <Route path="/forms" element={<RequireAuth><FormsScreen /></RequireAuth>} />
      <Route path="/forms/bot" element={<RequireAuth><BOTForm /></RequireAuth>} />
      <Route path="/forms/pcm" element={<RequireAuth><PCMListScreen /></RequireAuth>} />
      <Route path="/forms/pcm/new" element={<RequireAuth><PCMForm /></RequireAuth>} />
      <Route path="/forms/cpc" element={<RequireAuth><CPCForm /></RequireAuth>} />
      <Route path="/forms/daily-expenses" element={<RequireAuth><DailyExpensesForm /></RequireAuth>} />
      <Route path="/forms/awareness-survey" element={<RequireAuth><AwarenessSurveyForm /></RequireAuth>} />
      <Route path="/forms/town-profile" element={<RequireAuth><TownProfileScreen /></RequireAuth>} />
      <Route path="/forms/venue-inspection" element={<RequireAuth><VenueInspectionForm /></RequireAuth>} />
      <Route path="/forms/must-do" element={<RequireAuth><MustDoChecklistScreen /></RequireAuth>} />
      <Route path="/forms/stakeholders" element={<RequireAuth><StakeholdersScreen /></RequireAuth>} />
      <Route path="/forms/pledge-meetings" element={<RequireAuth><PledgeMeetingsScreen /></RequireAuth>} />
      <Route path="/forms/workers" element={<RequireAuth><WorkersScreen /></RequireAuth>} />
      <Route path="/forms/permits" element={<RequireAuth><PermitsScreen /></RequireAuth>} />
      <Route path="/forms/sound-lighting" element={<RequireAuth><SoundLightingScreen /></RequireAuth>} />
      <Route path="/forms/:slug" element={<RequireAuth><Placeholder title="Form" /></RequireAuth>} />
      <Route path="/pillars" element={<RequireAuth><PillarsScreen /></RequireAuth>} />
      <Route path="/weekly" element={<RequireAuth><WeeklyScreen /></RequireAuth>} />
      <Route path="/activity" element={<RequireAuth><ActivityScreen /></RequireAuth>} />

      {/* Parked features per spec decision #5 */}
      <Route path="/log" element={<RequireAuth><Placeholder title="Quick log" /></RequireAuth>} />
      <Route path="/pastors" element={<RequireAuth><Placeholder title="Pastors directory" /></RequireAuth>} />
      <Route path="/pastors/:id" element={<RequireAuth><Placeholder title="Pastor profile" /></RequireAuth>} />
      <Route path="/pillars/:code" element={<RequireAuth><Placeholder title="Pillar detail" /></RequireAuth>} />

      {/* Sidebar destinations */}
      <Route path="/people" element={<RequireAuth><PeopleScreen /></RequireAuth>} />
      <Route path="/budget" element={<RequireAuth><BudgetScreen /></RequireAuth>} />
      <Route path="/documents" element={<RequireAuth><Placeholder title="Documents" /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Placeholder title="Settings" /></RequireAuth>} />

      {/* Backwards-compat redirects (params dropped — placeholders don't use them) */}
      <Route path="/m/" element={<Navigate to="/" replace />} />
      <Route path="/m/powers" element={<Navigate to="/pillars" replace />} />
      <Route path="/m/powers/:code" element={<Navigate to="/pillars" replace />} />
      <Route path="/m/pastors" element={<Navigate to="/pastors" replace />} />
      <Route path="/m/pastors/:id" element={<Navigate to="/pastors" replace />} />
      <Route path="/m/log" element={<Navigate to="/log" replace />} />
      <Route path="/m/assessment" element={<Navigate to="/weekly" replace />} />
      <Route path="/m/activity" element={<Navigate to="/activity" replace />} />
      <Route path="/m/more" element={<Navigate to="/" replace />} />
      <Route path="/d/" element={<Navigate to="/" replace />} />
      <Route path="/d/forms" element={<Navigate to="/forms" replace />} />
      <Route path="/d/pillars" element={<Navigate to="/pillars" replace />} />
      <Route path="/d/weekly" element={<Navigate to="/weekly" replace />} />
      <Route path="/d/activity" element={<Navigate to="/activity" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
