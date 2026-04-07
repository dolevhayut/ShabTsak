import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import aiAvatar from "@/assets/ai-avatar.png";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BugReportIcon from "@mui/icons-material/BugReport";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useQuery } from "react-query";
import { useAuthContext } from "@/context/AuthContext";
import { getGuardsByCampId } from "@/services/guardService";
import { getOutpostsByCampId } from "@/services/outpostService";
import SelectCamp from "components/general_comps/SelectCamp";
import { commanderChat, getQuickReplies } from "@/services/openaiService";
import { COMMANDER_TOOLS, executeCommanderTool } from "@/services/commanderAiTools";

// ─── Markdown renderer using MUI components ───────────────────────────────────
const mdComponents = {
  p: ({ children }) => (
    <Typography variant="body2" sx={{ mb: 0.5, lineHeight: 1.6 }}>{children}</Typography>
  ),
  strong: ({ children }) => (
    <Box component="strong" sx={{ fontWeight: 700 }}>{children}</Box>
  ),
  em: ({ children }) => (
    <Box component="em" sx={{ fontStyle: "italic" }}>{children}</Box>
  ),
  h1: ({ children }) => <Typography variant="h6" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>{children}</Typography>,
  h2: ({ children }) => <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>{children}</Typography>,
  h3: ({ children }) => <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5, mb: 0.25 }}>{children}</Typography>,
  ul: ({ children }) => <Box component="ul" sx={{ pl: 2.5, mb: 0.5, mt: 0 }}>{children}</Box>,
  ol: ({ children }) => <Box component="ol" sx={{ pl: 2.5, mb: 0.5, mt: 0 }}>{children}</Box>,
  li: ({ children }) => (
    <Box component="li" sx={{ mb: 0.25 }}>
      <Typography variant="body2" component="span">{children}</Typography>
    </Box>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <Box
        component="code"
        sx={{
          bgcolor: "grey.200", px: 0.6, py: 0.1, borderRadius: 0.5,
          fontFamily: "monospace", fontSize: 12,
        }}
      >
        {children}
      </Box>
    ) : (
      <Box
        component="pre"
        sx={{
          bgcolor: "grey.100", p: 1.5, borderRadius: 1, overflowX: "auto",
          fontFamily: "monospace", fontSize: 12, my: 0.5,
        }}
      >
        <code>{children}</code>
      </Box>
    ),
  blockquote: ({ children }) => (
    <Box
      sx={{ borderLeft: 3, borderColor: "primary.main", pl: 1.5, ml: 0, my: 0.5, color: "text.secondary" }}
    >
      {children}
    </Box>
  ),
  table: ({ children }) => (
    <Box sx={{ overflowX: "auto", my: 1 }}>
      <Table size="small" sx={{ "& td, & th": { fontSize: 12 } }}>{children}</Table>
    </Box>
  ),
  thead: ({ children }) => <TableHead sx={{ bgcolor: "grey.100" }}>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => (
    <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{children}</TableCell>
  ),
  td: ({ children }) => <TableCell sx={{ whiteSpace: "nowrap" }}>{children}</TableCell>,
  hr: () => <Divider sx={{ my: 1 }} />,
};

// ─── Tool call result card ─────────────────────────────────────────────────────
function ToolCallCard({ call }) {
  const [open, setOpen] = useState(false);
  const success = !call.result?.error;

  return (
    <Paper
      variant="outlined"
      sx={{ p: 1, mb: 0.5, bgcolor: success ? "success.50" : "error.50", borderColor: success ? "success.200" : "error.200" }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        {success
          ? <CheckCircleIcon fontSize="small" color="success" />
          : <ErrorIcon fontSize="small" color="error" />}
        <Typography variant="caption" fontWeight={600} sx={{ flex: 1 }}>
          🔧 {call.name}
        </Typography>
        <Tooltip title={open ? "סגור" : "פרטים"}>
          <IconButton size="small" onClick={() => setOpen((v) => !v)}>
            {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>
      <Collapse in={open}>
        <Box sx={{ mt: 1, fontFamily: "monospace", fontSize: 11, whiteSpace: "pre-wrap", color: "text.secondary" }}>
          <strong>args:</strong> {JSON.stringify(call.args, null, 2)}
          {"\n"}
          <strong>result:</strong> {JSON.stringify(call.result, null, 2)}
        </Box>
      </Collapse>
    </Paper>
  );
}

// ─── Single chat message ───────────────────────────────────────────────────────
function ChatMessage({ role, events }) {
  const isUser = role === "user";
  return (
    <Stack direction={isUser ? "row-reverse" : "row"} spacing={1} alignItems="flex-start">
      <Avatar
        src={isUser ? undefined : aiAvatar}
        sx={{ bgcolor: isUser ? "primary.main" : "transparent", width: 36, height: 36, border: isUser ? "none" : "2px solid", borderColor: "primary.light" }}
      >
        {isUser ? <PersonIcon fontSize="small" /> : null}
      </Avatar>
      <Box sx={{ maxWidth: "78%", minWidth: 80 }}>
        {events.map((ev, i) => {
          if (ev.type === "user_text") {
            return (
              <Paper
                key={i}
                sx={{
                  px: 2, py: 1.2,
                  bgcolor: "primary.main", color: "primary.contrastText",
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{ev.content}</Typography>
              </Paper>
            );
          }
          if (ev.type === "text") {
            return (
              <Paper key={i} sx={{ px: 2, py: 1.2, bgcolor: "grey.100", borderRadius: 2, mb: 0.5 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {ev.content}
                </ReactMarkdown>
              </Paper>
            );
          }
          if (ev.type === "tool_calls") {
            return (
              <Box key={i} sx={{ mb: 0.5 }}>
                {ev.calls.map((c, j) => <ToolCallCard key={j} call={c} />)}
              </Box>
            );
          }
          return null;
        })}
      </Box>
    </Stack>
  );
}

// ─── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "מי שמר הכי פחות השבוע?",
  "שבץ חייל זמין לשמירה הראשונה בש.ג ראשי ביום ראשון",
  "בדוק אם יובל כהן זמין לשמירה 06:00-09:00 ביום ראשון",
  "הצג את כל השמירות של נועם מזרחי",
];

// ─── Main component ────────────────────────────────────────────────────────────
const CommanderAiPage = () => {
  const { user } = useAuthContext();
  const [campId, setCampId] = useState(null);
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]); // [{ role, events }]
  const [loading, setLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const bottomRef = useRef(null);

  const { data: guards = [] } = useQuery({
    queryKey: ["guardsByCamp", campId],
    queryFn: () => getGuardsByCampId(campId),
    enabled: !!campId,
  });

  const { data: outposts = [] } = useQuery({
    queryKey: ["outpostsByCamp", campId],
    queryFn: () => getOutpostsByCampId(campId),
    enabled: !!campId,
  });

  useEffect(() => {
    if (!import.meta.env.VITE_OPENAI_API_KEY) setApiKeyMissing(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loading]);

  const buildLogText = () =>
    chatHistory
      .flatMap((msg) =>
        msg.events.map((ev) => {
          if (ev.type === "user_text") return `👤 מפקד:\n${ev.content}`;
          if (ev.type === "text") return `🤖 AI:\n${ev.content}`;
          if (ev.type === "tool_calls")
            return ev.calls
              .map(
                (c) =>
                  `🔧 ${c.name}\nargs: ${JSON.stringify(c.args, null, 2)}\nresult: ${JSON.stringify(c.result, null, 2)}`,
              )
              .join("\n");
          return "";
        }),
      )
      .filter(Boolean)
      .join("\n\n---\n\n");

  const exportChat = () => {
    const text = buildLogText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commander-ai-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const campContext = {
    campName: campId ? `בסיס ${campId}` : "",
    guards,
    outposts,
  };

  const buildMessages = () =>
    chatHistory.flatMap((msg) => {
      if (msg.role === "user") {
        return [{ role: "user", content: msg.events[0]?.content ?? "" }];
      }
      // assistant – reconstruct from events
      const parts = [];
      msg.events.forEach((ev) => {
        if (ev.type === "text") parts.push({ role: "assistant", content: ev.content });
      });
      return parts;
    });

  const sendMessage = async (text) => {
    const userText = text ?? input.trim();
    if (!userText || loading) return;
    setInput("");
    setQuickReplies([]); // clear previous quick replies on every new send

    const userEntry = { role: "user", events: [{ type: "user_text", content: userText }] };
    setChatHistory((prev) => [...prev, userEntry]);
    setLoading(true);

    try {
      const prevMessages = buildMessages();
      const events = await commanderChat({
        messages: [...prevMessages, { role: "user", content: userText }],
        tools: COMMANDER_TOOLS,
        campContext,
        onToolCall: (name, args) => executeCommanderTool(name, { ...args, camp_id: args.camp_id ?? campId }),
      });

      setChatHistory((prev) => [...prev, { role: "assistant", events }]);

      // Generate quick-reply chips in the background (non-blocking)
      const lastText = events.filter((e) => e.type === "text").map((e) => e.content).join(" ");
      if (lastText) {
        getQuickReplies(lastText, campContext)
          .then((replies) => setQuickReplies(replies))
          .catch(() => {});
      }
    } catch (err) {
      const errMsg = err?.message ?? "שגיאה לא ידועה";
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", events: [{ type: "text", content: `❌ שגיאה: ${errMsg}` }] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box sx={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Avatar src={aiAvatar} sx={{ width: 36, height: 36, bgcolor: "transparent" }} />
        <Typography variant="h5" fontWeight={700}>עוזר מפקד AI</Typography>
        <Chip label={import.meta.env.VITE_OPENAI_MODEL ?? "gpt-5.4"} size="small" color="primary" variant="outlined" />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="הצג LOG להעתקה">
          <span>
            <IconButton
              size="small"
              disabled={chatHistory.length === 0}
              onClick={() => { setCopied(false); setLogModal(true); }}
            >
              <BugReportIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="ייצא שיחה לקובץ טקסט">
          <span>
            <IconButton
              size="small"
              disabled={chatHistory.length === 0}
              onClick={exportChat}
            >
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="נקה שיחה">
          <span>
            <IconButton
              size="small"
              disabled={chatHistory.length === 0}
              onClick={() => { setChatHistory([]); setQuickReplies([]); }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {apiKeyMissing && (
        <Alert severity="warning">
          <strong>VITE_OPENAI_API_KEY</strong> לא מוגדר. הוסף לקובץ <code>.env</code> ורענן.
        </Alert>
      )}

      {/* Camp selector */}
      <SelectCamp
        setSelectedCampId={setCampId}
        selectedCampId={campId}
        onCampChange={() => setChatHistory([])}
        title=""
        title2="בסיס:"
      />

      {/* Chat area */}
      <Paper
        variant="outlined"
        sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 2, bgcolor: "grey.50" }}
      >
        {chatHistory.length === 0 && !loading && (
          <Box sx={{ m: "auto", textAlign: "center", color: "text.secondary" }}>
            <Box component="img" src={aiAvatar} sx={{ width: 72, height: 72, opacity: 0.35, mb: 1, borderRadius: "50%" }} />
            <Typography variant="body2">שלח שאלה או פקודה בעברית חופשית</Typography>
            <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1} sx={{ mt: 2 }}>
              {SUGGESTIONS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  size="small"
                  variant="outlined"
                  clickable
                  disabled={!campId || apiKeyMissing}
                  onClick={() => sendMessage(s)}
                />
              ))}
            </Stack>
          </Box>
        )}

        {chatHistory.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} events={msg.events} />
        ))}

        {loading && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar
              src={aiAvatar}
              sx={{ width: 36, height: 36, border: "2px solid", borderColor: "primary.light", bgcolor: "transparent" }}
            />
            <Paper sx={{ px: 2, py: 1.2, bgcolor: "grey.100", borderRadius: 2 }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="caption" color="text.secondary">חושב...</Typography>
            </Paper>
          </Stack>
        )}

        <div ref={bottomRef} />
      </Paper>

      {/* Quick-reply chips */}
      {quickReplies.length > 0 && !loading && (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ px: 0.5 }}>
          {quickReplies.map((reply) => (
            <Chip
              key={reply}
              label={reply}
              size="small"
              variant="outlined"
              color="primary"
              clickable
              onClick={() => sendMessage(reply)}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>
      )}

      {/* Input */}
      <Divider />
      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder={campId ? "כתוב פקודה או שאלה (Enter לשליחה, Shift+Enter לשורה חדשה)…" : "בחר בסיס קודם"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={!campId || loading || apiKeyMissing}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  color="primary"
                  disabled={!input.trim() || loading || apiKeyMissing}
                  onClick={() => sendMessage()}
                >
                  {loading ? <CircularProgress size={18} /> : <SendIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Stack>
      {/* ── Log Modal ── */}
      <Dialog open={logModal} onClose={() => setLogModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <BugReportIcon color="primary" />
              <Typography fontWeight={700}>LOG שיחה</Typography>
            </Stack>
            <Button
              size="small"
              variant={copied ? "contained" : "outlined"}
              color={copied ? "success" : "primary"}
              startIcon={<ContentCopyIcon fontSize="small" />}
              onClick={() => {
                navigator.clipboard.writeText(buildLogText());
                setCopied(true);
              }}
            >
              {copied ? "הועתק ✓" : "העתק הכל"}
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              fontFamily: "monospace",
              fontSize: 12,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              bgcolor: "grey.950",
              color: "grey.100",
              minHeight: 300,
              maxHeight: "60vh",
              overflowY: "auto",
              "& .log-user":   { color: "#93c5fd" },
              "& .log-ai":     { color: "#86efac" },
              "& .log-tool":   { color: "#fcd34d" },
              "& .log-result-ok":  { color: "#a3e635" },
              "& .log-result-err": { color: "#f87171" },
              "& .log-sep":    { color: "#6b7280" },
            }}
          >
            {chatHistory.flatMap((msg, mi) =>
              msg.events.map((ev, ei) => {
                const key = `${mi}-${ei}`;
                if (ev.type === "user_text")
                  return (
                    <span key={key}>
                      <span style={{ color: "#93c5fd" }}>👤 מפקד:</span>{"\n"}{ev.content}{"\n\n"}<span style={{ color: "#4b5563" }}>{"─".repeat(60)}</span>{"\n\n"}
                    </span>
                  );
                if (ev.type === "text")
                  return (
                    <span key={key}>
                      <span style={{ color: "#86efac" }}>🤖 AI:</span>{"\n"}{ev.content}{"\n\n"}<span style={{ color: "#4b5563" }}>{"─".repeat(60)}</span>{"\n\n"}
                    </span>
                  );
                if (ev.type === "tool_calls")
                  return ev.calls.map((c, ci) => {
                    const hasErr = !!c.result?.error;
                    return (
                      <span key={`${key}-${ci}`}>
                        <span style={{ color: "#fcd34d" }}>🔧 {c.name}</span>{"\n"}
                        <span style={{ color: "#9ca3af" }}>args: </span>{JSON.stringify(c.args, null, 2)}{"\n"}
                        <span style={{ color: hasErr ? "#f87171" : "#a3e635" }}>result: </span>{JSON.stringify(c.result, null, 2)}{"\n\n"}
                      </span>
                    );
                  });
                return null;
              }),
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogModal(false)}>סגור</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommanderAiPage;
