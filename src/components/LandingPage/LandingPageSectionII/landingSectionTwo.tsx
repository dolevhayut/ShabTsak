import { Box, Button, Container, Grid, Link as MuiLink, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import ROUTES from "@/constants/routeConstants";
import { LandingSectionTwoProps } from "components/LandingPage/landingPageContent";
import { ArrowLeft } from "@mui/icons-material";

const featureIcons = ["📱", "💻"];

const LandingSectionTwo = ({
    title,
    content,
    agreement,
    agreementLink,
    agreementLinkTo
}: LandingSectionTwoProps) => {
    const agreementLinkElement = () => (
        <MuiLink
            underline="always"
            sx={{
                textUnderlineOffset: "3px",
                color: "#A8AA7A",
                fontWeight: 500,
                "&:hover": { color: "#D7D3B1" },
            }}
            component={Link}
            to={agreementLinkTo}
        >
            {agreementLink}
        </MuiLink>
    );
    const [agreementText1, agreementText2] = agreement.split("$1");

    return (
        <Box
            component="section"
            id="tell-me-more"
            sx={{
                background: "linear-gradient(180deg, #D7D3B1 0%, #C8C39C 100%)",
                py: { xs: 8, md: 12 },
                borderTop: "2px solid #C8A94A",
                borderBottom: "2px solid #8A8F63",
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
                    opacity: 0.06,
                    pointerEvents: "none",
                },
            }}
        >
            <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
                <Stack gap={{ xs: 6, md: 8 }} alignItems="center">
                    {/* Heading */}
                    <Box sx={{ textAlign: "center" }}>
                        <Typography
                            variant="h2"
                            fontWeight={700}
                            sx={{
                                fontSize: { xs: "1.75rem", md: "2.25rem" },
                                color: "#2F3B2A",
                                letterSpacing: "-0.3px",
                                mb: 2,
                            }}
                        >
                            {title}
                        </Typography>
                    </Box>

                    {/* Feature bento cards */}
                    <Grid container spacing={{ xs: 1.5, md: 2 }} justifyContent="center" sx={{ maxWidth: "700px", mx: "auto", width: "100%" }}>
                        {content.map((paragraph, index) => (
                            <Grid item xs={12} sm={6} key={index}>
                                <Box
                                    sx={{
                                        background: "rgba(250,248,238,0.88)",
                                        border: "1px solid #A8AA7A",
                                        borderRadius: "16px",
                                        p: { xs: "20px", md: "28px" },
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 2,
                                        height: "100%",
                                    }}
                                >
                                    <Typography sx={{ fontSize: "1.5rem" }}>
                                        {featureIcons[index] || "✦"}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: { xs: "0.9375rem", md: "1rem" },
                                            color: "#2F3B2A",
                                            lineHeight: 1.65,
                                        }}
                                    >
                                        {paragraph}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>

                    {/* CTA + terms */}
                    <Stack alignItems="center" gap={2.5}>
                        <Button
                            variant="contained"
                            to={ROUTES.LOGIN}
                            component={Link}
                            endIcon={<ArrowLeft />}
                            sx={{
                                borderRadius: "12px",
                                backgroundColor: "#C8A94A",
                                color: "#1B2016",
                                fontWeight: 600,
                                fontSize: "1rem",
                                px: 4,
                                py: 1.5,
                                "&:hover": { backgroundColor: "#B89535", color: "#11130F" },
                            }}
                        >
                            נשמע טוב, בואו נתחיל!
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
                            {agreementText1}{agreementLinkElement()}{agreementText2}
                        </Typography>
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
};

export default LandingSectionTwo;
