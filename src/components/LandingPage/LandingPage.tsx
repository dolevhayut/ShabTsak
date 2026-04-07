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
  Avatar,
} from "@mui/material";
import { motion, useAnimation, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
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
const DARK = "#0A0D08"; // Darker, more modern black/green
const DARK_MID = "#161C12"; // Sleek dark grey/green
const GREEN_BORDER = "rgba(200,169,74,0.15)";
const STRIPE =
  "repeating-linear-gradient(90deg, rgba(200,169,74,0.1) 0 18px, rgba(107,122,82,0.1) 18px 36px, rgba(75,90,62,0.1) 36px 54px)";

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
    initials: "רכ",
  },
  {
    quote: "סוף סוף אפליקציה שמבינה את הצרכים של כיתת כוננות. השיבוץ האוטומטי פשוט גאוני.",
    name: "יעל לוי",
    role: "סגנית רבש״צ, יישוב בצפון",
    initials: "יל",
  },
  {
    quote: "החיילים מתים על זה. הם רואים הכל בנייד, מגישים בקשות בקלות, ומקבלים הודעות בזמן אמת.",
    name: "עומר יצחקי",
    role: "מפקד כיתת כוננות, עוטף עזה",
    initials: "עי",
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
    <Box dir="rtl" sx={{ bgcolor: DARK, color: CREAM, overflowX: "hidden" }}>
      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <Box
        component="header"
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          px: { xs: 3, md: 6 },
          py: { xs: 8, md: 10 },
          background: DARK,
          backgroundImage: `
            radial-gradient(circle at 50% 0%, rgba(200,169,74,0.15) 0%, transparent 60%),
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 40px 40px, 40px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Stack gap={{ xs: 4, md: 6 }} alignItems="center">
            {/* badge */}
            <motion.div variants={delayedVariant(riseWithFade, 100)} initial="initial" animate="animate">
              <Chip
                label="מערכת שמירה דיגיטלית לכיתות כוננות"
                size="small"
                sx={{
                  bgcolor: "rgba(200,169,74,0.1)",
                  backdropFilter: "blur(10px)",
                  color: GOLD_LIGHT,
                  border: `1px solid rgba(200,169,74,0.3)`,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  letterSpacing: "0.03em",
                  px: 1,
                  py: 2,
                  boxShadow: "0 0 20px rgba(200,169,74,0.1)",
                }}
              />
            </motion.div>

            {/* headline */}
            <Typography
              variant="h1"
              fontWeight={900}
              sx={{
                fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.5rem" },
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
                textWrap: "balance",
                background: `linear-gradient(to right, ${CREAM}, ${GOLD})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
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
                color: "#A1A1AA",
                lineHeight: 1.75,
                maxWidth: "600px",
                textWrap: "balance",
              }}
            >
              הפסיקו לרדוף אחרי מתנדבים בוואטסאפ. המערכת שלנו משבצת אוטומטית, מנהלת אילוצים, ומעדכנת את כולם בזמן אמת בעזרת עוזר AI חכם.
            </Typography>

            {/* core feature pills */}
            <motion.div variants={delayedVariant(riseWithFade, 900)} initial="initial" animate="animate">
              <Stack direction="row" gap={1.5} flexWrap="wrap" justifyContent="center">
                {CORE_FEATURES.map(({ Icon, label }) => (
                  <Stack
                    key={label}
                    direction="row"
                    alignItems="center"
                    gap={0.75}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.03)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "999px",
                      px: 2,
                      py: 0.75,
                      transition: "all 0.2s",
                      "&:hover": {
                        bgcolor: "rgba(255,255,255,0.06)",
                        borderColor: "rgba(200,169,74,0.3)",
                      },
                    }}
                  >
                    <Icon sx={{ fontSize: 16, color: GOLD_LIGHT }} />
                    <Typography sx={{ fontSize: "0.8rem", color: CREAM_MID, fontWeight: 500 }}>
                      {label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </motion.div>

            {/* CTAs */}
            <Stack direction={{ xs: "column", sm: "row" }} gap={2.5} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
              <Button
                variant="contained"
                href="#how-it-works"
                sx={{
                  borderRadius: "999px",
                  bgcolor: GOLD,
                  color: DARK,
                  fontWeight: 800,
                  fontSize: "1rem",
                  px: 4,
                  py: 1.5,
                  boxShadow: "0 0 24px rgba(200,169,74,0.4)",
                  "&:hover": { bgcolor: "#B89535", boxShadow: "0 0 32px rgba(200,169,74,0.6)" },
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
                  borderRadius: "999px",
                  borderColor: "rgba(255,255,255,0.2)",
                  color: CREAM,
                  fontWeight: 600,
                  fontSize: "1rem",
                  px: 4,
                  py: 1.5,
                  backdropFilter: "blur(10px)",
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
      <Box sx={{ height: 2, background: STRIPE }} />

      {/* ═══════════════════════ NEW FEATURES SECTION ══════════════════════ */}
      <Box
        component="section"
        sx={{
          background: DARK_MID,
          py: { xs: 10, md: 16 },
          position: "relative",
        }}
      >
        <Container maxWidth="lg">
          {/* heading */}
          <FadeUp delay={100}>
            <Box sx={{ textAlign: "center", mb: { xs: 8, md: 10 } }}>
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: GOLD_LIGHT,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  mb: 2,
                }}
              >
                היתרונות שלנו
              </Typography>
              <Typography
                variant="h2"
                fontWeight={800}
                sx={{
                  fontSize: { xs: "2rem", md: "3rem" },
                  color: CREAM,
                  letterSpacing: "-1px",
                  mb: 2,
                }}
              >
                כל מה שצריך לניהול כיתת כוננות
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: "1rem", md: "1.15rem" },
                  color: "#A1A1AA",
                  maxWidth: 600,
                  mx: "auto",
                  lineHeight: 1.7,
                }}
              >
                ממשק אחד חכם ופשוט — למפקדים ולשומרים כאחד. בלי אקסלים, בלי הודעות שהולכות לאיבוד.
              </Typography>
            </Box>
          </FadeUp>

          {/* feature cards — bento layout */}
          <Grid container spacing={{ xs: 2, md: 3 }}>
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
                      minHeight: { xs: "auto", md: 220 },
                      borderRadius: "24px",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                      background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                      backdropFilter: "blur(20px)",
                      p: { xs: "28px", md: "36px" },
                      display: "flex",
                      flexDirection: "column",
                      gap: 2.5,
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        borderColor: "rgba(200,169,74,0.3)",
                        transform: "translateY(-4px)",
                        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                        "& .feature-icon": {
                          color: GOLD_LIGHT,
                          transform: "scale(1.1)",
                        }
                      },
                    }}
                  >
                    {/* icon + badge */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box
                        className="feature-icon"
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "14px",
                          bgcolor: "rgba(200,169,74,0.1)",
                          border: "1px solid rgba(200,169,74,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.3s ease",
                          color: GOLD,
                        }}
                      >
                        <Icon sx={{ fontSize: 24 }} />
                      </Box>
                      {isNew && (
                        <Chip
                          label="חדש"
                          size="small"
                          sx={{
                            bgcolor: "rgba(200,169,74,0.15)",
                            color: GOLD_LIGHT,
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            height: 24,
                            border: "1px solid rgba(200,169,74,0.3)",
                          }}
                        />
                      )}
                    </Stack>

                    <Box sx={{ mt: "auto" }}>
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ color: CREAM, fontSize: "1.2rem", mb: 1, letterSpacing: "-0.5px" }}
                      >
                        {title}
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.95rem", color: "#A1A1AA", lineHeight: 1.6 }}
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
      <Box sx={{ height: 2, background: STRIPE }} />

      {/* ═══════════════════════ HOW IT WORKS ══════════════════════════════ */}
      <Box
        component="section"
        id="how-it-works"
        sx={{
          background: DARK,
          py: { xs: 10, md: 16 },
          position: "relative",
        }}
      >
        <Container maxWidth="lg">
          <FadeUp delay={100}>
            <Box sx={{ textAlign: "center", mb: { xs: 8, md: 10 } }}>
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: GOLD_LIGHT,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  mb: 2,
                }}
              >
                תהליך העבודה
              </Typography>
              <Typography
                variant="h2"
                fontWeight={800}
                sx={{
                  fontSize: { xs: "2rem", md: "3rem" },
                  color: CREAM,
                  letterSpacing: "-1px",
                }}
              >
                איך זה עובד?
              </Typography>
            </Box>
          </FadeUp>

          {/* numbered steps */}
          <Grid container spacing={{ xs: 2, md: 3 }}>
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
                      minHeight: { xs: "auto", md: 180 },
                      borderRadius: "24px",
                      border: "1px solid rgba(255,255,255,0.05)",
                      background: "rgba(255,255,255,0.02)",
                      p: { xs: "28px", md: "36px" },
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        borderColor: "rgba(200,169,74,0.3)",
                        background: "rgba(255,255,255,0.04)",
                      },
                    }}
                  >
                    {/* Watermark Number */}
                    <Typography
                      sx={{
                        position: "absolute",
                        top: -20,
                        right: -10,
                        fontSize: "8rem",
                        fontWeight: 900,
                        color: "rgba(255,255,255,0.03)",
                        lineHeight: 1,
                        pointerEvents: "none",
                        fontFamily: "monospace",
                      }}
                    >
                      {n}
                    </Typography>
                    
                    <Typography
                      sx={{
                        fontSize: { xs: "1.05rem", md: "1.15rem" },
                        color: CREAM,
                        lineHeight: 1.6,
                        fontWeight: 500,
                        position: "relative",
                        zIndex: 1,
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
      <Box sx={{ height: 2, background: STRIPE }} />

      {/* ═══════════════════════ TESTIMONIALS ══════════════════════════════ */}
      <Box
        component="section"
        sx={{
          background: DARK_MID,
          py: { xs: 10, md: 16 },
          position: "relative",
        }}
      >
        <Container maxWidth="lg">
          <FadeUp delay={100}>
            <Box sx={{ textAlign: "center", mb: { xs: 8, md: 10 } }}>
              <Typography
                variant="h2"
                fontWeight={800}
                sx={{
                  fontSize: { xs: "2rem", md: "3rem" },
                  color: CREAM,
                  letterSpacing: "-1px",
                }}
              >
                מה אומרים עלינו בשטח?
              </Typography>
            </Box>
          </FadeUp>

          <Grid container spacing={{ xs: 3, md: 4 }}>
            {TESTIMONIALS.map(({ quote, name, role, initials }, i) => (
              <Grid item xs={12} md={4} key={name}>
                <FadeUp delay={150 + i * 150}>
                  <Box
                    sx={{
                      height: "100%",
                      borderRadius: "24px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      p: { xs: "32px", md: "40px" },
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      position: "relative",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        background: "rgba(255,255,255,0.04)",
                        borderColor: "rgba(200,169,74,0.2)",
                        transform: "translateY(-4px)",
                      },
                    }}
                  >
                    <FormatQuoteIcon sx={{ color: "rgba(200,169,74,0.2)", fontSize: 48, position: "absolute", top: 24, right: 24 }} />
                    <Typography
                      sx={{
                        fontSize: "1.15rem",
                        color: "#D4D4D8",
                        lineHeight: 1.7,
                        flexGrow: 1,
                        position: "relative",
                        zIndex: 1,
                        mt: 2,
                      }}
                    >
                      "{quote}"
                    </Typography>
                    <Stack direction="row" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: "rgba(200,169,74,0.15)", color: GOLD, fontWeight: 700 }}>
                        {initials}
                      </Avatar>
                      <Box>
                        <Typography sx={{ color: CREAM, fontWeight: 700, fontSize: "1.05rem" }}>
                          {name}
                        </Typography>
                        <Typography sx={{ color: "#A1A1AA", fontSize: "0.9rem" }}>
                          {role}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </FadeUp>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* stripe */}
      <Box sx={{ height: 2, background: STRIPE }} />

      {/* ═══════════════════════ CTA / FINAL SECTION ═══════════════════════ */}
      <Box
        component="section"
        sx={{
          background: DARK,
          py: { xs: 12, md: 20 },
          position: "relative",
          textAlign: "center",
        }}
      >
        <Container maxWidth="md">
          <FadeUp delay={100}>
            <Typography
              variant="h2"
              fontWeight={900}
              sx={{
                fontSize: { xs: "2.5rem", md: "4rem" },
                color: CREAM,
                letterSpacing: "-1px",
                mb: 4,
              }}
            >
              מוכנים לעשות סדר בשיבוצים?
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "1.1rem", md: "1.25rem" },
                color: "#A1A1AA",
                mb: 6,
                maxWidth: 500,
                mx: "auto",
              }}
            >
              הצטרפו לעשרות כיתות כוננות שכבר נהנות מניהול חכם, שקוף ופשוט.
            </Typography>
            
            <Stack alignItems="center" gap={3}>
              <Button
                variant="contained"
                to={user ? ROUTES.HOME : ROUTES.REGISTER}
                component={Link}
                endIcon={<ArrowLeftIcon />}
                sx={{
                  borderRadius: "999px",
                  bgcolor: GOLD,
                  color: DARK,
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  px: 6,
                  py: 2,
                  boxShadow: "0 0 30px rgba(200,169,74,0.3)",
                  "&:hover": { bgcolor: "#B89535", boxShadow: "0 0 40px rgba(200,169,74,0.5)" },
                }}
              >
                {user ? `כניסה לאפליקציה` : "התחילו עכשיו — זה בחינם"}
              </Button>

              <Typography
                sx={{
                  fontSize: "0.85rem",
                  color: "#71717A",
                }}
              >
                השימוש במערכת הינו בהתאם ל
                <MuiLink
                  component={Link}
                  to={ROUTES.TERMS}
                  underline="always"
                  sx={{
                    color: "#A1A1AA",
                    fontWeight: 600,
                    mx: 0.5,
                    "&:hover": { color: CREAM },
                  }}
                >
                  תנאי השימוש
                </MuiLink>
                שלנו.
              </Typography>
            </Stack>
          </FadeUp>
        </Container>
      </Box>
    </Box>
  );
}
