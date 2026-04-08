import { getDayName } from "../../utils.js";
import { Table, TableBody, TableHead, TableRow, TableCell, IconButton, TableContainer } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

const formatDecimalHour = (hourValue) => {
  const hour = Number(hourValue ?? 0);
  const hh = Math.floor(hour);
  const mm = Math.round((hour - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const GuardProfileTimeLimitTable = ({ timeLimits, handleDelete }) => {
  return (
    <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 360 }}>
        <TableHead>
          <TableRow>
            <TableCell>יום</TableCell>
            <TableCell>משעה</TableCell>
            <TableCell>עד שעה</TableCell>
            <TableCell>פעולות</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {timeLimits.map((limit) => (
            <TableRow key={limit.id}>
              <TableCell>{getDayName(limit.dayId)}</TableCell>
              <TableCell>{formatDecimalHour(limit.fromHour)}</TableCell>
              <TableCell>{formatDecimalHour(limit.toHour)}</TableCell>
              <TableCell>
                <IconButton aria-label="delete" color="error" onClick={() => handleDelete(limit.id)}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default GuardProfileTimeLimitTable;
