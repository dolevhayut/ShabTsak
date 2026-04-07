import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toast } from "@/services/notificationService";
import { createCommanderOnboarding } from "@/services/commanderOnboardingService";

export default function CommanderOnboardingPage() {
  const [fullName, setFullName] = useState("");
  const [campName, setCampName] = useState("");
  const [commanderId, setCommanderId] = useState("");
  const [commanderPhone, setCommanderPhone] = useState("");
  const [onboardingPassword, setOnboardingPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");

  const isDisabled = useMemo(() => {
    return (
      isLoading ||
      !fullName.trim() ||
      !campName.trim() ||
      !commanderId.trim() ||
      !commanderPhone.trim() ||
      !onboardingPassword.trim()
    );
  }, [isLoading, fullName, campName, commanderId, commanderPhone, onboardingPassword]);

  const handleSubmit = async () => {
    if (isDisabled) return;

    try {
      setIsLoading(true);
      const sourceRef = `internal-${Date.now()}-${commanderId.trim()}`;
      const result = await createCommanderOnboarding({
        sourceRef,
        fullName,
        campName,
        commanderId,
        commanderPhone,
        onboardingPassword,
      });

      const origin = window.location.origin;
      const link = `${origin}/register?campCode=${encodeURIComponent(result.registration_code)}`;
      setInviteLink(link);
      setRegistrationCode(result.registration_code);
      toast.success("ההרשמה הפנימית נוצרה בהצלחה");
    } catch (error: any) {
      toast.error(error?.message || "שגיאה ביצירת הרשמה פנימית");
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("לינק ההזמנה הועתק");
    } catch {
      toast.error("לא הצלחתי להעתיק את הלינק");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>
            טופס הרשמה פנימי
          </Typography>
          <Typography variant="body2" color="text.secondary">
            יצירת מפקד חדש ובסיס חדש, ואז הפקת לינק הרשמה לחיילים.
          </Typography>

          <TextField
            fullWidth
            label="שם מלא"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <TextField
            fullWidth
            label="שם כיתת כוננות"
            value={campName}
            onChange={(e) => setCampName(e.target.value)}
          />
          <TextField
            fullWidth
            label="תעודת זהות מפקד"
            value={commanderId}
            onChange={(e) => setCommanderId(e.target.value)}
          />
          <TextField
            fullWidth
            label="נייד מפקד"
            value={commanderPhone}
            onChange={(e) => setCommanderPhone(e.target.value)}
          />
          <TextField
            fullWidth
            type="password"
            label="סיסמת מנהל מערכת"
            value={onboardingPassword}
            onChange={(e) => setOnboardingPassword(e.target.value)}
            helperText="סיסמה פרטית ליצירת משתמשי מפקד חדשים"
          />

          <Button variant="contained" disabled={isDisabled} onClick={handleSubmit}>
            {isLoading ? "יוצר..." : "צור הרשמה"}
          </Button>

          {inviteLink && (
            <Alert severity="success">
              <Stack spacing={1}>
                <Typography variant="body2" fontWeight={700}>
                  נוצר קוד הרשמה: {registrationCode}
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  {inviteLink}
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={copyInviteLink}
                  >
                    העתק לינק הזמנה
                  </Button>
                </Box>
              </Stack>
            </Alert>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
