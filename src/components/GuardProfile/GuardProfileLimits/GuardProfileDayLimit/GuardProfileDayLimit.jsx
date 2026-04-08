import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import {
  Button,
  Dialog,
  CircularProgress,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { createDayLimit, deleteDayLimit, getGuardDayLimits } from "@/services/dayLimitService.js";
import { getDayName } from "../utils.js";
import { toast } from "@/services/notificationService";
import { AddBox } from "@mui/icons-material";
import { WeekdayTogglePicker } from "../WeekdayTogglePicker.jsx";

const GuardProfileDayLimit = ({ guardId, readOnly }) => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [dayId, setDayId] = useState(0);

  const { data: dayLimits, isLoading } = useQuery({
    queryKey: ["guardDayLimits", guardId],
    queryFn: () => getGuardDayLimits(guardId),
    enabled: !!guardId,
  });

  const createMutation = useMutation(() => createDayLimit(guardId, dayId), {
    onSuccess: async () => {
      await queryClient.invalidateQueries(["guardDayLimits", guardId]);
      await queryClient.invalidateQueries(["guardsAndLimits"]);
      setOpenDialog(false);
    },
  });

  const deleteMutation = useMutation((id) => deleteDayLimit(id), {
    onSuccess: async () => {
      await queryClient.invalidateQueries(["guardDayLimits", guardId]);
      await queryClient.invalidateQueries(["guardsAndLimits"]);
    },
  });

  const handleAdd = () => {
    const exists = dayLimits?.some((d) => d.dayId === dayId);
    if (exists) {
      toast.warn("יום זה כבר מוגבל");
      return;
    }
    createMutation.mutate();
  };

  if (isLoading) {
    return <Typography align="center">טוען מגבלות ימים...</Typography>;
  }

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1}>
        {!readOnly && (
          <IconButton
            type="button"
            size="small"
            color="primary"
            onClick={() => {
              setDayId(0);
              setOpenDialog(true);
            }}
          >
            <AddBox />
          </IconButton>
        )}
      </Stack>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 440 } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Typography variant="h6" component="span" fontWeight={700}>
            הוספת מגבלת יום מלא
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 400 }}>
            בחרו יום — לא ישובץ בשום שעה ביום הזה.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <WeekdayTogglePicker label="יום בשבוע" value={dayId} onChange={setDayId} />
        </DialogContent>
        <DialogActions sx={{ marginInlineEnd: 2, marginBlockEnd: 1 }}>
          <Button onClick={() => setOpenDialog(false)}>ביטול</Button>
          <Button variant="contained" onClick={handleAdd} disabled={createMutation.isLoading}>
            {createMutation.isLoading ? <CircularProgress size={24} /> : "הוספה"}
          </Button>
        </DialogActions>
      </Dialog>

      {dayLimits && dayLimits.length > 0 && (
        <TableContainer sx={{ width: "100%", overflowX: "auto", mt: 1 }}>
          <Table size="small" sx={{ minWidth: 280 }}>
            <TableHead>
              <TableRow>
                <TableCell>יום</TableCell>
                {!readOnly && <TableCell align="right">פעולות</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {dayLimits.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{getDayName(row.dayId)}</TableCell>
                  {!readOnly && (
                    <TableCell align="right">
                      <Button size="small" color="error" onClick={() => deleteMutation.mutate(row.id)}>
                        מחק
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

export default GuardProfileDayLimit;
