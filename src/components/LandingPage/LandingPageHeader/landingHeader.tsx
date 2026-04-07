import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { AnimatedWords } from "components/general_comps/AnimatedWords";
import { delayedVariant, riseWithFade } from "@/utils/motionVariants";
import ROUTES from "@/constants/routeConstants";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@mui/icons-material";
import { LandingHeaderProps } from "components/LandingPage/landingPageContent";
import { useAuthContext } from "@/context/AuthContext";

const LandingHeader = ({
    title,
    cta,
    ctaButton,
    ctaLogin,
    ctaLoginSub,
    ctaLoginButton
}: LandingHeaderProps) => {
    const { user } = useAuthContext();

    return (
        <Box
            component="header"
            sx={{
                minHeight: { xs: "90vh", md: "80vh" },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                px: { xs: 3, md: 6 },
                py: { xs: 8, md: 10 },
                background:
                    "linear-gradient(180deg, rgba(26,36,24,0.92) 0%, rgba(40,56,33,0.9) 100%)",
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
                    opacity: 0.12,
                    pointerEvents: "none",
                },
            }}
        >
            <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
                <Stack gap={{ xs: 4, md: 5 }} alignItems="center">
                    {/* Hero headline */}
                    <Typography
                        variant="h1"
                        fontWeight={700}
                        sx={{
                            fontSize: { xs: "1.75rem", sm: "2.25rem", md: "2.75rem" },
                            letterSpacing: "-0.5px",
                            color: "#F0ECD2",
                            lineHeight: 1.15,
                            textWrap: "balance",
                        }}
                    >
                        <AnimatedWords title={title} />
                    </Typography>

                    {/* Subtext */}
                    <Typography
                        component={motion.p}
                        variants={delayedVariant(riseWithFade, 700)}
                        sx={{
                            fontSize: { xs: "1rem", md: "1.125rem" },
                            color: "#D7D3B1",
                            lineHeight: 1.7,
                            maxWidth: "560px",
                            textWrap: "balance",
                        }}
                    >
                        {cta}
                    </Typography>

                    {/* CTA Buttons */}
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        gap={2}
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Button
                            variant="contained"
                            href="#how-does-it-work"
                            sx={{
                                borderRadius: "12px",
                                backgroundColor: "#C8A94A",
                                color: "#1B2016",
                                fontWeight: 600,
                                fontSize: "0.9375rem",
                                px: 3,
                                py: 1.25,
                                "&:hover": { backgroundColor: "#B89535", color: "#11130F" },
                            }}
                        >
                            {ctaButton}
                        </Button>

                        <Button
                            variant="outlined"
                            to={ROUTES.LOGIN}
                            component={Link}
                            endIcon={<ArrowLeft />}
                            sx={{
                                borderRadius: "12px",
                                borderColor: "#C8A94A",
                                color: "#F0ECD2",
                                fontWeight: 600,
                                fontSize: "0.9375rem",
                                px: 3,
                                py: 1.25,
                                "&:hover": {
                                    borderColor: "#F1D36E",
                                    color: "#F1D36E",
                                    backgroundColor: "rgba(200,169,74,0.15)",
                                },
                            }}
                        >
                            {!user ? ctaLoginButton : "למעבר לאפליקציה"}
                        </Button>
                    </Stack>

                    {/* Greeting / login note */}
                    {!user ? (
                        <Typography
                            sx={{ fontSize: "0.875rem", color: "#CFC8A0" }}
                        >
                            {ctaLogin} — {ctaLoginSub}
                        </Typography>
                    ) : (
                        <Typography
                            sx={{ fontSize: "0.9375rem", color: "#E4DEB8", fontWeight: 500 }}
                        >
                            שלום {user.name}!
                        </Typography>
                    )}
                </Stack>
            </Container>
        </Box>
    );
};

export default LandingHeader;
