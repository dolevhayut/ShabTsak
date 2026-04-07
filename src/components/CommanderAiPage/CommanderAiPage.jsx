import { useState } from "react";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useAuthContext } from "@/context/AuthContext";
import { logAiIntent, logCommanderAction, updateAiIntent } from "@/services/commanderActionService";
import { toast } from "@/services/notificationService";
import { moveShibutsToDate } from "@/services/shibutsService";

function parseManualAction(input) {
  const moveRegex = /(?:העבר|להעביר|move)\s+(?:שיבוץ|shibuts)\s*#?\s*(\d+)\s+(?:ל|to)\s*(\d{4}-\d{2}-\d{2})/i;
  const match = input.match(moveRegex);
  if (match) {
    return {
      type: "move_shift",
      shibutsId: Number(match[1]),
      date: match[2],
    };
  }

  return {
    type: "unknown",
    raw: input,
  };
}

const CommanderAiPage = () => {
  const { user } = useAuthContext();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmitPrompt = async () => {
    if (!prompt.trim()) {
      toast.error("נא להזין בקשה לעוזר");
      return;
    }

    try {
      setIsSubmitting(true);
      const normalizedAction = parseManualAction(prompt.trim());
      const intent = await logAiIntent({
        commanderUserId: user?.id,
        inputText: prompt.trim(),
        normalizedAction,
        executionStatus: "queued",
        executionResult: null,
        createdAt: new Date().toISOString(),
      });

      let executionStatus = "completed";
      let executionResult = { message: "נשמר ללוג בלבד, ללא פעולה אופרטיבית." };

      if (normalizedAction.type === "move_shift") {
        try {
          await moveShibutsToDate(normalizedAction.shibutsId, normalizedAction.date);
          executionResult = {
            message: "בוצעה הזזת שיבוץ בהצלחה",
            shibutsId: normalizedAction.shibutsId,
            date: normalizedAction.date,
          };
        } catch (error) {
          executionStatus = "failed";
          executionResult = {
            message: "נכשלה הזזת השיבוץ",
            error: String(error),
          };
        }
      } else {
        executionStatus = "queued";
        executionResult = {
          message: "הפעולה טרם נתמכת אוטומטית, נשמרה ללוג להמשך אינטגרציית LLM.",
        };
      }

      await updateAiIntent(intent.id, {
        executionStatus,
        executionResult,
      });

      await logCommanderAction({
        commanderUserId: user?.id,
        campId: null,
        actionType: "ai_intent_created",
        targetType: "ai_intent",
        targetId: intent.id,
        payload: { inputText: prompt.trim(), normalizedAction, executionStatus, executionResult },
        createdAt: new Date().toISOString(),
      });

      setPrompt("");
      if (executionStatus === "completed") {
        toast.success("הבקשה בוצעה בהצלחה.");
      } else if (executionStatus === "failed") {
        toast.error("הבקשה זוהתה אך נכשלה בביצוע.");
      } else {
        toast.info("הבקשה נשמרה ללוג. חיבור LLM מלא יתווסף בהמשך.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5">עוזר מפקד AI</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          זהו שלב תשתיתי. כבר עכשיו יש פעולה נתמכת לדוגמה:
          <br />
          <strong>העבר שיבוץ 123 ל-2026-04-10</strong>
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="כתוב בקשה בשפה חופשית (לדוגמה: תעביר את יוסי מהשער ליום חמישי)"
            multiline
            minRows={3}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <Button variant="contained" disabled={isSubmitting} onClick={onSubmitPrompt}>
            שלח לעיבוד
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default CommanderAiPage;
