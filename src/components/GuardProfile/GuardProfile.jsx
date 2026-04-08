import { useLocation, useParams } from "react-router-dom";
import { Card, CardContent, Typography, Avatar, Stack } from "@mui/material";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import GuardProfileTimeLimitForm from "components/GuardProfile/GuardProfileLimits/GuardProfileTimeLimit/GuardProfileTimeLimitForm/GuardProfileTimeLimitForm.jsx";
import GuardProfileTimeLimitTable from "components/GuardProfile/GuardProfileLimits/GuardProfileTimeLimit/GuardProfileTimeLimitTable/GuardProfileTimeLimitTable.jsx";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import BackLink from "components/general_comps/BackLink.jsx";
import GuardProfileOutpostLimit from "components/GuardProfile/GuardProfileLimits/GuardProfileOutpostLimit/GuardProfileOutpostLimit.jsx";
import GuardProfileDayLimit from "components/GuardProfile/GuardProfileLimits/GuardProfileDayLimit/GuardProfileDayLimit.jsx";
import GuardProfilePeerExclusion from "components/GuardProfile/GuardProfileLimits/GuardProfilePeerExclusion/GuardProfilePeerExclusion.jsx";
import { getGuardDetails } from "@/services/guardService.js";
import { useQuery, useQueryClient } from "react-query";
import { deleteTimeLimit, getGuardTimeLimits } from "@/services/timeLimitService.js";
import GuardProfileContact from "components/GuardProfile/GuardProfileContact/GuardProfileContact.jsx";
import { Box } from "@mui/system";
import CheckCircleIcon from "@mui/icons-material/CheckCircle.js";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked.js";
import { useIsCommander } from "@/hooks/useIsCommander";
import { getTeamAccentColor } from "@/components/GuardsPage/Guards/Guard/teamColor";

const GuardProfile = () => {
  const { state } = useLocation();
  const { guardId } = useParams();
  const campId = state?.campId ?? "";
  const queryClient = useQueryClient();
  const isCommander = useIsCommander();

  const { data: guard, error, isLoading } = useQuery(["guard", +guardId], () => getGuardDetails(guardId));
  const { data: timeLimits } = useQuery(["guardTimeLimits", +guardId], () => getGuardTimeLimits(guardId));

  const handleDelete = async (timeLimitId) => {
    try {
      await deleteTimeLimit(timeLimitId);
      queryClient.invalidateQueries(["guardTimeLimits"]);
      queryClient.invalidateQueries(["guardsAndLimits"]);
    } catch (error) {
      console.error("Error deleting time limit:", error);
    }
  };

  if (error) {
    return <div>{error}</div>;
  }

  if (isLoading || !guard) {
    return "Loading...";
  }

  const hasTeam = Boolean(guard.team?.trim());
  const joinedAt = guard.joinedAt || "—";

  return (
    <Card style={{ minWidth: 450, maxWidth: 700, margin: "auto", marginTop: "20px", padding: "16px" }}>
      <CardContent>
        <Avatar
          alt={guard.name}
          style={{ width: "80px", height: "80px", margin: "0 auto 0.5em" }}
        >
          <MilitaryTechIcon fontSize="large" />
        </Avatar>
        <Typography variant="h6" component="h2" textAlign="center" gutterBottom>
          {guard.name}
        </Typography>
        <Stack direction="row" alignItems="center" gap={1} sx={{ marginBottom: '1em' }}>
          <Stack direction="row" sx={{ marginInlineStart: 0.5 }}>{guard.shouldBeAllocated ? <CheckCircleIcon style={{ color: "green" }} /> : <RadioButtonUncheckedIcon style={{ color: "grey" }} />}</Stack>
          {/*<Box sx={{ borderRadius: "50%", width: "1em", height: "1em", backgroundColor: guard.shouldBeAllocated ? "green" : "red", margin: 1 }} />*/}
          סטטוס:
          <Typography variant="body1" fontWeight={500}>
            {guard.shouldBeAllocated ? "משתתף" : "לא משתתף"}
          </Typography>
        </Stack>
        <Stack spacing={0.8} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">תפקיד:</Typography>
            <Typography variant="body2" fontWeight={500}>{guard.role || "—"}</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">צוות:</Typography>
            <Typography
              variant="body2"
              fontWeight={500}
              sx={hasTeam ? { px: 0.8, borderRadius: 1, border: "1px solid", borderColor: getTeamAccentColor(guard.team) } : undefined}
            >
              {guard.team || "—"}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">הצטרף בתאריך:</Typography>
            <Typography variant="body2" fontWeight={500}>{joinedAt}</Typography>
          </Stack>
          <Stack direction="column" gap={0.2}>
            <Typography variant="body2" color="text.secondary">הערות:</Typography>
            <Typography variant="body2" fontWeight={500} sx={{ whiteSpace: "pre-wrap" }}>
              {guard.notes || "—"}
            </Typography>
          </Stack>
        </Stack>
        <GuardProfileContact mail={guard.mail} phone={guard.phone} />
        <Typography variant="h6" component="h3" sx={{ mt: 1 }}>
          מגבלות
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
          לפי ימים (יום מלא)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          לא ניתן לשבץ את השומר בכל אורך היום הנבחר.
        </Typography>
        <GuardProfileDayLimit guardId={Number(guardId)} readOnly={!isCommander} />

        <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
          לפי שעות (בטווח בתוך יום)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          לא ניתן לשבץ בטווח השעות ביום הנבחר (למשל 08:00–12:00).
        </Typography>
        {isCommander && <GuardProfileTimeLimitForm id={guardId} timeLimits={timeLimits} />}
        {timeLimits && timeLimits.length > 0 && <GuardProfileTimeLimitTable timeLimits={timeLimits} handleDelete={isCommander ? handleDelete : undefined} />}

        <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
          לפי עמדה
        </Typography>
        <GuardProfileOutpostLimit guardId={Number(guardId)} campId={Number(campId || guard.campId)} readOnly={!isCommander} />

        <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
          לא לשמור יחד עם שומר אחר
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          באותה משמרת (אותו מועד ועמדה) — למשל סיכסוך או מניעת ציוות.
        </Typography>
        <GuardProfilePeerExclusion guardId={Number(guardId)} campId={Number(campId || guard.campId)} readOnly={!isCommander} />
      </CardContent>
      <Box sx={{ marginInlineEnd: 1 }}>
        <BackLink place="end" icon={<ArrowBackIosIcon />}>
          חזרה לרשימת החיילים
        </BackLink>
      </Box>
    </Card>
  );
};

export default GuardProfile;
