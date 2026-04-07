import { useState } from "react";
import { Box, Button, Container, TextField, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { Navigate, Link } from "react-router-dom";
import { toast } from "@/services/notificationService";
import ROUTES from "@/constants/routeConstants";
import { theme } from "@/theme/theme";
import { useAuthContext } from "@/context/AuthContext";

export default function RegisterPage() {
    const { user, register } = useAuthContext();
    const [name, setName] = useState("");
    const [id, setId] = useState("");
    const [phone, setPhone] = useState("");
    const [campCode, setCampCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    if (user === undefined) return null;
    if (user) return <Navigate to={ROUTES.HOME} />;

    const handleRegister = async () => {
        if (!name.trim() || !id.trim() || !phone.trim() || !campCode.trim()) {
            toast.error("יש למלא את כל השדות, כולל קוד הבסיס שקיבלתם מהמפקד");
            return;
        }

        try {
            setIsLoading(true);
            await register({
                name: name.trim(),
                id: id.trim(),
                phone: phone.trim(),
                campCode: campCode.trim(),
            });
            toast.success("ההרשמה הצליחה! ברוכים הבאים");
        } catch (err: any) {
            toast.error(err?.message || "ההרשמה נכשלה");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <Container component="main" maxWidth="xs">
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: "80vh",
                        gap: 2,
                        textAlign: "center",
                    }}
                >
                    <Typography variant="h1">הרשמה למערכת</Typography>
                    <Typography variant="body2">
                        הזינו את קוד הבסיס שקיבלתם מהמפקד, ואת פרטיכם האישיים
                    </Typography>

                    <Box sx={{ width: "100%", display: "grid", gap: 1.5 }}>
                        <TextField
                            fullWidth
                            label="קוד בסיס (מהמפקד)"
                            value={campCode}
                            onChange={(e) => setCampCode(e.target.value)}
                            autoComplete="off"
                            inputProps={{
                                style: { fontFamily: "ui-monospace, monospace", letterSpacing: "0.08em" },
                            }}
                            helperText="אותיות ומספרים — ללא רווחים מיותרים"
                        />
                        <TextField
                            fullWidth
                            label="שם מלא"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                        />
                        <TextField
                            fullWidth
                            label="תעודת זהות"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            autoComplete="off"
                        />
                        <TextField
                            fullWidth
                            label="טלפון"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
                        />
                        <Button
                            variant="contained"
                            onClick={handleRegister}
                            disabled={isLoading}
                            sx={{ mt: 1 }}
                        >
                            <Typography variant="body2">
                                {isLoading ? "נרשם..." : "הרשמה"}
                            </Typography>
                        </Button>
                    </Box>

                    <Typography variant="body2" sx={{ mt: 2 }}>
                        כבר רשומים?{" "}
                        <Link
                            to={ROUTES.LOGIN}
                            style={{ color: "#4B6B2A", textDecoration: "underline", fontWeight: 600 }}
                        >
                            התחברו כאן
                        </Link>
                    </Typography>
                </Box>
            </Container>
        </ThemeProvider>
    );
}
