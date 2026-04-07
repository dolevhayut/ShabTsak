import { CircularProgress, Typography } from '@mui/material';
import { Box } from '@mui/system';

export default function LoadingComp() {
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "40vh",
                gap: 2,
            }}
        >
            <CircularProgress
                size={36}
                thickness={3}
                sx={{ color: "#4B6B2A" }}
            />
            <Typography
                sx={{
                    fontSize: "0.875rem",
                    color: "#AEAEB2",
                    fontWeight: 400,
                }}
            >
                טוען...
            </Typography>
        </Box>
    );
}
