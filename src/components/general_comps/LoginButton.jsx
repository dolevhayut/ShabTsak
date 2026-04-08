import { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { useAuthContext } from "@/context/AuthContext";
import { toast } from "@/services/notificationService";

const onlyDigits = (value) => value.replace(/\D/g, "");

const isValidIsraeliId = (value) => {
    const normalized = onlyDigits(value).padStart(9, "0");
    if (!/^\d{9}$/.test(normalized)) return false;

    const sum = normalized
        .split("")
        .reduce((acc, digit, index) => {
            const step = Number(digit) * (index % 2 === 0 ? 1 : 2);
            return acc + (step > 9 ? step - 9 : step);
        }, 0);

    return sum % 10 === 0;
};

const isValidIsraeliMobile = (value) => /^05\d{8}$/.test(onlyDigits(value));

const LoginButton = () => {
    const { login } = useAuthContext();
    const [id, setId] = useState("");
    const [phone, setPhone] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        const cleanId = onlyDigits(id);
        const cleanPhone = onlyDigits(phone);

        if (!cleanId || !cleanPhone) {
            toast.error("יש להזין תעודת זהות וטלפון");
            return;
        }

        if (!isValidIsraeliId(cleanId)) {
            toast.error("יש להזין תעודת זהות ישראלית תקינה");
            return;
        }

        if (!isValidIsraeliMobile(cleanPhone)) {
            toast.error("יש להזין מספר נייד ישראלי תקין");
            return;
        }

        try {
            setIsLoading(true);
            await login({ id: cleanId, phone: cleanPhone });
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
                onChange={(e) => setId(onlyDigits(e.target.value).slice(0, 9))}
                autoComplete="off"
                inputMode="numeric"
                slotProps={{
                    htmlInput: {
                        pattern: "[0-9]*",
                        maxLength: 9,
                    },
                }}
            />
            <TextField
                fullWidth
                label="טלפון"
                value={phone}
                onChange={(e) => setPhone(onlyDigits(e.target.value).slice(0, 10))}
                autoComplete="tel"
                inputMode="numeric"
                slotProps={{
                    htmlInput: {
                        pattern: "[0-9]*",
                        maxLength: 10,
                    },
                }}
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