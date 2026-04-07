import Box from "@mui/material/Box";

export default function ThemeToggle({ darkMode, onToggle, borderColor, title = "החלף ערכת נושא" }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      title={title}
      aria-label={title}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        cursor: "pointer",
        userSelect: "none",
        height: "36px",
        px: 0.5,
        background: "none",
        border: "none",
      }}
    >
      <Box
        sx={{
          width: "48px",
          height: "26px",
          borderRadius: "999px",
          background: darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
          border: `1px solid ${borderColor}`,
          position: "relative",
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        <Box
          component="span"
          sx={{
            width: "20px",
            height: "20px",
            borderRadius: "999px",
            background: "#fff",
            position: "absolute",
            top: "2px",
            right: "3px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            transform: darkMode ? "translateX(0)" : "translateX(-22px)",
            transition: "transform 0.3s ease",
          }}
        >
          {darkMode ? "🌙" : "☀️"}
        </Box>
      </Box>
    </Box>
  );
}
