import { useState } from "react";
import PropTypes from "prop-types";
import { TableCell, TableRow, IconButton, Button, Avatar, Stack, Box, Typography, Tooltip } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { getGravatarUrl } from "../../../GuardProfile/GuardProfileLimits/utils.js";
import { useNavigate } from "react-router-dom";
import ShiftHistoryDialog from "./ShiftHistoryDialog";

const Guard = ({ campId, guard, onEdit, onDelete, index }) => {
  const navigate = useNavigate();
  const [historyOpen, setHistoryOpen] = useState(false);
  const emailValue = guard.mail?.trim() ? guard.mail : "—";
  const phoneValue = guard.phone?.trim() ? guard.phone : "—";

  const handleLimitButtonClick = () => {
    navigate(`/guards/${guard.id}`, { state: { campId: campId } });
  };

  return (
    <TableRow>
      <TableCell>
        {index + 1}
      </TableCell>
      <TableCell>
        <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 0.5 }}>
          <Avatar src={getGravatarUrl(guard.mail)} alt={guard.name} />
        </Box>
      </TableCell>
      <TableCell>
        <Stack spacing={0.75} sx={{ width: "100%" }}>
          <Typography sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{guard.name}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.75 }}>
            <Typography component="span">צבע:</Typography>
            <Box
              component="span"
              sx={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "1px solid #d1d5db",
                display: "inline-block",
                backgroundColor: guard.color || "#4B6B2A",
              }}
            />
          </Box>
          <Typography sx={{ overflowWrap: "anywhere" }}>
            אימייל: {emailValue}
          </Typography>
          <Typography sx={{ overflowWrap: "anywhere" }}>
            טלפון: {phoneValue}
          </Typography>
        </Stack>
      </TableCell>
      <TableCell align="center">
        <Box sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
          {guard.shouldBeAllocated ? <CheckCircleIcon style={{ color: "green" }} /> : <RadioButtonUncheckedIcon style={{ color: "grey" }} />}
        </Box>
      </TableCell>
      <TableCell align="center">
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ width: "100%" }}>
          <Button onClick={handleLimitButtonClick} variant="outlined" color="primary" size="small">
            הגבלות
          </Button>
          <Tooltip title="היסטוריית משמרות">
            <IconButton size="small" onClick={() => setHistoryOpen(true)} sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onEdit} size="small" color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={onDelete} size="small" color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </TableCell>

      <ShiftHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        guard={guard}
        campId={campId}
      />
    </TableRow>
  );
};
Guard.propTypes = {
  index: PropTypes.number.isRequired,
  guard: PropTypes.object.isRequired,
  campId: PropTypes.number,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default Guard;
