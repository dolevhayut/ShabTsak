import { Box } from "@mui/material";
import { landingPageContent } from "./landingPageContent";
import LandingSection from "components/LandingPage/LandingPageSectionI/landingSection";
import LandingSectionTwo from "components/LandingPage/LandingPageSectionII/landingSectionTwo";
import LandingHeader from "components/LandingPage/LandingPageHeader/landingHeader";

export default function LandingPage() {
    return (
        <Box>
            <LandingHeader {...landingPageContent.header} />
            <Box
                sx={{
                    height: "10px",
                    background:
                        "repeating-linear-gradient(90deg, #C8A94A 0 18px, #6B7A52 18px 36px, #4B5A3E 36px 54px)",
                }}
            />
            <LandingSection {...landingPageContent.section} />
            <Box
                sx={{
                    height: "10px",
                    background:
                        "repeating-linear-gradient(90deg, #8A8F63 0 18px, #C8A94A 18px 36px, #5A6848 36px 54px)",
                }}
            />
            <LandingSectionTwo {...landingPageContent.sectionTwo} />
        </Box>
    );
}

