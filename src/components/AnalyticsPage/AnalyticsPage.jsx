import { useState, useEffect, useCallback } from "react";
import {
  Avatar, Box, Button, Chip, CircularProgress,
  Divider, Grid, Paper, Stack, Tooltip, Typography,
} from "@mui/material";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import SecurityIcon      from "@mui/icons-material/Security";
import GroupIcon         from "@mui/icons-material/Group";
import LocationOnIcon    from "@mui/icons-material/LocationOn";
import EmojiEventsIcon   from "@mui/icons-material/EmojiEvents";
import TrendingDownIcon  from "@mui/icons-material/TrendingDown";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SwapHorizIcon     from "@mui/icons-material/SwapHoriz";
import { DatePicker }         from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs }        from "@mui/x-date-pickers/AdapterDayjs";
import TextField from "@mui/material/TextField";
import dayjs from "dayjs";
import SelectCamp            from "@/components/general_comps/SelectCamp";
import { getAnalyticsData }  from "@/services/analyticsService";
import { getGravatarUrl }    from "@/components/GuardProfile/GuardProfileLimits/utils.js";
import { useIsCommander }    from "@/hooks/useIsCommander";

const CHART_COLORS = [
  "#4B6B2A","#7C3AED","#0891B2","#16A34A","#D97706",
  "#DC2626","#9333EA","#0284C7","#15803D","#B45309",
];

/* ── SummaryCard ── */
function SummaryCard({ icon, label, value, sub, color = "primary.main" }) {
  return (
    <Paper elevation={0} sx={{
      border:"1px solid", borderColor:"divider", borderRadius:"10px",
      p:2.25, height:"100%",
      transition:"box-shadow 0.18s ease, border-color 0.18s ease",
      "&:hover":{ boxShadow:"0 4px 16px rgba(0,0,0,0.08)", borderColor:color },
    }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}
            sx={{ textTransform:"uppercase", letterSpacing:"0.05em", fontSize:"0.7rem" }}>
            {label}
          </Typography>
          <Typography variant="h3" fontWeight={700}
            sx={{ mt:0.5, color, fontSize:{ xs:"1.5rem", md:"1.875rem" } }}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary" sx={{ mt:0.25, display:"block" }}>
              {sub}
            </Typography>
          )}
        </Box>
        <Box sx={{ p:1.25, borderRadius:"8px", bgcolor:`${color}18`, display:"flex", alignItems:"center" }}>
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}

/* ── Custom Recharts Tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={3} sx={{ px:2, py:1.25, borderRadius:"8px", border:"1px solid", borderColor:"divider", minWidth:120 }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      {payload.map((p, i) => (
        <Typography key={i} variant="body2" fontWeight={700} sx={{ color:p.color || "text.primary" }}>
          {p.name}: {p.value}
        </Typography>
      ))}
    </Paper>
  );
};

/* ── Podium ── */
function Podium({ guards }) {
  if (!guards?.length) return null;
  const top3   = guards.slice(0, 3);
  const order  = top3.length === 3 ? [1,0,2] : top3.length === 2 ? [1,0] : [0];
  const heights = ["80px","104px","64px"];
  const medals  = ["🥈","🥇","🥉"];
  const bgs     = ["#E5E7EB","#FCD34D","#D97706"];

  return (
    <Stack direction="row" alignItems="flex-end" justifyContent="center" gap={1.5} sx={{ mt:1, mb:0.5 }}>
      {order.map((idx) => {
        const g = top3[idx];
        if (!g) return null;
        return (
          <Stack key={g.id} alignItems="center" gap={0.75}>
            <Avatar src={getGravatarUrl(g.mail)} alt={g.name}
              sx={{ width:40, height:40, border:`2px solid ${bgs[idx]}` }} />
            <Typography variant="caption" fontWeight={700}
              sx={{ maxWidth:68, textAlign:"center", lineHeight:1.2,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {g.name}
            </Typography>
            <Box sx={{ width:68, borderRadius:"8px 8px 0 0", bgcolor:bgs[idx],
                       display:"flex", flexDirection:"column",
                       alignItems:"center", justifyContent:"flex-end",
                       height:heights[idx], pb:1 }}>
              <Typography sx={{ fontSize:"1.1rem" }}>{medals[idx]}</Typography>
              <Typography variant="caption" fontWeight={700}>{g.count}</Typography>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

/* ── Progress bar row ── */
function ProgressRow({ label, count, maxCount, color, sub }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.5} sx={{ py:0.5 }}>
      <Typography variant="body2" fontWeight={600} noWrap sx={{ minWidth:56, maxWidth:72, overflow:"hidden", textOverflow:"ellipsis" }}>
        {label}
      </Typography>
      <Box sx={{ flex:1, height:8, bgcolor:"rgba(0,0,0,0.06)", borderRadius:4, overflow:"hidden" }}>
        <Box sx={{
          height:"100%", bgcolor: color || "primary.main", borderRadius:4,
          width:`${Math.max(4, (count / maxCount) * 100)}%`,
          transition:"width 0.5s ease",
        }} />
      </Box>
      <Typography variant="caption" fontWeight={700} sx={{ minWidth:22, textAlign:"center" }}>{count}</Typography>
      {sub && <Typography variant="caption" color="text.disabled" noWrap>{sub}</Typography>}
    </Stack>
  );
}

export default function AnalyticsPage() {
  const isCommander = useIsCommander();
  const [campId, setCampId] = useState(null);
  const [from, setFrom]     = useState(dayjs().startOf("month"));
  const [to, setTo]         = useState(dayjs().endOf("month"));
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!campId) return;
    setLoading(true);
    try {
      const result = await getAnalyticsData(campId, from.toDate(), to.endOf("day").toDate());
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [campId, from, to]);

  useEffect(() => { if (campId) fetchData(); }, [campId, fetchData]);

  const hasData = data && data.total > 0;

  return (
    <Box sx={{ overflow:"hidden", width:"100%" }}>
      {/* ── בורר בסיס ── */}
      <Box sx={{ mb:2 }}>
        <SelectCamp selectedCampId={campId} setSelectedCampId={setCampId}
          title="אנליטיקס" title2="בבסיס:" onCampChange={() => {}} />
      </Box>

      {/* ── בורר תאריכים ── */}
      <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:"10px", p:2, mb:3, overflow:"hidden" }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" gap={1}>
              <CalendarTodayIcon sx={{ fontSize:17, color:"text.secondary" }} />
              <Typography variant="body2" fontWeight={600} color="text.secondary">טווח תאריכים</Typography>
            </Stack>
            <Stack direction={{ xs:"column", sm:"row" }} gap={1.5} alignItems={{ xs:"stretch", sm:"center" }} flexWrap="wrap">
              <DatePicker label="מתאריך" value={from} onChange={(v) => v && setFrom(v)} maxDate={to}
                renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
              <DatePicker label="עד תאריך" value={to} onChange={(v) => v && setTo(v)} minDate={from}
                renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
              <Button variant="contained" size="small" onClick={fetchData}
                disabled={!campId || loading} sx={{ height:40, px:2.5, flexShrink:0, alignSelf:{ xs:"flex-end", sm:"center" } }}>
                {loading ? <CircularProgress size={14} color="inherit" /> : "רענן"}
              </Button>
            </Stack>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {[
                { label:"חודש נוכחי", fn:() => { setFrom(dayjs().startOf("month")); setTo(dayjs().endOf("month")); } },
                { label:"3 חודשים",   fn:() => { setFrom(dayjs().subtract(3,"month")); setTo(dayjs()); } },
                { label:"שנה נוכחית", fn:() => { setFrom(dayjs().startOf("year")); setTo(dayjs()); } },
              ].map((q) => (
                <Chip key={q.label} label={q.label} size="small" onClick={q.fn} clickable
                  sx={{ height:26, fontSize:"0.72rem" }} />
              ))}
            </Stack>
          </Stack>
        </LocalizationProvider>
      </Paper>

      {/* ── מצב טעינה ── */}
      {loading && <Box sx={{ display:"flex", justifyContent:"center", py:10 }}><CircularProgress /></Box>}

      {/* ── אין בסיס ── */}
      {!campId && !loading && (
        <Box sx={{ textAlign:"center", py:10 }}>
          <SecurityIcon sx={{ fontSize:52, color:"text.disabled", mb:1.5 }} />
          <Typography variant="h3" color="text.secondary" gutterBottom>בחר בסיס</Typography>
          <Typography variant="body2" color="text.disabled">בחר בסיס מהתפריט כדי להציג אנליטיקס</Typography>
        </Box>
      )}

      {/* ── אין נתונים ── */}
      {campId && !loading && data && !hasData && (
        <Box sx={{ textAlign:"center", py:10 }}>
          <SecurityIcon sx={{ fontSize:52, color:"text.disabled", mb:1.5 }} />
          <Typography variant="h3" color="text.secondary" gutterBottom>אין שיבוצים</Typography>
          <Typography variant="body2" color="text.disabled">לא נמצאו שיבוצים בטווח הנבחר</Typography>
        </Box>
      )}

      {hasData && (
        <Stack spacing={3}>
          {/* ════════ 1. כרטיסי סיכום ════════ */}
          <Grid container spacing={2}>
            {[
              { icon:<SecurityIcon sx={{ fontSize:22, color:"primary.main" }}/>,
                label:"סה״כ שיבוצים", value:data.total, sub:"בטווח הנבחר", color:"primary.main" },
              { icon:<GroupIcon sx={{ fontSize:22, color:"#7C3AED" }}/>,
                label:"חיילים פעילים", value:data.uniqueGuards,
                sub:`ממוצע ${data.avgPerGuard} שיבוצים לחייל`, color:"#7C3AED" },
              { icon:<LocationOnIcon sx={{ fontSize:22, color:"#0891B2" }}/>,
                label:"עמדות פעילות", value:data.activeOutposts,
                sub:"עמדות עם שיבוצים", color:"#0891B2" },
              { icon:<SwapHorizIcon sx={{ fontSize:22, color:"#16A34A" }}/>,
                label:"ממוצע לחייל", value:data.avgPerGuard,
                sub:"שיבוצים לחייל בטווח", color:"#16A34A" },
            ].map((c, i) => (
              <Grid item xs={6} md={3} key={i}>
                <SummaryCard {...c} />
              </Grid>
            ))}
          </Grid>

          {/* ════════ 2. חיילים מצטיינים ════════
               • "שומר מצטיין" — גלוי לכולם (מידע חיובי/ציבורי)
               • "זקוק לחיזוק" — מפקד בלבד (מידע ניהולי רגיש) */}
          <Grid container spacing={2}>
            {data.mostActive && (
              <Grid item xs={12} sm={isCommander ? 6 : 12}>
                <Paper elevation={0} sx={{
                  border:"1px solid", borderColor:"divider", borderRadius:"10px",
                  p:2, height:"100%",
                  background:"linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%)",
                }}>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mb:1.5 }}>
                    <EmojiEventsIcon sx={{ color:"#D97706", fontSize:20 }} />
                    <Typography variant="subtitle2" fontWeight={700}>שומר מצטיין 🏆</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={2}>
                    <Avatar src={getGravatarUrl(data.mostActive.mail)}
                      sx={{ width:46, height:46, border:"2px solid #FCD34D" }} />
                    <Box sx={{ minWidth:0 }}>
                      <Typography fontWeight={700} variant="subtitle1" noWrap>{data.mostActive.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {data.mostActive.count} שיבוצים · {data.mostActive.outpostCount} עמדות שונות
                      </Typography>
                    </Box>
                    <Chip label="הכי הרבה" color="warning" size="small" sx={{ flexShrink:0 }} />
                  </Stack>
                  {data.guardOutpostBreakdown[0]?.topOutposts?.length > 0 && (
                    <Box sx={{ mt:1.5 }}>
                      <Stack spacing={0.4}>
                        {data.guardOutpostBreakdown[0].topOutposts.slice(0,3).map((o) => (
                          <Stack key={o.id} direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ flex:1, minWidth:0 }}>{o.name}</Typography>
                            <Chip label={o.count} size="small" sx={{ height:18, fontSize:"0.65rem", "& .MuiChip-label":{px:0.75} }} />
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}

            {/* "זקוק לחיזוק" — מידע ניהולי: גלוי למפקד בלבד */}
            {isCommander && data.leastActive && (
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{
                  border:"1px solid", borderColor:"divider", borderRadius:"10px",
                  p:2, height:"100%",
                  background:"linear-gradient(135deg,#F9FAFB 0%,#F3F4F6 100%)",
                }}>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mb:1.5 }}>
                    <TrendingDownIcon sx={{ color:"#6B7280", fontSize:20 }} />
                    <Typography variant="subtitle2" fontWeight={700}>זקוק לחיזוק</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={2}>
                    <Avatar src={getGravatarUrl(data.leastActive.mail)} sx={{ width:46, height:46 }} />
                    <Box sx={{ minWidth:0 }}>
                      <Typography fontWeight={700} variant="subtitle1" noWrap>{data.leastActive.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {data.leastActive.count} שיבוצים · {data.leastActive.outpostCount} עמדות שונות
                      </Typography>
                    </Box>
                    <Chip label="הכי פחות" size="small" sx={{ flexShrink:0 }} />
                  </Stack>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* ════════ 3. דירוג חיילים ════════ */}
          <Grid container spacing={2}>
            {/* גרף אופקי */}
            <Grid item xs={12} md={7} sx={{ minWidth:0 }}>
              <Paper elevation={0} sx={{
                border:"1px solid", borderColor:"divider", borderRadius:"10px",
                p:2.5, height:"100%", overflow:"hidden",
              }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb:2 }}>
                  👤 שיבוצים לפי חייל
                </Typography>
                <Box dir="ltr" sx={{ width:"100%", overflow:"hidden" }}>
                  <ResponsiveContainer width="100%" height={Math.max(220, data.guardStats.length * 30)}>
                    <BarChart data={data.guardStats} layout="vertical"
                      margin={{ top:4, right:12, left:4, bottom:4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize:11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize:11 }} width={74} />
                      <ReTooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" name="שיבוצים" radius={[0,6,6,0]}>
                        {data.guardStats.map((entry, i) => (
                          <Cell key={entry.id} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* פודיום + שאר */}
            <Grid item xs={12} md={5} sx={{ minWidth:0 }}>
              <Paper elevation={0} sx={{
                border:"1px solid", borderColor:"divider", borderRadius:"10px",
                p:2.5, height:"100%", overflow:"hidden",
              }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb:1 }}>🏆 לוח הכבוד</Typography>
                <Podium guards={data.guardStats} />
                {data.guardStats.length > 3 && (
                  <>
                    <Divider sx={{ my:1.5 }} />
                    <Stack spacing={0.4}>
                      {data.guardStats.slice(3).map((g, i) => (
                        <ProgressRow
                          key={g.id}
                          label={g.name}
                          count={g.count}
                          maxCount={data.guardStats[0].count}
                          color={g.color}
                          sub={`${g.outpostCount} עמדות`}
                        />
                      ))}
                    </Stack>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* ════════ 4. עמדות ════════ */}
          <Grid container spacing={2}>
            {/* עוגת עמדות */}
            <Grid item xs={12} md={5} sx={{ minWidth:0 }}>
              <Paper elevation={0} sx={{
                border:"1px solid", borderColor:"divider", borderRadius:"10px",
                p:2.5, overflow:"hidden",
              }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb:2 }}>
                  📍 שיבוצים לפי עמדה
                </Typography>
                <Box dir="ltr" sx={{ width:"100%", overflow:"hidden" }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart margin={{ top:0, right:0, left:0, bottom:0 }}>
                      <Pie data={data.outpostStats} dataKey="count" nameKey="name"
                        cx="50%" cy="44%" outerRadius={80} innerRadius={42} paddingAngle={3}>
                        {data.outpostStats.map((entry, i) => (
                          <Cell key={entry.id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" iconSize={9}
                        formatter={(v) => <span style={{ fontSize:11 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* פירוט עמדה + חיילים מובילים */}
            <Grid item xs={12} md={7} sx={{ minWidth:0 }}>
              <Paper elevation={0} sx={{
                border:"1px solid", borderColor:"divider", borderRadius:"10px",
                p:2.5, height:"100%", overflow:"hidden",
              }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb:2 }}>
                  📊 פירוט עמדות — מי שומר איפה
                </Typography>
                <Stack spacing={1.75}>
                  {data.outpostGuardBreakdown.map((o, oi) => (
                    <Box key={o.id}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb:0.75 }}>
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Box sx={{ width:10, height:10, borderRadius:"50%",
                            bgcolor: CHART_COLORS[oi % CHART_COLORS.length], flexShrink:0 }} />
                          <Typography variant="body2" fontWeight={700} noWrap>{o.name}</Typography>
                        </Stack>
                        <Stack direction="row" gap={0.75} alignItems="center">
                          <Chip label={`${o.count} שיבוצים`} size="small"
                            sx={{ height:20, fontSize:"0.68rem", "& .MuiChip-label":{px:0.75} }} />
                          <Chip label={`${o.guardCount} חיילים`} size="small" variant="outlined"
                            sx={{ height:20, fontSize:"0.68rem", "& .MuiChip-label":{px:0.75} }} />
                        </Stack>
                      </Stack>
                      {/* top guards per outpost */}
                      <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ pr:2 }}>
                        {o.topGuards.map((g) => (
                          <Tooltip key={g.id} title={`${g.name}: ${g.count} שיבוצים`}>
                            <Stack direction="row" alignItems="center" gap={0.5}
                              sx={{
                                bgcolor:"rgba(0,0,0,0.035)", borderRadius:"6px",
                                px:0.75, py:0.3, cursor:"default",
                              }}>
                              <Box sx={{ width:8, height:8, borderRadius:"50%",
                                bgcolor:g.color || "#9CA3AF", flexShrink:0 }} />
                              <Typography variant="caption" fontWeight={500} noWrap sx={{ maxWidth:60 }}>
                                {g.name}
                              </Typography>
                              <Typography variant="caption" color="text.disabled" fontWeight={700}>
                                ×{g.count}
                              </Typography>
                            </Stack>
                          </Tooltip>
                        ))}
                      </Stack>
                      {oi < data.outpostGuardBreakdown.length - 1 && (
                        <Divider sx={{ mt:1.25 }} />
                      )}
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* ════════ 5. Top שילובים חייל × עמדה — מפקד בלבד ════════
               מידע ניהולי: מי מכסה מה, להחלטות שיבוץ עתידיות */}
          {isCommander && data.topCombos.length > 0 && (
            <Paper elevation={0} sx={{
              border:"1px solid", borderColor:"divider", borderRadius:"10px",
              p:2.5, overflow:"hidden",
            }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb:2 }}>
                🔗 שילובים מובילים — חייל × עמדה
              </Typography>
              <Grid container spacing={1}>
                {data.topCombos.map((c, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between"
                      sx={{
                        px:1.5, py:1, borderRadius:"8px",
                        bgcolor: i === 0 ? "rgba(253,211,77,0.12)" : "rgba(0,0,0,0.025)",
                        border:"1px solid", borderColor: i === 0 ? "#FCD34D" : "divider",
                      }}>
                      <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth:0 }}>
                        <Box sx={{ width:8, height:8, borderRadius:"50%",
                          bgcolor:c.guardColor || "#9CA3AF", flexShrink:0 }} />
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth:72 }}>
                          {c.guardName}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">×</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ flex:1, minWidth:0 }}>
                          {c.outpostName}
                        </Typography>
                      </Stack>
                      <Chip label={c.count} size="small"
                        color={i === 0 ? "warning" : "default"}
                        sx={{ height:20, minWidth:28, fontSize:"0.7rem", flexShrink:0, "& .MuiChip-label":{px:0.75} }} />
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
}
