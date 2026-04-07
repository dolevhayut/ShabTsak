import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import {
  Button,
  Dialog,
  Autocomplete,
  TextField,
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
  TableHead,
  TableRow,
} from "@mui/material";
import { getGuardsByCampId } from "@/services/guardService.js";
import { createPeerExclusion, deletePeerExclusion, getPeerExclusionsByGuardId } from "@/services/peerExclusionService.js";
import { toast } from "@/services/notificationService";
import { AddBox } from "@mui/icons-material";

const GuardProfilePeerExclusion = ({ guardId, campId, readOnly }) => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState(null);

  const { data: campGuards, isLoading: loadingGuards } = useQuery({
    queryKey: ["guards", campId],
    queryFn: () => getGuardsByCampId(campId),
    enabled: !!campId,
  });

  const { data: exclusions, isLoading: loadingEx } = useQuery({
    queryKey: ["peerExclusions", guardId, campId],
    queryFn: () => getPeerExclusionsByGuardId(guardId, campId),
    enabled: !!guardId && !!campId,
  });

  const peersOptions = (campGuards || []).filter((g) => g.id !== guardId);

  const createMutation = useMutation(() => createPeerExclusion(guardId, selectedGuard.id), {
    onSuccess: async () => {
      await queryClient.invalidateQueries(["peerExclusions", guardId, campId]);
      await queryClient.invalidateQueries(["guardsAndLimits", campId]);
      setSelectedGuard(null);
      setOpenDialog(false);
    },
  });

  const deleteMutation = useMutation((id) => deletePeerExclusion(id), {
    onSuccess: async () => {
      await queryClient.invalidateQueries(["peerExclusions", guardId, campId]);
      await queryClient.invalidateQueries(["guardsAndLimits", campId]);
    },
  });

  const handleAdd = () => {
    if (!selectedGuard) {
      toast.error("בחר שומר מהרשימה");
      return;
    }
    const dup = exclusions?.some((e) => e.excludedGuardId === selectedGuard.id);
    if (dup) {
      toast.warn("ההגבלה כבר קיימת");
      return;
    }
    createMutation.mutate();
  };

  const nameById = (id) => campGuards?.find((g) => g.id === id)?.name || `#${id}`;

  if (loadingGuards || loadingEx) {
    return <Typography align="center">טוען...</Typography>;
  }

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1}>
        {!readOnly && (
          <IconButton type="button" size="small" color="primary" onClick={() => setOpenDialog(true)}>
            <AddBox />
          </IconButton>
        )}
      </Stack>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} PaperProps={{ style: { minWidth: 320, maxWidth: "90vw" } }}>
        <DialogTitle>לא לשבץ עם שומר (אותה משמרת)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, mt: 0.5 }}>
            מתאים למצב של סיכסוך או כשלא ניתן לשמור יחד באותה משמרת.
          </Typography>
          <Autocomplete
            sx={{ pt: 0.5 }}
            options={peersOptions}
            getOptionLabel={(o) => o.name}
            loading={loadingGuards}
            value={selectedGuard}
            onChange={(_e, v) => setSelectedGuard(v)}
            renderInput={(params) => <TextField {...params} label="בחר שומר" />}
          />
        </DialogContent>
        <DialogActions sx={{ marginInlineEnd: 2, marginBlockEnd: 1 }}>
          <Button onClick={() => setOpenDialog(false)}>ביטול</Button>
          <Button variant="contained" onClick={handleAdd} disabled={createMutation.isLoading}>
            {createMutation.isLoading ? <CircularProgress size={24} /> : "הוספה"}
          </Button>
        </DialogActions>
      </Dialog>

      {exclusions && exclusions.length > 0 && (
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>לא לשבץ עם</TableCell>
              {!readOnly && <TableCell align="right">פעולות</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {exclusions.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{nameById(row.excludedGuardId)}</TableCell>
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
      )}
    </>
  );
};

export default GuardProfilePeerExclusion;
