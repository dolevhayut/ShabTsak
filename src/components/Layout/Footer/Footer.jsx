import { Box, Stack, Button, Typography, Container } from "@mui/material";
import ROUTES from "../../../constants/routeConstants.js";
import { Link as RouterLink } from 'react-router-dom';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        borderTop: "1px solid #E8E8ED",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems="center"
          gap={1}
          sx={{ py: "20px", px: 2 }}
        >
          <Box component="nav" sx={{ display: "flex", gap: 0.5 }}>
            <Button
              component={RouterLink}
              to={ROUTES.HOME}
              sx={{
                color: "#6E6E73",
                fontSize: "0.8125rem",
                fontWeight: 400,
                px: 1.5,
                py: 0.75,
                borderRadius: "8px",
                "&:hover": { color: "#4B6B2A", background: "rgba(75,107,42,0.05)" },
              }}
            >
              עמוד הבית
            </Button>
            <Button
              component={RouterLink}
              to={ROUTES.PRIVACY}
              sx={{
                color: "#6E6E73",
                fontSize: "0.8125rem",
                fontWeight: 400,
                px: 1.5,
                py: 0.75,
                borderRadius: "8px",
                "&:hover": { color: "#4B6B2A", background: "rgba(75,107,42,0.05)" },
              }}
            >
              פרטיות
            </Button>
            <Button
              component={RouterLink}
              to={ROUTES.TERMS}
              sx={{
                color: "#6E6E73",
                fontSize: "0.8125rem",
                fontWeight: 400,
                px: 1.5,
                py: 0.75,
                borderRadius: "8px",
                "&:hover": { color: "#4B6B2A", background: "rgba(75,107,42,0.05)" },
              }}
            >
              תנאי שימוש
            </Button>
          </Box>

          <Box sx={{ textAlign: { xs: "center", sm: "start" } }}>
            <Typography
              variant="body2"
              sx={{ color: "#AEAEB2", fontSize: "0.8125rem", lineHeight: 1.5 }}
            >
              © שבצ׳׳קון
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#AEAEB2", fontSize: "0.8125rem", lineHeight: 1.5 }}
            >
              נוצר על ידי בולדוג פתרונות מדיה
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
