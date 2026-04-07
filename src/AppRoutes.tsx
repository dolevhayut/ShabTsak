import React, { Suspense } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from "react-router-dom";
//for toast container you need the container will be in app and his css
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ROUTES from "@/constants/routeConstants";

const Layout = React.lazy(() => import("components/Layout/Layout"));
const NotFound = React.lazy(() => import("components/general_comps/NotFound"));
const CampsPage = React.lazy(() => import("components/CampsPage/CampsPage"));
const ShiftSchedule = React.lazy(() => import("components/ShiftSchedule/ShiftSchedule") as any);
const LoginPage = React.lazy(() => import("components/LoginPage/LoginPage"));
const GuardProfile = React.lazy(() => import("components/GuardProfile/GuardProfile") as any);
const OutpostsPage = React.lazy(() => import("components/outposts/outpostsPage") as any);
const PrivacyPage = React.lazy(() => import("components/PrivacyPage/PrivacyPage") as any);
const TermsPage = React.lazy(() => import("components/terms/termsPage") as any);
const ShiftsPage = React.lazy(() => import("components/shifts/shiftsPage") as any);
const GuardsPage = React.lazy(() => import("components/GuardsPage/GuardsPage") as any);
const LandingPage = React.lazy(() => import("components/LandingPage/LandingPage"));
const RegisterPage = React.lazy(() => import("components/RegisterPage/RegisterPage"));
const MyShiftsPage = React.lazy(() => import("components/MyShiftsPage/MyShiftsPage") as any);
const ShiftRequestsPage = React.lazy(() => import("components/ShiftRequestsPage/ShiftRequestsPage") as any);
const CommanderAiPage = React.lazy(() => import("components/CommanderAiPage/CommanderAiPage") as any);
const CommanderOnboardingPage = React.lazy(() => import("components/CommanderOnboardingPage/CommanderOnboardingPage") as any);
const AnalyticsPage = React.lazy(() => import("components/AnalyticsPage/AnalyticsPage") as any);
const SoldierHomePage = React.lazy(() => import("components/SoldierHomePage/SoldierHomePage") as any);
const SystemMessagesPage = React.lazy(() => import("components/SystemMessagesPage/SystemMessagesPage") as any);
import { useAuthContext } from "@/context/AuthContext";
import { Box, CircularProgress } from "@mui/material";

export default function AppRoutes() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                <Route path={ROUTES.HOME} element={<Suspense><Layout/></Suspense>}>
                    <Route path={ROUTES.HOME} element={<PrivateRoute/>}>
                        <Route index element={<SmartIndexRedirect/>}/>
                        <Route path={ROUTES.SOLDIER_HOME} element={<SoldierHomePage/>}/>
                        <Route path={ROUTES.SCHEDULE} element={<ShiftSchedule/>}/>
                        <Route path={ROUTES.MY_SHIFTS} element={<MyShiftsPage/>}/>
                        <Route path={`${ROUTES.OUTPOSTS}${ROUTES.CAMP}/:id/:name?`} element={<OutpostsPage/>}/>
                        <Route path={`${ROUTES.SHIFTS}${ROUTES.OUTPOST}/:id/:name?`} element={<ShiftsPage/>}/>
                        {/* אנליטיקס — קריאה בלבד, נגיש לכל משתמש מאומת
                            תוכן רגיש מוסתר ב-UI עם useIsCommander() */}
                        <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage/>}/>
                        <Route element={<CommanderRoute/>}>
                            <Route path={ROUTES.GUARDS} element={<GuardsPage/>}/>
                            <Route path={ROUTES.GUARD_PROFILE} element={<GuardProfile/>}/>
                            <Route path={ROUTES.SHIFT_REQUESTS} element={<ShiftRequestsPage/>}/>
                            <Route path={ROUTES.COMMANDER_AI} element={<CommanderAiPage/>}/>
                            <Route path={ROUTES.SYSTEM_MESSAGES} element={<SystemMessagesPage/>}/>
                        </Route>
                    </Route>
                    <Route element={<Suspense><Outlet /></Suspense>}>
                        <Route path={ROUTES.PRIVACY} element={<PrivacyPage/>}/>
                        <Route path={ROUTES.TERMS} element={<TermsPage/>}/>
                        <Route path={ROUTES.LOGIN} element={<LoginPage/>}/>
                        <Route path={ROUTES.REGISTER} element={<RegisterPage/>}/>
                        <Route path={ROUTES.COMMANDER_ONBOARDING} element={<CommanderOnboardingPage/>}/>
                        <Route path={ROUTES.LANDING} element={<LandingPage/>}/>
                        <Route path="*" element={<NotFound/>}/>
                    </Route>
                </Route>
            </Routes>
            <ToastContainer position="bottom-right" theme="colored" rtl/>
        </Router>
    );
}

function SmartIndexRedirect() {
    const { user } = useAuthContext();
    if (user === undefined) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
                <CircularProgress aria-label="טוען" />
            </Box>
        );
    }
    if (user?.role === "commander") return <Suspense><CampsPage /></Suspense>;
    return <Navigate to={ROUTES.SOLDIER_HOME} replace />;
}

function PrivateRoute() {
    const { user } = useAuthContext();

    if (user === undefined) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
                <CircularProgress aria-label="טוען" />
            </Box>
        );
    }

    if (user === null) {
        return <Navigate to={ROUTES.LANDING}/>
    }

    return <Suspense><Outlet/></Suspense>;
}

function CommanderRoute() {
    const { user } = useAuthContext();

    if (user === undefined) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
                <CircularProgress aria-label="טוען" />
            </Box>
        );
    }

    if (user === null) {
        return <Navigate to={ROUTES.LANDING}/>;
    }

    if (user.role !== "commander") {
        return <Navigate to={ROUTES.HOME}/>;
    }

    return <Suspense><Outlet/></Suspense>;
}
