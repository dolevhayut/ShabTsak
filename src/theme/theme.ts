import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';
import createCache from '@emotion/cache';

export const cacheRtl = createCache({
    key: 'muirtl',
    stylisPlugins: [prefixer, rtlPlugin],
});

const typography = {
    fontFamily: "'Noto Sans Hebrew', system-ui, -apple-system, sans-serif",
    h1: {
        fontSize: '1.625rem',
        fontWeight: 700,
        letterSpacing: '-0.3px',
        lineHeight: 1.2,
        '@media (min-width:900px)': { fontSize: '2.25rem' },
    },
    h2: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.3,
        '@media (min-width:900px)': { fontSize: '1.75rem' },
    },
    h3: {
        fontSize: '1.0625rem',
        fontWeight: 600,
        lineHeight: 1.35,
        '@media (min-width:900px)': { fontSize: '1.375rem' },
    },
    h4: { fontSize: '0.9375rem', fontWeight: 600 },
    h5: { fontSize: '0.875rem',  fontWeight: 500 },
    h6: { fontSize: '0.8125rem', fontWeight: 500 },
    body1: {
        fontSize: '0.9375rem',
        lineHeight: 1.6,
        '@media (min-width:900px)': { fontSize: '1rem' },
    },
    body2: { fontSize: '0.8125rem', lineHeight: 1.55 },
    caption: { fontSize: '0.75rem', lineHeight: 1.4 },
    button: { fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '0.01em' },
};

const shadows = [
    'none',
    '0 1px 2px rgba(0,0,0,0.06)',
    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    '0 2px 4px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
    '0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
    '0 8px 16px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
    '0 12px 24px rgba(0,0,0,0.08), 0 6px 12px rgba(0,0,0,0.04)',
    '0 16px 32px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.04)',
    '0 20px 40px rgba(0,0,0,0.08), 0 10px 20px rgba(0,0,0,0.04)',
    '0 24px 48px rgba(0,0,0,0.10)',
    '0 28px 56px rgba(0,0,0,0.10)',
    '0 32px 64px rgba(0,0,0,0.10)',
    '0 36px 72px rgba(0,0,0,0.10)',
    '0 40px 80px rgba(0,0,0,0.10)',
    '0 44px 88px rgba(0,0,0,0.10)',
    '0 48px 96px rgba(0,0,0,0.12)',
    '0 52px 104px rgba(0,0,0,0.12)',
    '0 56px 112px rgba(0,0,0,0.12)',
    '0 60px 120px rgba(0,0,0,0.12)',
    '0 64px 128px rgba(0,0,0,0.12)',
    '0 68px 136px rgba(0,0,0,0.12)',
    '0 72px 144px rgba(0,0,0,0.14)',
    '0 76px 152px rgba(0,0,0,0.14)',
    '0 80px 160px rgba(0,0,0,0.14)',
    '0 84px 168px rgba(0,0,0,0.14)',
] as any;

export function createAppTheme(mode: 'light' | 'dark') {
    const isDark = mode === 'dark';

    return responsiveFontSizes(createTheme({
        direction: 'rtl',
        typography,
        palette: {
            mode,
            primary: {
                main: '#4B6B2A',
                dark: '#3A5220',
                light: '#6B8F4B',
                contrastText: '#FFFFFF',
            },
            secondary: {
                main: '#7C3AED',
                dark: '#5B21B6',
                light: '#A78BFA',
                contrastText: '#FFFFFF',
            },
            error:   { main: '#DC2626', light: isDark ? '#3B1212' : '#FEF2F2', contrastText: '#fff' },
            warning: { main: '#D97706', light: isDark ? '#3B2A0E' : '#FFFBEB', contrastText: '#fff' },
            success: { main: '#16A34A', light: isDark ? '#0D3020' : '#F0FDF4', contrastText: '#fff' },
            background: {
                default: isDark ? '#0F1117' : '#F8F9FB',
                paper:   isDark ? '#1A1F2B' : '#FFFFFF',
            },
            text: {
                primary:   isDark ? '#F0F0F2' : '#111827',
                secondary: isDark ? '#A1A1AA' : '#4B5563',
                disabled:  isDark ? '#52525B' : '#9CA3AF',
            },
            divider: isDark ? '#2D3142' : '#E5E7EB',
            grey: {
                50:  isDark ? '#18181B' : '#F9FAFB',
                100: isDark ? '#27272A' : '#F3F4F6',
                200: isDark ? '#3F3F46' : '#E5E7EB',
                300: isDark ? '#52525B' : '#D1D5DB',
                400: isDark ? '#71717A' : '#9CA3AF',
                500: '#6B7280',
                600: isDark ? '#A1A1AA' : '#4B5563',
                700: isDark ? '#D4D4D8' : '#374151',
                800: isDark ? '#E4E4E7' : '#1F2937',
                900: isDark ? '#F4F4F5' : '#111827',
            },
        },
        shape: { borderRadius: 8 },
        shadows,
        components: {
            MuiButton: {
                defaultProps: { disableElevation: true },
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                        minHeight: 40,
                        boxShadow: 'none',
                        transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                        '&:hover': { boxShadow: 'none' },
                    },
                    sizeSmall: {
                        fontSize: '0.8125rem',
                        minHeight: 32,
                        padding: '4px 12px',
                        borderRadius: 6,
                    },
                    sizeMedium: { padding: '8px 18px' },
                    sizeLarge: {
                        padding: '12px 24px',
                        minHeight: 48,
                        fontSize: '1rem',
                    },
                    containedPrimary: {
                        '&:hover': { backgroundColor: '#3A5220' },
                    },
                    outlinedPrimary: {
                        borderColor: '#A8C47A',
                        '&:hover': { borderColor: '#4B6B2A', backgroundColor: 'rgba(75,107,42,0.08)' },
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: { borderRadius: 8, transition: 'background-color 0.15s ease' },
                    sizeSmall: { borderRadius: 6 },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        borderRadius: 10,
                        boxShadow: 'none',
                        backgroundImage: 'none', // מונע gradient אוטומטי ב-dark mode של MUI
                    },
                    elevation1: {
                        boxShadow: isDark
                            ? '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)'
                            : '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                    },
                    elevation3: {
                        boxShadow: isDark
                            ? '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)'
                            : '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: 10,
                        border: `1px solid ${isDark ? '#2D3142' : '#E5E7EB'}`,
                        boxShadow: 'none',
                        backgroundImage: 'none',
                    },
                },
            },
            MuiTableContainer: {
                styleOverrides: {
                    root: { backgroundImage: 'none' },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: {
                        borderBottomColor: isDark ? '#2D3142' : '#E5E7EB',
                    },
                    head: {
                        backgroundColor: isDark ? '#1E2535' : 'rgba(0,0,0,0.02)',
                        color: isDark ? '#D4D4D8' : '#374151',
                    },
                },
            },
            MuiTableRow: {
                styleOverrides: {
                    root: {
                        '&:hover': {
                            backgroundColor: isDark
                                ? 'rgba(75,107,42,0.08)'
                                : 'rgba(75,107,42,0.03)',
                        },
                    },
                },
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 8,
                            '& fieldset': {
                                borderColor: isDark ? '#3F3F46' : '#E5E7EB',
                                transition: 'border-color 0.15s ease',
                            },
                            '&:hover fieldset': {
                                borderColor: isDark ? '#6B8F4B' : '#9CA3AF',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: '#4B6B2A',
                                borderWidth: '1.5px',
                            },
                        },
                    },
                },
            },
            MuiInputBase: {
                styleOverrides: {
                    root: { fontSize: '0.9375rem', minHeight: 44 },
                    input: { fontSize: '0.9375rem' },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: { borderRadius: 6, fontSize: '0.75rem', fontWeight: 500 },
                    sizeSmall: { height: 22, borderRadius: 5 },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        boxShadow: `0 1px 0 ${isDark ? '#2D3142' : '#E5E7EB'}`,
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        backgroundColor: isDark
                            ? 'rgba(15,17,23,0.85)'
                            : 'rgba(255,255,255,0.85)',
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: 12,
                        backgroundImage: 'none',
                        boxShadow: isDark
                            ? '0 20px 60px rgba(0,0,0,0.6)'
                            : '0 20px 60px rgba(0,0,0,0.15)',
                    },
                },
            },
            MuiMenu: {
                styleOverrides: {
                    paper: { backgroundImage: 'none' },
                },
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: { borderRadius: 6, fontSize: '0.75rem', fontWeight: 500 },
                },
            },
            MuiDivider: {
                styleOverrides: {
                    root: { borderColor: isDark ? '#2D3142' : '#E5E7EB' },
                },
            },
            MuiLink: {
                defaultProps: { underline: 'hover' },
            },
        },
    }));
}

// ברירת מחדל — light (לשימוש בקומפוננטים שלא עוברים דרך Layout)
export const theme = createAppTheme('light');
