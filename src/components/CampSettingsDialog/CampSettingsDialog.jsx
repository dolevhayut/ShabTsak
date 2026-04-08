import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Slider,
} from "@mui/material";
import { getCampSettings, updateCampSettings } from "@/services/campService";

function CampSettingsDialog({ open, onClose, campId }) {
  const [minRestHours, setMinRestHours] = useState(8);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!open || !campId) return;
    setInitialLoading(true);
    getCampSettings(campId).then((settings) => {
      setMinRestHours(Number(settings.min_rest_hours) || 8);
      setInitialLoading(false);
    });
  }, [open, campId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateCampSettings(campId, { min_rest_hours: minRestHours });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ style: { minWidth: 360, padding: 16 } }}
    >
      <DialogTitle>הגדרות שיבוץ אוטומטי</DialogTitle>
      <DialogContent>
        {initialLoading ? (
          <Typography>טוען...</Typography>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              מינימום שעות מנוחה בין משמרות
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              האלגוריתם לא ישבץ חייל למשמרת אם לא עברו מספיק שעות מנוחה מהמשמרת הקודמת שלו.
              הגדר 0 כדי לבטל את האילוץ.
            </Typography>
            <Slider
              value={minRestHours}
              onChange={(_, val) => setMinRestHours(val)}
              min={0}
              max={24}
              step={0.5}
              marks={[
                { value: 0, label: "0" },
                { value: 4, label: "4" },
                { value: 8, label: "8" },
                { value: 12, label: "12" },
                { value: 16, label: "16" },
                { value: 20, label: "20" },
                { value: 24, label: "24" },
              ]}
              valueLabelDisplay="on"
              valueLabelFormat={(v) => `${v} שעות`}
            />
            <TextField
              type="number"
              label="שעות מנוחה"
              value={minRestHours}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0 && v <= 24) setMinRestHours(v);
              }}
              inputProps={{ min: 0, max: 24, step: 0.5 }}
              size="small"
              sx={{ mt: 1, width: 140 }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ביטול</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || initialLoading}
        >
          {loading ? "שומר..." : "שמור"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

CampSettingsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  campId: PropTypes.number,
};

export default CampSettingsDialog;
