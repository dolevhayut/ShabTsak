import { useEffect, useRef } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import { motion, useAnimation, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { AnimatedWords } from "components/general_comps/AnimatedWords";
import { delayedVariant, riseWithFade } from "@/utils/motionVariants";
import ROUTES from "@/constants/routeConstants";
import { useAuthContext } from "@/context/AuthContext";

// ── motion helpers ─────────────────────────────────────────────────────────────

function FadeUp({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const controls = useAnimation();

  useEffect(() => {
    if (inView) controls.start("animate");
  }, [inView, controls]);

  return (
    <motion.div
      ref={ref}
      variants={delayedVariant(riseWithFade, delay)}
      initial="initial"
      animate={controls}
    >
      {children}
    </motion.div>
  );
}

// ── colour tokens ──────────────────────────────────────────────────────────────

const GOLD = "#C8A94A";
const GOLD_LIGHT = "#F1D36E";
const CREAM = "#F8F4DD";
const CREAM_MID = "#D7D3B1";
const DARK = "#1B2416";
const DARK_MID = "#2F3B2A";
const GREEN_MID = "#5A6848";
const GREEN_BORDER = "rgba(200,169,74,0.45)";
const STRIPE =
  "repeating-linear-gradient(90deg, #C8A94A 0 18px, #6B7A52 18px 36px, #4B5A3E 36px 54px)";
const STRIPE2 =
  "repeating-linear-gradient(90deg, #8A8F63 0 18px, #C8A94A 18px 36px, #5A6848 36px 54px)";

// ── data ───────────────────────────────────────────────────────────────────────

const NEW_FEATURES = [
  {
    Icon: AutoFixHighOutlinedIcon,
    title: "שיבוץ אוטומטי חכם",
    desc: "אלגוריתם מתקדם שמשבץ את השומרים בצורה הוגנת, בהתחשב באילוצים, זמינות ומינימום שומרים לעמדה.",
    isNew: false,
  },
  {
    Icon: SmartToyOutlinedIcon,
    title: "עוזר AI אישי למפקד",
    desc: "בינה מלאכותית שמנתחת את נתוני השמירות, מתריעה על חוסרים, ומציעה פתרונות חכמים לניהול הסד״כ.",
    isNew: true,
  },
  {
    Icon: EventBusyOutlinedIcon,
    title: "ניהול אילוצים ובקשות",
    desc: "מתנדבים מזינים מראש מתי אינם זמינים, והמערכת מתחשבת בכך אוטומטית בעת בניית הלוח.",
    isNew: false,
  },
  {
    Icon: HomeOutlinedIcon,
    title: "אפליקציה אישית לכל שומר",
    desc: "כל מתנדב רואה את המשמרות שלו, מגיש בקשות היעדרות, ומקבל תזכורות היישר לנייד.",
    isNew: false,
  },
  {
    Icon: QueryStatsOutlinedIcon,
    title: "דוחות וסטטיסטיקות",
    desc: "מעקב שקוף אחר כמות המשמרות של כל שומר, שעות שמירה, וניתוח הוגנות בחלוקת הנטל.",
    isNew: true,
  },
  {
    Icon: ShieldOutlinedIcon,
    title: "הגבלות ופטורים אישיים",
    desc: "הגדרת פטורים ממשמרות לילה, הגבלת עמדות לשומרים ספציפיים, ועוד מגוון חוקי שיבוץ מתקדמים.",
    isNew: true,
  },
  {
    Icon: GroupsOutlinedIcon,
    title: "ניהול סד״כ וכוננות",
    desc: "תמונת מצב מלאה של מצבת כוח האדם, עמדות השמירה, וזמינות הצוות בכל רגע נתון.",
    isNew: false,
  },
  {
    Icon: CampaignOutlinedIcon,
    title: "תקשורת והודעות מערכת",
    desc: "העברת עדכונים, נהלים והודעות חשובות לכלל הצוות או לעמדות ספציפיות בלחיצת כפתור.",
    isNew: false,
  },
];

const HOW_IT_WORKS = [
  { n: "01", text: "הגדירו את היישוב או הבסיס שלכם, כולל עמדות השמירה והמשמרות הנדרשות." },
  { n: "02", text: "הזמינו את המתנדבים או החיילים להצטרף למערכת ולהזין את האילוצים שלהם." },
  { n: "03", text: "שבצו את השומרים בלחיצת כפתור — המערכת תדאג לחלוקה הוגנת וחכמה." },
  { n: "04", text: "השומרים מקבלים עדכונים בנייד, והמפקד רואה תמונת מצב מלאה בכל רגע." },
];

const TESTIMONIALS = [
  {
    quote: "המערכת חסכה לי שעות של עבודה כל שבוע. אין יותר ויכוחים על משמרות, הכל שקוף וברור.",
    name: "רועי כהן",
    role: "רבש״צ, יישוב בדרום",
  },
  {
    quote: "סוף סוף אפליקציה שמבינה את הצרכים של כיתת כוננות. השיבוץ האוטומטי פשוט גאוני.",
    name: "יעל לוי",
    role: "סגנית רבש״צ, יישוב בצפון",
  },
  {
    quote: "החיילים מתים על זה. הם רואים הכל בנייד, מגישים בקשות בקלות, ומקבלים הודעות בזמן אמת.",
    name: "עומר יצחקי",
    role: "מפקד כיתת כוננות, עוטף עזה",
  },
];

const CORE_FEATURES = [
  { Icon: CalendarMonthOutlinedIcon, label: "לוח שיבוצים חי" },
  { Icon: AutoFixHighOutlinedIcon,   label: "שיבוץ אוטומטי" },
  { Icon: SmartToyOutlinedIcon,      label: "עוזר AI למפקד" },
  { Icon: EventBusyOutlinedIcon,     label: "ניהול אילוצים" },
  { Icon: GroupsOutlinedIcon,        label: "ניהול סד״כ" },
];

// ── main component ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user } = useAuthContext();

  return (
    <Box dir="rtl">
      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <Box
        component="header"
        sx={{
          minHeight: { xs: "90vh", md: "82vh" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          px: { xs: 3, md: 6 },
          py: { xs: 8, md: 10 },
          background: "linear-gradient(180deg, rgba(22,30,19,0.96) 0%, rgba(36,48,29,0.94) 100%)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url('https://images.unsplash.com/photo-1588449797803-2da1c3d5d790?auto=format&fit=crop&w=1600&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.1,
            pointerEvents: "none",
          },
        }}
      >
        {/* glow orb */}
        <Box
          sx={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,169,74,0.12) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Stack gap={{ xs: 4, md: 5 }} alignItems="center">

            {/* badge */}
            <motion.div variants={delayedVariant(riseWithFade, 100)} initial="initial" animate="animate">
              <Chip
                label="מערכת שמירה דיגיטלית לכיתות כוננות"
                size="small"
                sx={{
                  bgcolor: "rgba(200,169,74,0.15)",
                  color: GOLD_LIGHT,
                  border: `1px solid rgba(200,169,74,0.4)`,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  letterSpacing: "0.03em",
                }}
              />
            </motion.div>

            {/* headline */}
            <Typography
              variant="h1"
              fontWeight={800}
              sx={{
                fontSize: { xs: "2.25rem", sm: "3rem", md: "4rem" },
                letterSpacing: "-1px",
                color: CREAM,
                lineHeight: 1.1,
                textWrap: "balance",
              }}
            >
              <AnimatedWords title="ניהול משמרות חכם לכיתות כוננות" />
            </Typography>

            {/* sub */}
            <Typography
              component={motion.p}
              variants={delayedVariant(riseWithFade, 700)}
              initial="initial"
              animate="animate"
              sx={{
                fontSize: { xs: "1.1rem", md: "1.25rem" },
                color: CREAM_MID,
                lineHeight: 1.75,
                maxWidth: "600px",
                textWrap: "balance",
              }}
            >
              הפסיקו לרדוף אחרי מתנדבים בוואטסאפ. המערכת שלנו משבצת אוטומטית, מנהלת אילוצים, ומעדכנת את כולם בזמן אמת בעזרת עוזר AI חכם.
            </Typography>

            {/* core feature pills */}
            <motion.div variants={delayedVariant(riseWithFade, 900)} initial="initial" animate="animate">
              <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center">
                {CORE_FEATURES.map(({ Icon, label }) => (
                  <Stack
                    key={label}
                    direction="row"
                    alignItems="center"
                    gap={0.5}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "999px",
                      px: 1.5,
                      py: 0.5,
                    }}
                  >
                    <Icon sx={{ fontSize: 14, color: GOLD_LIGHT }} />
                    <Typography sx={{ fontSize: "0.75rem", color: CREAM_MID, fontWeight: 500 }}>
                      {label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </motion.div>

            {/* CTAs */}
            <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems="center" justifyContent="center">
              <Button
                variant="contained"
                href="#how-it-works"
                sx={{
                  borderRadius: "12px",
                  bgcolor: GOLD,
                  color: DARK,
                  fontWeight: 700,
                  fontSize: "0.9375rem",
                  px: 3.5,
                  py: 1.25,
                  "&:hover": { bgcolor: "#B89535" },
                }}
              >
                איך זה עובד?
              </Button>

              <Button
                variant="outlined"
                to={user ? ROUTES.HOME : ROUTES.REGISTER}
                component={Link}
                endIcon={<ArrowLeftIcon />}
                sx={{
                  borderRadius: "12px",
                  borderColor: GOLD,
                  color: CREAM,
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  px: 3.5,
                  py: 1.25,
                  "&:hover": {
                    borderColor: GOLD_LIGHT,
                    color: GOLD_LIGHT,
                    bgcolor: "rgba(200,169,74,0.1)",
                  },
                }}
              >
                {user ? `שלום ${user.name}, לאפליקציה` : "התחילו עכשיו בחינם"}
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* stripe */}
      <Box sx={{ height: 10, background: STRIPE }} />

      {/* ═══════════════════════ NEW FEATURES SECTION ══════════════════════ */}
      <Box
        component="section"
        sx={{
          background: DARK,
          py: { xs: 9, md: 13 },
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200,169,74,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          {/* heading */}
          <FadeUp delay={100}>
            <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
              <Chip
                label="✦ היתרונות שלנו"
                size="small"
                sx={{
                  bgcolor: "rgba(200,169,74,0.12)",
                  color: GOLD_LIGHT,
                  border: `1px solid rgba(200,169,74,0.35)`,
                  fontWeight: 600,
                  fontSize: "0.72rem",
                  mb: 2,
                }}
              />
              <Typography
                variant="h2"
                fontWeight={800}
                sx={{
                  fontSize: { xs: "1.75rem", md: "2.5rem" },
                  color: CREAM,
                  letterSpacing: "-0.5px",
                  mb: 1.5,
                }}
              >
                כל מה שצריך לניהול כיתת כוננות
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: "0.9375rem", md: "1rem" },
                  color: CREAM_MID,
                  maxWidth: 500,
                  mx: "auto",
                  lineHeight: 1.7,
                }}
              >
                ממשק אחד חכם ופשוט — למפקדים ולשומרים כאחד
              </Typography>
            </Box>
          </FadeUp>

          {/* feature cards — bento layout */}
          <Grid container spacing={{ xs: 1.5, md: 2 }}>
            {NEW_FEATURES.map(({ Icon, title, desc, isNew }, i) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={i % 4 === 0 || i % 4 === 3 ? 7 : 5}
                key={title}
              >
                <FadeUp delay={150 + i * 80}>
                  <Box
                    sx={{
                      height: "100%",
                      minHeight: { xs: "auto", md: 190 },
                      borderRadius: "18px",
                      border: "1.5px solid",
                      borderColor: GREEN_BORDER,
                      background:
                        i % 2 === 0
                          ? "rgba(30,40,24,0.85)"
                          : "rgba(46,58,36,0.80)",
                      p: { xs: "22px", md: "30px" },
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      position: "relative",
                      overflow: "hidden",
                      transition: "border-color 0.2s",
                      "&:hover": { borderColor: GOLD },
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 80,
                        height: 80,
                        background:
                          "radial-gradient(circle, rgba(200,169,74,0.1) 0%, transparent 70%)",
                        borderRadius: "0 18px 0 0",
                        pointerEvents: "none",
                      },
                    }}
                  >
                    {/* icon + badge */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: "11px",
                          bgcolor: "rgba(200,169,74,0.15)",
                          border: "1px solid rgba(200,169,74,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon sx={{ fontSize: 22, color: GOLD_LIGHT }} />
                      </Box>
                      {isNew && (
                        <Chip
                          label="חדש"
                          size="small"
                          sx={{
                            bgcolor: "rgba(200,169,74,0.18)",
                            color: GOLD,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            height: 20,
                            border: "1px solid rgba(200,169,74,0.35)",
                          }}
                        />
                      )}
                    </Stack>

                    <Box>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ color: CREAM, fontSize: "1.05rem", mb: 0.75 }}
                      >
                        {title}
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.9rem", color: "#B8B89A", lineHeight: 1.65 }}
                      >
                        {desc}
                      </Typography>
                    </Box>
                  </Box>
                </FadeUp>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* stripe */}
      <Box sx={{ height: 10, background: STRIPE2 }} />

      {/* ═══════════════════════ HOW IT WORKS ══════════════════════════════ */}
      <Box
        component="section"
        id="how-it-works"
        sx={{
          background: GREEN_MID,
          py: { xs: 9, md: 13 },
          borderTop: `2px solid ${GOLD}`,
          borderBottom: "2px solid #3F4A31",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url('https://images.unsplash.com/photo-1762247789974-2c1029cc04d7?auto=format&fit=crop&w=1600&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.07,
            pointerEvents: "none",
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <FadeUp delay={100}>
            <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
              <Typography
                sx={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: GOLD_LIGHT,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  mb: 1.5,
                }}
              >
                אז אתם בטח שואלים את עצמכם...
              </Typography>
              <Typography
                variant="h2"
                fontWeight={800}
                sx={{
                  fontSize: { xs: "1.75rem", md: "2.5rem" },
                  color: "#F8F4DD",
                  letterSpacing: "-0.5px",
                }}
              >
                איך זה עובד?
              </Typography>
            </Box>
          </FadeUp>

          {/* numbered steps */}
          <Grid container spacing={{ xs: 1.5, md: 2 }}>
            {HOW_IT_WORKS.map(({ n, text }, i) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={i === 0 || i === 3 ? 8 : 4}
                key={n}
              >
                <FadeUp delay={200 + i * 140}>
                  <Box
                    sx={{
                      height: "100%",
                      minHeight: { xs: "auto", md: i < 2 ? 180 : 150 },
                      borderRadius: "16px",
                      border: `1px solid ${GREEN_BORDER}`,
                      background:
                        i % 2 === 0
                          ? "rgba(27,34,22,0.80)"
                          : "rgba(47,59,42,0.78)",
                      p: { xs: "20px", md: "28px" },
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      transition: "border-color 0.2s",
                      "&:hover": { borderColor: GOLD },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        color: GOLD_LIGHT,
                        letterSpacing: "0.1em",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {n}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "0.9375rem", md: "1rem" },
                        color: "#F8F4DD",
                        lineHeight: 1.65,
                      }}
                    >
                      {text}
                    </Typography>
                  </Box>
                </FadeUp>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* stripe */}
      <Box sx={{ height: 10, background: STRIPE }} />

      {/* ═══════════════════════ TESTIMONIALS ══════════════════════════════ */}
      <Box
        component="section"
        sx={{
          background: DARK_MID,
          py: { xs: 9, md: 13 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <FadeUp delay={100}>
            <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
              <Typography
                variant="h2"
                fontWeight={800}
                sx={{
                  fontSize: { xs: "1.75rem", md: "2.5rem" },
                  color: CREAM,
                  letterSpacing: "-0.5px",
                }}
              >
                מה אומרים עלינו בשטח?
              </Typography>
            </Box>
          </FadeUp>

          <Grid container spacing={{ xs: 2, md: 3 }}>
            {TESTIMONIALS.map(({ quote, name, role }, i) => (
              <Grid item xs={12} md={4} key={name}>
                <FadeUp delay={150 + i * 150}>
                  <Box
                    sx={{
                      height: "100%",
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      p: { xs: "24px", md: "32px" },
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      "&:hover": {
                        background: "rgba(255,255,255,0.05)",
                        borderColor: "rgba(200,169,74,0.3)",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "1.1rem",
                        color: CREAM_MID,
                        lineHeight: 1.6,
                        fontStyle: "italic",
                        flexGrow: 1,
                      }}
                    >
                      "{quote}"
                    </Typography>
                    <Box>
                      <Typography sx={{ color: GOLD_LIGHT, fontWeight: 700, fontSize: "1rem" }}>
                        {name}
                      </Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
                        {role}
                      </Typography>
                    </Box>
                  </Box>
                </FadeUp>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* stripe */}
      <Box sx={{ height: 10, background: STRIPE2 }} />

      {/* ═══════════════════════ CTA / FINAL SECTION ═══════════════════════ */}
      <Box
        component="section"
        id="get-started"
        sx={{
          background: "linear-gradient(180deg, #D7D3B1 0%, #C8C39C 100%)",
          py: { xs: 9, md: 13 },
          borderTop: `2px solid ${GOLD}`,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url('https://images.unsplash.com/photo-1588449797803-2da1c3d5d790?auto=format&fit=crop&w=1600&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.05,
            pointerEvents: "none",
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Stack gap={{ xs: 5, md: 7 }} alignItems="center">

            {/* headline + perks */}
            <FadeUp delay={100}>
              <Stack alignItems="center" gap={3}>
                <Typography
                  variant="h2"
                  fontWeight={800}
                  sx={{
                    fontSize: { xs: "1.75rem", md: "2.5rem" },
                    color: DARK_MID,
                    letterSpacing: "-0.5px",
                    textAlign: "center",
                    textWrap: "balance",
                  }}
                >
                  הישארו מעודכנים בכל רגע
                </Typography>

                <Grid container spacing={1.5} justifyContent="center" sx={{ maxWidth: 680 }}>
                  {[
                    { emoji: "📱", text: "גישה מהנייד או המחשב — בכל מקום" },
                    { emoji: "💻", text: "שינויים מתעדכנים לכלל החיילים בזמן אמת" },
                    { emoji: "🏠", text: "עמוד הבית האישי מציג את המשמרת הבאה" },
                    { emoji: "📢", text: "הודעות מהמפקד מגיעות ישירות לחייל" },
                  ].map(({ emoji, text }) => (
                    <Grid item xs={12} sm={6} key={text}>
                      <Box
                        sx={{
                          bgcolor: "rgba(250,248,238,0.88)",
                          border: "1px solid #A8AA7A",
                          borderRadius: "14px",
                          p: { xs: "18px", md: "22px" },
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1.5,
                          height: "100%",
                        }}
                      >
                        <Typography sx={{ fontSize: "1.25rem", lineHeight: 1.4, flexShrink: 0 }}>
                          {emoji}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.9rem",
                            color: DARK_MID,
                            lineHeight: 1.6,
                          }}
                        >
                          {text}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </FadeUp>

            {/* CTA button + terms */}
            <FadeUp delay={200}>
              <Stack alignItems="center" gap={2.5}>
                <Button
                  variant="contained"
                  to={user ? ROUTES.HOME : ROUTES.REGISTER}
                  component={Link}
                  endIcon={<ArrowLeftIcon />}
                  sx={{
                    borderRadius: "14px",
                    bgcolor: GOLD,
                    color: DARK,
                    fontWeight: 700,
                    fontSize: "1.0625rem",
                    px: 5,
                    py: 1.5,
                    boxShadow: `0 4px 20px rgba(200,169,74,0.35)`,
                    "&:hover": { bgcolor: "#B89535", boxShadow: `0 6px 28px rgba(200,169,74,0.45)` },
                  }}
                >
                  {user ? `כניסה לאפליקציה` : "הצטרפו עכשיו בחינם"}
                </Button>

                <Typography
                  sx={{
                    fontSize: "0.8125rem",
                    color: "#4B5A3E",
                    textAlign: "center",
                    px: 3,
                    textWrap: "balance",
                  }}
                >
                  השימוש במערכת הינו בהתאם ל
                  <MuiLink
                    component={Link}
                    to={ROUTES.TERMS}
                    underline="always"
                    sx={{
                      textUnderlineOffset: "3px",
                      color: "#4B5A3E",
                      fontWeight: 600,
                      mx: 0.5,
                      "&:hover": { color: DARK_MID },
                    }}
                  >
                    תנאי השימוש
                  </MuiLink>
                  שלנו.
                </Typography>
              </Stack>
            </FadeUp>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
