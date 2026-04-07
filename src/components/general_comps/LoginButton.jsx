import { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { useAuthContext } from "@/context/AuthContext";
import { toast } from "@/services/notificationService";

const LoginButton = () => {
    const { login } = useAuthContext();
    const [id, setId] = useState("");
    const [phone, setPhone] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!id.trim() || !phone.trim()) {
            toast.error("יש להזין תעודת זהות וטלפון");
            return;
        }

        try {
            setIsLoading(true);
            await login({ id: id.trim(), phone: phone.trim() });
        } catch (err) {
            toast.error(err?.message || "ההתחברות נכשלה");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ width: "100%", display: "grid", gap: 1.5 }}>
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
            <Button variant="contained" onClick={handleLogin} disabled={isLoading}>
                <Typography variant="body2">
                    {isLoading ? "מתחבר..." : "התחברות עם ת.ז + טלפון"}
                </Typography>
            </Button>
        </Box>
    )
}

export default LoginButton;