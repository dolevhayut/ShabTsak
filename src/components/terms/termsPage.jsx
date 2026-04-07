import { Typography, Box, Container } from "@mui/material";
import BackLink from "../general_comps/BackLink.jsx";

export default function TermsPage() {
    return (
        <Container sx={{ mt: 1 }} disableGutters maxWidth={false}>
            <Box as="header" sx={{ mx: { sm: 2 } }}>
                <BackLink place="start" >חזרה לעמוד הקודם</BackLink>
                <Typography variant="h2" align="center" sx={{ mt: { sm: -4.5 } }}>תנאי שימוש</Typography>
            </Box>
            <Box as="article" sx={{ mx: { sm: 4, xs: 3 }, mt: { sm: 4, xs: 3 } }}>
                <Box component="section" sx={{ mb: 2 }}>
                    <Typography variant="body1" gutterBottom>
                        האתר מעניק את השירות בחינם. השימוש באתר הוא באחריות החייל, ולא תהיה לחיילים כל תביעה כנגד האתר או מפעיליו.
                        כל המידע המועלה לאתר הוא באחריות החייל, ולכן יש להשתמש בשמות בסיסים ועמדות שאינם חושפים מידע מסווג.
                        למען הסר ספק, מפעילי האתר אינם מתחייבים לכל רמת שירות שהיא, והשימוש באתר הוא באחריות החייל בלבד.
                    </Typography>
                </Box>
            </Box>
        </Container>
    )
}