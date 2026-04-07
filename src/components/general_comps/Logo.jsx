/* eslint-disable react/no-unescaped-entities */
import imgSoldier from '/images/soldier.png';
import { Typography, Link, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ROUTES from "@/constants/routeConstants.js";

export default function Logo({ darkMode, compact = false }) {
  const textColor = darkMode ? "#F5F5F7" : "#1D1D1F";

  return (
    <Link
      component={RouterLink}
      to={ROUTES.HOME}
      title="חזור לדף הבית"
      underline="none"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 0.5 : 1,
        "&:hover": { opacity: 0.8 },
        transition: "opacity 0.15s ease",
      }}
    >
      <Box
        component="img"
        src={imgSoldier}
        alt="imgSoldier"
        sx={{ width: compact ? 24 : 30, height: "auto" }}
      />
      <Typography
        variant="h1"
        sx={{
          fontSize: compact ? "1.05rem !important" : "1.25rem !important",
          fontWeight: 700,
          color: textColor,
          letterSpacing: "-0.3px",
          lineHeight: 1,
          py: 0,
        }}
      >
        שבצ׳׳קון
      </Typography>
    </Link>
  );
}
