import ROUTES from '@/constants/routeConstants';
import { Box, Typography, Container } from "@mui/material";
import { theme } from "@/theme/theme";
import { ThemeProvider } from "@mui/material/styles";
import LoginButton from "components/general_comps/LoginButton.jsx";
import { Navigate, Link } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
export default function LoginPage() {
    const { user } = useAuthContext();
    if (user === undefined) {
        return null;
    }
    if (user) {
        return <Navigate to={ROUTES.HOME} />;
    }

    return (
        <ThemeProvider theme={theme}>
            <Container component="main" maxWidth="xs">
                <Box sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "80vh",
                    gap: 2,
                    textAlign: "center"
                }}>
                    <Typography variant="h1">ברוכים הבאים לשבצ׳׳קון!</Typography>
                    <Typography variant="body2">כדי לצפות במשמרות ולבצע שינויים<br />יש להתחבר</Typography>
                    <LoginButton />
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
                        הרשמה לראשונה: קבלו מהמפקד את קוד הבסיס והזינו אותו בעמוד ההרשמה יחד עם תעודת הזהות והטלפון.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        עדיין לא רשומים?{" "}
                        <Link
                            to={ROUTES.REGISTER}
                            style={{ color: "#4B6B2A", textDecoration: "underline", fontWeight: 600 }}
                        >
                            הירשמו כאן
                        </Link>
                    </Typography>
                </Box>
            </Container>
        </ThemeProvider>
    )
}