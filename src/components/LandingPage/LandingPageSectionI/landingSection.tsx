import { Box, Container, Grid, Typography } from "@mui/material";
import { motion, useInView, useAnimation } from "framer-motion";
import { delayedVariant, riseWithFade } from "@/utils/motionVariants";
import { LandingSectionProps } from "components/LandingPage/landingPageContent";
import { useEffect, useRef } from "react";

const LandingSection = ({
    preface,
    title,
    content,
    contentTwo
}: LandingSectionProps) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const inView = useInView(ref, { once: true, amount: 0.3 });
    const controls = useAnimation();

    useEffect(() => {
        if (inView) {
            controls.start("animate");
        }
    }, [controls, inView]);

    const allSteps = [...content, ...contentTwo];

    return (
        <Box
            component="section"
            id="how-does-it-work"
            sx={{
                background: "#5A6848",
                borderTop: "2px solid #C8A94A",
                borderBottom: "2px solid #3F4A31",
                py: { xs: 8, md: 12 },
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
                    opacity: 0.08,
                    pointerEvents: "none",
                },
            }}
        >
            <Container maxWidth="lg" ref={ref} sx={{ position: "relative", zIndex: 1 }}>
                {/* Section heading */}
                <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
                    <Typography
                        component={motion.p}
                        variants={delayedVariant(riseWithFade, 200)}
                        initial="initial"
                        animate={controls}
                        sx={{
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            color: "#F1D36E",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            mb: 1.5,
                        }}
                    >
                        {preface}
                    </Typography>
                    <Typography
                        variant="h2"
                        fontWeight={700}
                        component={motion.h2}
                        variants={delayedVariant(riseWithFade, 400)}
                        initial="initial"
                        animate={controls}
                        sx={{
                            fontSize: { xs: "1.75rem", md: "2.25rem" },
                            color: "#F8F4DD",
                            letterSpacing: "-0.3px",
                        }}
                    >
                        {title}
                    </Typography>
                </Box>

                {/* Bento grid of steps */}
                <Grid container spacing={{ xs: 1.5, md: 2 }}>
                    {allSteps.map((paragraph, index) => (
                        <Grid
                            item
                            xs={12}
                            sm={6}
                            md={index === 0 ? 8 : index === 1 ? 4 : index === 2 ? 4 : index === 3 ? 8 : 6}
                            key={index}
                        >
                            <Box
                                component={motion.div}
                                variants={delayedVariant(riseWithFade, 300 + index * 150)}
                                initial="initial"
                                animate={controls}
                                sx={{
                                    background: index % 2 === 0 ? "rgba(27,34,22,0.78)" : "rgba(47,59,42,0.75)",
                                    border: "1px solid rgba(200,169,74,0.45)",
                                    borderRadius: "16px",
                                    p: { xs: "20px", md: "28px" },
                                    height: "100%",
                                    minHeight: { xs: "auto", md: index < 2 ? "180px" : "140px" },
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        color: "#F1D36E",
                                        letterSpacing: "0.08em",
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {String(index + 1).padStart(2, "0")}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: { xs: "0.9375rem", md: "1rem" },
                                        color: "#F8F4DD",
                                        lineHeight: 1.65,
                                    }}
                                >
                                    {paragraph}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
};

export default LandingSection;
