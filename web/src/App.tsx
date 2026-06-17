import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { SeatingPlanScreen } from './screens/forms/SeatingPlanScreen';
import { DailyAttendanceScreen } from './screens/forms/DailyAttendanceScreen';
import { DailyDecisionsScreen } from './screens/forms/DailyDecisionsScreen';
import { DailyProgramScreen } from './screens/forms/DailyProgramScreen';
import { SecurityIncidentsScreen, MedicalIncidentsScreen } from './screens/forms/IncidentsScreen';
import { ActivityQuickLogScreen } from './screens/forms/ActivityQuickLogScreen';
import { PillarDetailScreen } from './screens/app/PillarDetailScreen';
import { PublicityAssetsScreen } from './screens/forms/PublicityAssetsScreen';
import { DoorToDoorScreen, ConvoyOutreachScreen } from './screens/forms/OutreachScreen';
import { MediaCoverageScreen } from './screens/forms/MediaCoverageScreen';
import { LandEldersScreen } from './screens/forms/LandEldersScreen';
import { FormSheet } from './screens/forms/FormSheet';

// Sheet overlay only — rendered outside main Routes when background navigation is active
function FormRoutes() {
  return (
    <Routes>
      <Route path="/forms/bot"              element={<RequireAuth><FormSheet><BOTForm /></FormSheet></RequireAuth>} />
      <Route path="/forms/pcm"              element={<RequireAuth><FormSheet><PCMListScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/pcm/new"          element={<RequireAuth><FormSheet><PCMForm /></FormSheet></RequireAuth>} />
      <Route path="/forms/cpc"              element={<RequireAuth><FormSheet><CPCForm /></FormSheet></RequireAuth>} />
      <Route path="/forms/daily-expenses"   element={<RequireAuth><FormSheet><DailyExpensesForm /></FormSheet></RequireAuth>} />
      <Route path="/forms/awareness-survey" element={<RequireAuth><FormSheet><AwarenessSurveyForm /></FormSheet></RequireAuth>} />
      <Route path="/forms/town-profile"     element={<RequireAuth><FormSheet><TownProfileScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/venue-inspection" element={<RequireAuth><FormSheet><VenueInspectionForm /></FormSheet></RequireAuth>} />
      <Route path="/forms/must-do"          element={<RequireAuth><FormSheet><MustDoChecklistScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/stakeholders"     element={<RequireAuth><FormSheet><StakeholdersScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/pledge-meetings"  element={<RequireAuth><FormSheet><PledgeMeetingsScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/workers"          element={<RequireAuth><FormSheet><WorkersScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/permits"          element={<RequireAuth><FormSheet><PermitsScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/sound-lighting"   element={<RequireAuth><FormSheet><SoundLightingScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/seating-plan"     element={<RequireAuth><FormSheet><SeatingPlanScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/daily-attendance" element={<RequireAuth><FormSheet><DailyAttendanceScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/daily-decisions"  element={<RequireAuth><FormSheet><DailyDecisionsScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/daily-program"    element={<RequireAuth><FormSheet><DailyProgramScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/daily-security"   element={<RequireAuth><FormSheet><SecurityIncidentsScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/daily-medical"    element={<RequireAuth><FormSheet><MedicalIncidentsScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/activity-quick-log" element={<RequireAuth><FormSheet><ActivityQuickLogScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/publicity"        element={<RequireAuth><FormSheet><PublicityAssetsScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/door-to-door"     element={<RequireAuth><FormSheet><DoorToDoorScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/convoy"           element={<RequireAuth><FormSheet><ConvoyOutreachScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/media-coverage"   element={<RequireAuth><FormSheet><MediaCoverageScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/fathers"          element={<RequireAuth><FormSheet><LandEldersScreen /></FormSheet></RequireAuth>} />
      <Route path="/forms/:slug"            element={<RequireAuth><FormSheet><Placeholder title="Form" /></FormSheet></RequireAuth>} />
    </Routes>
  );
}

export default function App() {
  const location = useLocation();
  const background = (location.state as { background?: Location } | null)?.background;

  return (
    <>
      {/* Main app — frozen at background location when a sheet is open */}
      <Routes location={background || location}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><HomeScreen /></RequireAuth>} />
        <Route path="/forms" element={<RequireAuth><FormsScreen /></RequireAuth>} />
        <Route path="/pillars" element={<RequireAuth><PillarsScreen /></RequireAuth>} />
        <Route path="/weekly" element={<RequireAuth><WeeklyScreen /></RequireAuth>} />
        <Route path="/activity" element={<RequireAuth><ActivityScreen /></RequireAuth>} />
        <Route path="/pillars/:code" element={<RequireAuth><PillarDetailScreen /></RequireAuth>} />
        <Route path="/people" element={<RequireAuth><PeopleScreen /></RequireAuth>} />
        <Route path="/budget" element={<RequireAuth><BudgetScreen /></RequireAuth>} />

        {/* Form routes as full pages */}
        <Route path="/forms/bot"              element={<RequireAuth><BOTForm /></RequireAuth>} />
        <Route path="/forms/pcm"              element={<RequireAuth><PCMListScreen /></RequireAuth>} />
        <Route path="/forms/pcm/new"          element={<RequireAuth><PCMForm /></RequireAuth>} />
        <Route path="/forms/cpc"              element={<RequireAuth><CPCForm /></RequireAuth>} />
        <Route path="/forms/daily-expenses"   element={<RequireAuth><DailyExpensesForm /></RequireAuth>} />
        <Route path="/forms/awareness-survey" element={<RequireAuth><AwarenessSurveyForm /></RequireAuth>} />
        <Route path="/forms/town-profile"     element={<RequireAuth><TownProfileScreen /></RequireAuth>} />
        <Route path="/forms/venue-inspection" element={<RequireAuth><VenueInspectionForm /></RequireAuth>} />
        <Route path="/forms/must-do"          element={<RequireAuth><MustDoChecklistScreen /></RequireAuth>} />
        <Route path="/forms/stakeholders"     element={<RequireAuth><StakeholdersScreen /></RequireAuth>} />
        <Route path="/forms/pledge-meetings"  element={<RequireAuth><PledgeMeetingsScreen /></RequireAuth>} />
        <Route path="/forms/workers"          element={<RequireAuth><WorkersScreen /></RequireAuth>} />
        <Route path="/forms/permits"          element={<RequireAuth><PermitsScreen /></RequireAuth>} />
        <Route path="/forms/sound-lighting"   element={<RequireAuth><SoundLightingScreen /></RequireAuth>} />
        <Route path="/forms/seating-plan"     element={<RequireAuth><SeatingPlanScreen /></RequireAuth>} />
        <Route path="/forms/daily-attendance" element={<RequireAuth><DailyAttendanceScreen /></RequireAuth>} />
        <Route path="/forms/daily-decisions"  element={<RequireAuth><DailyDecisionsScreen /></RequireAuth>} />
        <Route path="/forms/daily-program"    element={<RequireAuth><DailyProgramScreen /></RequireAuth>} />
        <Route path="/forms/daily-security"   element={<RequireAuth><SecurityIncidentsScreen /></RequireAuth>} />
        <Route path="/forms/daily-medical"    element={<RequireAuth><MedicalIncidentsScreen /></RequireAuth>} />
        <Route path="/forms/activity-quick-log" element={<RequireAuth><ActivityQuickLogScreen /></RequireAuth>} />
        <Route path="/forms/publicity"        element={<RequireAuth><PublicityAssetsScreen /></RequireAuth>} />
        <Route path="/forms/door-to-door"     element={<RequireAuth><DoorToDoorScreen /></RequireAuth>} />
        <Route path="/forms/convoy"           element={<RequireAuth><ConvoyOutreachScreen /></RequireAuth>} />
        <Route path="/forms/media-coverage"   element={<RequireAuth><MediaCoverageScreen /></RequireAuth>} />
        <Route path="/forms/fathers"          element={<RequireAuth><LandEldersScreen /></RequireAuth>} />
        <Route path="/forms/:slug"            element={<RequireAuth><Placeholder title="Form" /></RequireAuth>} />

        {/* Redirects */}
        <Route path="/log" element={<Navigate to="/forms/activity-quick-log" replace />} />
        <Route path="/pastors" element={<Navigate to="/forms/pcm" replace />} />
        <Route path="/pastors/:id" element={<Navigate to="/forms/pcm" replace />} />
        <Route path="/m/" element={<Navigate to="/" replace />} />
        <Route path="/m/powers" element={<Navigate to="/pillars" replace />} />
        <Route path="/m/powers/:code" element={<Navigate to="/pillars" replace />} />
        <Route path="/m/pastors" element={<Navigate to="/forms/pcm" replace />} />
        <Route path="/m/pastors/:id" element={<Navigate to="/forms/pcm" replace />} />
        <Route path="/m/log" element={<Navigate to="/forms/activity-quick-log" replace />} />
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

      {/* Sheet overlay: forms as modal when background navigation is active */}
      {background && <FormRoutes />}
    </>
  );
}
