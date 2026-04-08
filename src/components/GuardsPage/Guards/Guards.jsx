import PropTypes from "prop-types";
import {
  Box,
  CssBaseline,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Guard from "@/components/GuardsPage/Guards/Guard/Guard";
import GuardCard from "@/components/GuardsPage/Guards/Guard/GuardCard";
import { useQuery } from "react-query";
import { getGuardsByCampId } from "@/services/guardService";
import LoadingComp from "@/components/general_comps/LoadingComp";

const Guards = ({ campId, handleEdit, handleDelete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { data: guards, isLoading, isError } = useQuery({
    enabled: !!campId,
    queryFn: () => getGuardsByCampId(campId),
    queryKey: ["GuardsPage", campId],
  });

  if (isLoading) return <LoadingComp />;

  if (isError || !Array.isArray(guards) || guards.length === 0) {
    return (
      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          לא קיימים שומרים בבסיס זה
        </Typography>
      </Box>
    );
  }

  /* ─── Mobile: כרטיסים לאורך ─── */
  if (isMobile) {
    return (
      <>
        <CssBaseline />
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {guards.map((guard, index) => (
            <GuardCard
              key={guard.id}
              index={index}
              guard={guard}
              campId={campId}
              onEdit={() => handleEdit(guard)}
              onDelete={() => handleDelete(guard)}
            />
          ))}
        </Stack>
      </>
    );
  }

  /* ─── Desktop: טבלה ─── */
  return (
    <>
      <CssBaseline />
      <Paper
        elevation={0}
        sx={{
          mt: 2,
          borderRadius: "10px",
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table
            size="small"
            sx={{
              width: "100%",
              minWidth: 900,
              tableLayout: "fixed",
              "& th": {
                fontWeight: 700,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "text.secondary",
                bgcolor: "rgba(0,0,0,0.02)",
                borderBottom: "2px solid",
                borderColor: "divider",
                textAlign: "right",
                px: 2,
                py: 1.5,
              },
              "& td": {
                textAlign: "right",
                verticalAlign: "middle",
                borderColor: "divider",
                px: 2,
                py: 1.75,
              },
              "& tbody tr": {
                transition: "background-color 0.15s ease",
              },
              "& tbody tr:hover": {
                bgcolor: "rgba(75,107,42,0.03)",
              },
              "& tbody tr:last-child td": {
                borderBottom: 0,
              },
            }}
          >
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "22%" }} />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>פרופיל</TableCell>
                <TableCell>שם</TableCell>
                <TableCell sx={{ textAlign: "center !important" }}>צבע</TableCell>
                <TableCell>אימייל</TableCell>
                <TableCell>טלפון</TableCell>
                <TableCell sx={{ textAlign: "center !important" }}>שיבוץ אוטומטי</TableCell>
                <TableCell sx={{ textAlign: "center !important" }}>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {guards.map((guard, index) => (
                <Guard
                  key={guard.id}
                  index={index}
                  guard={guard}
                  campId={campId}
                  onEdit={() => handleEdit(guard)}
                  onDelete={() => handleDelete(guard)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </>
  );
};

Guards.propTypes = {
  campId: PropTypes.number,
  handleEdit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
};

export default Guards;
