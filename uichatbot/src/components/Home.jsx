import { useState, useEffect, useRef } from "react";
import { Box, Typography, TextField, Button, Alert, CircularProgress, List, ListItem, ListItemText, ListItemButton, Paper, IconButton, InputAdornment } from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { authApis, endpoints } from "../configs/APIs";
import { useNavigate } from "react-router-dom";
import cookie from 'react-cookies';

export default function Home() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const token = cookie.load("access_token");
        if (!token) {
          navigate("/");
          return;
        }
        const response = await authApis().get(endpoints["chat_sessions"]);
        setSessions(response.data);
      } catch (err) {
        setError("Không thể tải danh sách phiên chat!");
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [navigate]);

  useEffect(() => {
    if (selectedSession) {
      const fetchMessages = async () => {
        setLoading(true);
        try {
          const response = await authApis().get(endpoints["messages"](selectedSession.id));
          setMessages(response.data);
        } catch (err) {
          setError("Không thể tải tin nhắn!");
        } finally {
          setLoading(false);
        }
      };
      fetchMessages();
    }
  }, [selectedSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCreateSession = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await authApis().post(endpoints["chat_sessions"], {});
      setSessions([...sessions, response.data]);
      setSelectedSession(response.data);
      return response.data;
    } catch (err) {
      setError("Không thể tạo phiên chat mới!");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setError("");
    setLoading(true);

    let currentSession = selectedSession;
    if (!currentSession) {
      currentSession = await handleCreateSession();
      if (!currentSession) {
        setLoading(false);
        return;
      }
    }

    const tempMessage = {
      id: `temp-${Date.now()}`,
      text: newMessage,
      sender: 'human',
      created_date: new Date().toISOString()
    };
    setMessages([...messages, tempMessage]);
    setNewMessage("");

    try {
      await authApis().post(endpoints["messages"](currentSession.id), { text: newMessage });
      const response = await authApis().get(endpoints["messages"](currentSession.id));
      setMessages(response.data);
    } catch (err) {
      setError("Không thể gửi tin nhắn hoặc tải lại tin nhắn!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: '#ffffff', minHeight: '100vh', position: 'relative' }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', height: '100vh', width: '100vw', padding: '24px', gap: '24px', boxSizing: 'border-box' }}>
        <Paper sx={{ width: '280px', backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', border: '1px solid #000000', flexShrink: 0, flex: '0 0 220px', overflow: 'hidden' }}>
          <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600, marginBottom: '16px' }}>
            ChatMDC
          </Typography>
          <Button
            variant="contained"
            fullWidth
            disabled={loading}
            onClick={handleCreateSession}
            sx={{ marginBottom: '16px', borderRadius: '25px', backgroundColor: '#000000', color: '#ffffff', padding: '12px 0', fontWeight: 500, textTransform: 'none', transition: 'all 0.3s ease', '&:hover': { backgroundColor: '#333333', transform: 'translateY(-2px)' }, '&.Mui-disabled': { backgroundColor: '#cccccc', color: '#666666' } }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: '#666666' }} /> : 'Trò chuyện mới'}
          </Button>
          <List sx={{ maxHeight: '57vh', overflowY: 'auto', paddingRight: '8px' }}>
            {sessions.map((session) => (
              <ListItem key={session.id} disablePadding sx={{ marginBottom: '8px' }}>
                <ListItemButton
                  selected={selectedSession?.id === session.id}
                  onClick={() => setSelectedSession(session)}
                  sx={{ borderRadius: '8px', padding: '12px', transition: 'all 0.2s ease', backgroundColor: selectedSession?.id === session.id ? '#cccccc' : 'transparent', color: selectedSession?.id === session.id ? '#000000' : 'inherit', '&:hover': { backgroundColor: selectedSession?.id === session.id ? '#cccccc' : '#e5e5e5', color: '#000000', transform: 'translateY(-2px)' } }}
                >
                  <ListItemText
                    primary={`${session.session_name == null ? "Chưa đặt tên" : session.session_name}`}
                    sx={{ '& .MuiListItemText-primary': { color: 'inherit', fontWeight: 500, fontSize: '14px' } }}
                  />
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '10px' }}>
                    {session.updated_date
                      ? new Date(session.updated_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : "Không có thời gian"}
                  </Typography>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', border: '1px solid #000000', minWidth: 0 }}>
          {error && (
            <Alert severity="error" sx={{ marginBottom: '16px', borderRadius: '12px', backgroundColor: '#ffcccc', color: '#000000', '& .MuiAlert-icon': { color: '#000000' } }}>
              {error}
            </Alert>
          )}

          {selectedSession ? (
            <Paper sx={{ flexGrow: 1, padding: '24px', marginBottom: '16px', borderRadius: '6px', backgroundColor: '#ffffff', overflowY: 'auto', maxHeight: '70vh', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)', border: '1px solid #000000' }}>
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: message.sender === 'human' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box sx={{
                    maxWidth: '70%',
                    padding: '16px',
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s ease',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    backgroundColor: message.sender === 'human' ? '#000000' : '#e5e5e5',
                    color: message.sender === 'human' ? '#ffffff' : '#000000',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                    },
                  }}>
                    <Typography variant="body1" sx={{
                      wordBreak: 'break-word',
                      fontSize: '14px',
                    }}>
                      {message.text || "Tin nhắn không có nội dung"}
                    </Typography>
                    <Typography variant="caption" sx={{
                      display: 'block',
                      opacity: 0.7,
                      marginTop: '4px',
                      fontSize: '10px',
                      textAlign: message.sender === 'human' ? 'right' : 'left',
                      color: message.sender === 'human' ? '#cccccc' : '#666666',
                    }}>
                      {message.created_date
                        ? new Date(message.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : "Không có thời gian"}
                    </Typography>
                  </Box>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Paper>
          ) : (
            <Typography variant="body1" sx={{
              color: '#666666',
              fontStyle: 'italic',
              margin: 'auto',
            }}>
              Chúng ta nên bắt đầu từ đâu?
            </Typography>
          )}

          <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', gap: '12px' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Bạn cần giúp đỡ gì?"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '25px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#000000',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#333333',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#000000',
                  },
                  '& .MuiInputBase-input': {
                    color: '#000000',
                  },
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      type="submit"
                      disabled={!newMessage.trim() || loading}
                      sx={{ color: '#000000', '&:hover': { color: '#333333' }, '&.Mui-disabled': { color: '#cccccc' } }}>
                      <SendIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}