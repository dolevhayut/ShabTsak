/* eslint-disable react/no-unescaped-entities */
import { useState } from "react";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import CloseIcon from "@mui/icons-material/Close";
import ApartmentIcon from "@mui/icons-material/Apartment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import GroupsIcon from "@mui/icons-material/Groups";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import MarkEmailUnreadIcon from "@mui/icons-material/MarkEmailUnread";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "@/theme/theme";
import Logo from "components/general_comps/Logo.jsx";
import ThemeToggle from "components/general_comps/ThemeToggle.jsx";
import srcImg from "/images/man.png";
import { toast } from "@/services/notificationService";
import ROUTES from "@/constants/routeConstants.js";
import DialogLogOut from "components/general_comps/dialogs/dialogLogOut.jsx";
import { useDarkModeStore } from "@/theme/useDarkModeStore.jsx";
import { Link as RouterLink } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { useQueryClient } from "react-query";

const getNavLinks = (user) => {
  const isCommander = user?.role === "commander";

  const links = [
    { label: "שיבוץ משמרות", to: ROUTES.SCHEDULE, Icon: CalendarMonthIcon },
    { label: "המשמרות שלי", to: ROUTES.MY_SHIFTS, Icon: EventAvailableIcon },
    { label: "אנליטיקס", to: ROUTES.ANALYTICS, Icon: AnalyticsIcon },
  ];

  if (isCommander) {
    links.unshift({ label: "בסיסים", to: ROUTES.HOME, Icon: ApartmentIcon });
    links.push({ label: 'סד"כ', to: ROUTES.GUARDS, Icon: GroupsIcon });
    links.push({ label: "בקשות משמרת", to: ROUTES.SHIFT_REQUESTS, Icon: MarkEmailUnreadIcon });
    links.push({ label: "הודעות מערכת", to: ROUTES.SYSTEM_MESSAGES, Icon: CampaignOutlinedIcon });
    links.push({ label: "עוזר מפקד AI", to: ROUTES.COMMANDER_AI, Icon: SmartToyIcon });
    links.push({ label: "הרשמה פנימית", to: ROUTES.COMMANDER_ONBOARDING, Icon: AppRegistrationIcon });
  }

  return links;
};

const getRoleLabel = (role) => {
  if (role === "commander") return "מפקד";
  return "חייל";
};

const Header = () => {
  const { user, logout } = useAuthContext();
  const navLinks = getNavLinks(user);
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [displayBurger, setDisplayBurger] = useState("block");
  const [displayButtonX, setDisplayButtonX] = useState("none");
  const queryClient = useQueryClient();
  const [openSureDialog, setOpenSureDialog] = useState(false);
  const { darkMode, toggleDarkMode } = useDarkModeStore();

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
    setDisplayBurger("none");
    setDisplayButtonX("block");
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
    setDisplayBurger("block");
    setDisplayButtonX("none");
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const ClickLogOut = () => {
    handleCloseUserMenu();
    setOpenSureDialog(true);
  };

  const OnLogOut = () => {
    logout();
    toast.success("התנתקת בהצלחה!");
    setOpenSureDialog(false);
    queryClient.removeQueries();
  };

  const ClickGoodLuck = () => {
    handleCloseUserMenu();
    toast.success("זכור! אלוקים איתך! יחד נלחם וננצח!");
  };

  const appBarBg = darkMode
    ? "rgba(0,0,0,0.85)"
    : "rgba(255,255,255,0.85)";

  const borderColor = darkMode ? "#38383A" : "#E8E8ED";
  const textColor = darkMode ? "#F5F5F7" : "#1D1D1F";
  const accentColor = darkMode ? "#6B8F4B" : "#4B6B2A";

  return (
    <ThemeProvider theme={theme}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: appBarBg,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${borderColor}`,
          boxShadow: "none",
          top: 0,
          zIndex: 1100,
        }}
      >
        <Container maxWidth="lg">
          {/* Mobile header: profile left, logo center, hamburger right */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              alignItems: "center",
              direction: "ltr",
              height: "56px",
              gap: 0.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, flex: 1, justifyContent: "flex-start" }}>
              <Tooltip title={user?.name ? `שלום ${user.name}` : "שלום, אנא התחבר"}>
                <IconButton onClick={user ? handleOpenUserMenu : undefined} sx={{ p: 0.5 }}>
                  <Avatar
                    alt="Avatar"
                    src={user?.picture || srcImg}
                    referrerPolicy="no-referrer"
                    imgProps={{ referrerPolicy: "no-referrer" }}
                    sx={{ width: 34, height: 34 }}
                  />
                </IconButton>
              </Tooltip>
              {user && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 0,
                    maxWidth: "100%",
                  }}
                >
                  <ThemeToggle darkMode={darkMode} onToggle={toggleDarkMode} borderColor={borderColor} />
                </Box>
              )}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, minWidth: 0 }}>
              <Logo darkMode={darkMode} compact />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flex: 1, minWidth: 0 }}>
              {user && (
                <IconButton
                  size="small"
                  aria-label="תפריט ניווט"
                  aria-controls="menu-appbar-nav"
                  aria-haspopup="true"
                  onClick={handleOpenNavMenu}
                  sx={{ display: "flex", color: textColor }}
                >
                  <MenuIcon sx={{ display: displayBurger }} />
                  <CloseIcon sx={{ display: displayButtonX }} />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Desktop header */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              justifyContent: "space-between",
              height: "60px",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Logo darkMode={darkMode} />
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                visibility: user ? "visible" : "hidden",
              }}
            >
              {navLinks.map((link) => (
                <Button
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  sx={{
                    color: textColor,
                    fontWeight: 500,
                    fontSize: "0.9375rem",
                    px: 2,
                    py: 1,
                    borderRadius: "8px",
                    "&:hover": {
                      color: accentColor,
                      background: darkMode
                        ? "rgba(107,143,75,0.08)"
                        : "rgba(75,107,42,0.06)",
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ThemeToggle darkMode={darkMode} onToggle={toggleDarkMode} borderColor={borderColor} />

              <Tooltip title={user?.name ? `שלום ${user.name}` : "שלום, אנא התחבר"}>
                <IconButton onClick={user ? handleOpenUserMenu : undefined} sx={{ p: 0.5 }}>
                  <Avatar
                    alt="Avatar"
                    src={user?.picture || srcImg}
                    referrerPolicy="no-referrer"
                    imgProps={{ referrerPolicy: "no-referrer" }}
                    sx={{ width: 34, height: 34 }}
                  />
                </IconButton>
              </Tooltip>

              {user && (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    color: textColor,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    px: 1.25,
                    py: 0.4,
                    borderRadius: "999px",
                    border: `1px solid ${borderColor}`,
                    background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(75,107,42,0.05)",
                  }}
                >
                  {getRoleLabel(user.role)}
                </Box>
              )}
            </Box>
          </Box>

          {user && (
            <Menu
              sx={{ mt: "44px" }}
              id="menu-appbar-user"
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              keepMounted
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              PaperProps={{
                sx: {
                  borderRadius: "12px",
                  border: `1px solid ${borderColor}`,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                  minWidth: 160,
                },
              }}
            >
              <MenuItem sx={{ display: { xs: "flex", md: "none" }, opacity: 1 }} disabled>
                {`${user?.name || ""} • ${getRoleLabel(user?.role)}`}
              </MenuItem>
              <MenuItem onClick={ClickGoodLuck}>בהצלחה</MenuItem>
              <MenuItem onClick={ClickLogOut}>התנתקות</MenuItem>
            </Menu>
          )}

          <Menu
            id="menu-appbar-nav"
            anchorEl={anchorElNav}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            keepMounted
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            open={Boolean(anchorElNav)}
            onClose={handleCloseNavMenu}
            sx={{ display: { xs: "block", md: "none" } }}
            PaperProps={{
              sx: {
                borderRadius: "12px",
                border: `1px solid ${borderColor}`,
                boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                minWidth: 180,
              },
            }}
          >
            {navLinks.map((link) => {
              const NavIcon = link.Icon;
              return (
                <MenuItem
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  disabled={!user}
                  onClick={handleCloseNavMenu}
                  sx={{ fontWeight: 500, gap: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: accentColor }}>
                    <NavIcon fontSize="small" />
                  </ListItemIcon>
                  {link.label}
                </MenuItem>
              );
            })}
          </Menu>
        </Container>
      </AppBar>

      <DialogLogOut openDialog={openSureDialog} setOpenDialog={setOpenSureDialog} onAction={OnLogOut} />
    </ThemeProvider>
  );
};

export default Header;
