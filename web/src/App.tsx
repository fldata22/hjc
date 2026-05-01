import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { RequireAuth } from './auth/RequireAuth';
import { HomeScreen } from './screens/app/HomeScreen';
import { FormsScreen } from './screens/app/FormsScreen';
import { PillarsScreen } from './screens/app/PillarsScreen';
import { WeeklyScreen } from './screens/app/WeeklyScreen';
import { ActivityScreen } from './screens/app/ActivityScreen';
import { Placeholder } from './screens/app/Placeholder';
import { BOTForm } from './screens/forms/BOTForm';
import { PCMHuntDailyForm } from './screens/forms/PCMHuntDailyForm';
import { PCMListScreen } from './screens/forms/PCMListScreen';
import { PCMForm } from './screens/forms/PCMForm';
import { CPCForm } from './screens/forms/CPCForm';
import { DailyExpensesForm } from './screens/forms/DailyExpensesForm';
import { AwarenessSurveyForm } from './screens/forms/AwarenessSurveyForm';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Real screens at root */}
      <Route path="/" element={<RequireAuth><HomeScreen /></RequireAuth>} />
      <Route path="/forms" element={<RequireAuth><FormsScreen /></RequireAuth>} />
      <Route path="/forms/bot" element={<RequireAuth><BOTForm /></RequireAuth>} />
      <Route path="/forms/pcm-hunt-daily" element={<RequireAuth><PCMHuntDailyForm /></RequireAuth>} />
      <Route path="/forms/pcm" element={<RequireAuth><PCMListScreen /></RequireAuth>} />
      <Route path="/forms/pcm/new" element={<RequireAuth><PCMForm /></RequireAuth>} />
      <Route path="/forms/cpc" element={<RequireAuth><CPCForm /></RequireAuth>} />
      <Route path="/forms/daily-expenses" element={<RequireAuth><DailyExpensesForm /></RequireAuth>} />
      <Route path="/forms/awareness-survey" element={<RequireAuth><AwarenessSurveyForm /></RequireAuth>} />
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
      <Route path="/people" element={<RequireAuth><Placeholder title="People" /></RequireAuth>} />
      <Route path="/budget" element={<RequireAuth><Placeholder title="Budget" /></RequireAuth>} />
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
