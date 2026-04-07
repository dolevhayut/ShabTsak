import { Outlet, useLocation } from 'react-router-dom';
import Header from 'components/Layout/Header/Header.jsx';
import Footer from 'components/Layout/Footer/Footer.jsx';
import React, { useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme, cacheRtl } from '@/theme/theme';
import { Box, CssBaseline } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import { useDarkModeStore } from "@/theme/useDarkModeStore.jsx";
import dayjs from "dayjs";
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import he from "dayjs/locale/he";
import ROUTES from "@/constants/routeConstants";

export default function Layout() {
    const darkMode = useDarkModeStore((store) => store.darkMode);
    const { pathname } = useLocation();
    const isFullBleedPage = pathname === ROUTES.LANDING;

    // הTheme נוצר מחדש כאשר darkMode משתנה — כל רכיב MUI מקבל mode אוטומטית
    const currentTheme = useMemo(
        () => createAppTheme(darkMode ? 'dark' : 'light'),
        [darkMode]
    );

    React.useEffect(() => {
        dayjs.extend(localeData);
        dayjs.extend(weekday);
        dayjs.locale(he);
    }, []);

    return (
        <CacheProvider value={cacheRtl}>
            <ThemeProvider theme={currentTheme}>
                <CssBaseline />
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '100vh',
                        bgcolor: 'background.default',
                        color: 'text.primary',
                        transition: 'background-color 0.2s ease, color 0.2s ease',
                    }}
                >
                    <Header />
                    <Box
                        component="main"
                        sx={{
                            flex: 1,
                            width: '100%',
                            px: isFullBleedPage ? 0 : { xs: 1.5, sm: 2, md: 3 },
                            py: isFullBleedPage ? 0 : { xs: 2, md: 3 },
                        }}
                    >
                        <Box
                            sx={{
                                width: '100%',
                                maxWidth: isFullBleedPage ? '100%' : 1200,
                                mx: 'auto',
                            }}
                        >
                            <Outlet />
                        </Box>
                    </Box>
                    <Footer />
                </Box>
            </ThemeProvider>
        </CacheProvider>
    );
}
