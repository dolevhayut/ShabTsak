import { Button, Stack, Typography, Box } from "@mui/material";

const WEEKDAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

/**
 * Calendly-style vertical day list: one clear tap target per row.
 */
export function WeekdayTogglePicker({ value, onChange, disabled, label }) {
  return (
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          {label}
        </Typography>
      )}
      <Stack spacing={1} role="radiogroup" aria-label="בחירת יום בשבוע">
        {WEEKDAYS_HE.map((name, i) => (
          <Button
            key={i}
            type="button"
            variant={value === i ? "contained" : "outlined"}
            color={value === i ? "primary" : "inherit"}
            onClick={() => !disabled && onChange(i)}
            disabled={disabled}
            fullWidth
            sx={{
              justifyContent: "flex-start",
              py: 1.35,
              px: 2,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              borderColor: value === i ? undefined : "divider",
            }}
          >
            {name}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}

export { WEEKDAYS_HE };
