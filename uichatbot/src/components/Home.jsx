import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { Box, Typography, TextField, Button, Alert, CircularProgress, List, Avatar, Divider, ListItem, ListItemText, ListItemButton, Paper, IconButton, InputAdornment, Menu, MenuItem, Link, Dialog, DialogContent, DialogActions, DialogTitle } from "@mui/material";
import { Send as SendIcon, Logout as LogoutIcon, AccountCircle, Edit as EditIcon, Delete as DeleteIcon, MoreVert as MoreVertIcon } from "@mui/icons-material";
import { authApis, endpoints } from "../configs/APIs";
import { useNavigate } from "react-router-dom";
import cookie from 'react-cookies';
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { MyDispatchContext, MyUserContext } from "../configs/Contexts";

export default function Home() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [nextPage, setNextPage] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const observerRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [editSession, setEditSession] = useState(null);
  const [deleteSession, setDeleteSession] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [sessionMenuAnchorEl, setSessionMenuAnchorEl] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const open = Boolean(anchorEl);
  const sessionMenuOpen = Boolean(sessionMenuAnchorEl);

  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    navigate("/profile");
    handleClose();
  };

  const handleLogout = () => {
    cookie.remove("access_token", { path: "/" });
    dispatch({ type: "logout" });
    navigate("/");
    handleClose();
  };

  const handleSessionMenuClick = (event, sessionId) => {
    setSessionMenuAnchorEl(event.currentTarget);
    setCurrentSessionId(sessionId);
  };

  const handleSessionMenuClose = () => {
    setSessionMenuAnchorEl(null);
    setCurrentSessionId(null);
  };

  const fetchSessions = useCallback(async (url = endpoints["chat_sessions"], append = false) => {
    setLoading(true);
    try {
      const token = cookie.load("access_token");
      if (!token) {
        navigate("/");
        return;
      }
      const response = await authApis().get(url);
      const fetchedSessions = response.data.results || [];
      setSessions((prev) => {
        const newSessions = append ? [...prev, ...fetchedSessions] : fetchedSessions;
        const uniqueSessions = Array.from(
          new Map(newSessions.map((session) => [session.id, session])).values()
        );
        return uniqueSessions;
      });
      setNextPage(response.data.next);
      setHasMore(!!response.data.next);
    } catch (err) {
      setError("Không thể tải danh sách session");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    setSessions([]);
    fetchSessions(endpoints["chat_sessions"], false);
  }, [fetchSessions]);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPage) {
          fetchSessions(nextPage, true);
        }
      },
      { threshold: 1.0 }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [nextPage, hasMore, loading, fetchSessions]);

  useEffect(() => {
    if (selectedSession) {
      const fetchMessages = async () => {
        setLoading(true);
        try {
          const response = await authApis().get(endpoints["messages"](selectedSession.id));
          setMessages(response.data);
        } catch (err) {
          setError("Không thể tải tin nhắn");
        } finally {
          setLoading(false);
        }
      };
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [selectedSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCreateSession = () => {
    setSessionName("");
    setEditSession(null);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  const handleDialogSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (editSession) {
        await authApis().put(endpoints["chat_session_detail"](editSession.id), { session_name: sessionName.trim() || "Chưa đặt tên" });
        await fetchSessions(endpoints["chat_sessions"], false);
        if (selectedSession && selectedSession.id === editSession.id) {
          setSelectedSession({ ...selectedSession, session_name: sessionName.trim() || "Chưa đặt tên" });
        }
      } else {
        const response = await authApis().post(endpoints["chat_sessions"], { session_name: sessionName.trim() || "Chưa đặt tên" });
        await fetchSessions(endpoints["chat_sessions"], false);
        setSelectedSession(response.data);
      }
      setOpenDialog(false);
    } catch (err) {
      setError(editSession ? "Không thể cập nhật session" : "Không thể tạo session mới");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSession = (session) => {
    setSessionName(session.session_name || "");
    setEditSession(session);
    setOpenDialog(true);
    handleSessionMenuClose();
  };

  const handleDeleteSession = (session) => {
    setDeleteSession(session);
    setOpenDeleteDialog(true);
    handleSessionMenuClose();
  };

  const handleConfirmDelete = async () => {
    if (!deleteSession) return;
    setError("");
    setLoading(true);
    try {
      await authApis().delete(endpoints["chat_session_detail"](deleteSession.id));
      await fetchSessions(endpoints["chat_sessions"], false);
      if (selectedSession && selectedSession.id === deleteSession.id) {
        setSelectedSession(null);
        setMessages([]);
      }
      setOpenDeleteDialog(false);
    } catch (err) {
      setError("Không thể xóa phiên chat!");
      console.error("Delete session error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDialogClose = () => {
    setOpenDeleteDialog(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setError("");
    setSending(true);

    try {
      let currentSession = selectedSession;

      if (!currentSession) {
        setOpenDialog(true);
        setSending(false);
        return;
      }

      const tempMessage = {
        id: `temp-${Date.now()}`,
        text: newMessage,
        sender: "human",
        created_date: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");
      await authApis().post(endpoints["messages"](currentSession.id), { text: newMessage });
      const response = await authApis().get(endpoints["messages"](currentSession.id));
      setMessages(response.data);
    } catch (err) {
      setError("Không thể tạo session hoặc gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  const handleAvatarSrc = (avatar) => {
    if (!avatar) return undefined;
    if (avatar.startsWith('image/upload/https://res.cloudinary.com/dp9b0dkkt/')) {
      return avatar.replace('image/upload/', '');
    }
    return `https://res.cloudinary.com/dp9b0dkkt/${avatar}`;
  };

  return (
    <Box sx={{ backgroundColor: '#ffffff', minHeight: '100vh', position: 'relative' }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', height: '100vh', width: '100vw', padding: '24px', gap: '24px', boxSizing: 'border-box' }}>
        <Paper sx={{ width: '280px', backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', border: '1px solid #000000', flexShrink: 0, flex: '0 0 220px', overflow: 'hidden', position: 'relative' }}>
          <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600, marginBottom: '16px' }}>
            <Link href="/home" underline="none" color="inherit">
              ChatMDC
            </Link>
          </Typography>
          <Button
            variant="contained"
            fullWidth
            disabled={loading || sending}
            onClick={handleCreateSession}
            sx={{ marginBottom: '16px', borderRadius: '25px', backgroundColor: '#000000', color: '#ffffff', padding: '12px 0', fontWeight: 500, textTransform: 'none', transition: 'all 0.3s ease', '&:hover': { backgroundColor: '#333333', transform: 'translateY(-2px)' }, '&.Mui-disabled': { backgroundColor: '#cccccc', color: '#666666' } }}>
            {(loading || sending) ? <CircularProgress size={24} sx={{ color: '#666666' }} /> : 'Tư vấn mới'}
          </Button>
          <List sx={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', paddingRight: '8px' }}>
            {sessions.map((session) => (
              <ListItem
                key={session.id}
                disablePadding
                sx={{ marginBottom: '8px' }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: '16px' }}>
                    <IconButton
                      edge="end"
                      aria-label="more"
                      onClick={(event) => handleSessionMenuClick(event, session.id)}
                      sx={{ color: '#000000', '&:hover': { color: '#333333' }, padding: '6px', '& .MuiSvgIcon-root': { fontSize: '18px' } }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                    <Menu
                      anchorEl={sessionMenuAnchorEl}
                      open={sessionMenuOpen && currentSessionId === session.id}
                      onClose={handleSessionMenuClose}
                      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                      sx={{ '& .MuiPaper-root': { borderRadius: '8px' } }}
                    >
                      <MenuItem onClick={() => handleEditSession(session)} sx={{ fontWeight: 500, color: '#000000', padding: '8px 16px' }}>
                        <EditIcon sx={{ fontSize: '18px', marginRight: '5px' }} />
                        Chỉnh sửa
                      </MenuItem>
                      <MenuItem onClick={() => handleDeleteSession(session)} sx={{ fontWeight: 500, color: '#ff0000', padding: '8px 16px' }}>
                        <DeleteIcon sx={{ fontSize: '18px', marginRight: '5px' }} />
                        Xóa
                      </MenuItem>
                    </Menu>
                  </Box>
                }
              >
                <ListItemButton
                  selected={selectedSession?.id === session.id}
                  onClick={() => setSelectedSession(session)}
                  sx={{ borderRadius: '8px', display: 'grid', padding: '12px', transition: 'all 0.2s ease', backgroundColor: selectedSession?.id === session.id ? '#cccccc' : 'transparent', color: selectedSession?.id === session.id ? '#000000' : 'inherit', '&:hover': { backgroundColor: selectedSession?.id === session.id ? '#cccccc' : '#e5e5e5', color: '#000000', transform: 'translateY(-2px)' } }}
                >
                  <ListItemText
                    primary={`${session.session_name == null ? "Chưa đặt tên" : session.session_name}`}
                    sx={{ '& .MuiListItemText-primary': { color: 'inherit', fontWeight: 500, fontSize: '14px' } }}
                  />
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '10px' }}>
                    {session.updated_date
                      ? new Date(session.updated_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
                      : "Không có thời gian"}
                  </Typography>
                </ListItemButton>
              </ListItem>
            ))}
            {hasMore && (
              <div ref={observerRef} style={{ height: '20px' }}>
                {loading && <CircularProgress size={20} sx={{ display: 'block', margin: '0 auto' }} />}
              </div>
            )}
          </List>
          <Box sx={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
            <Divider sx={{ marginY: 1 }} />
            <Box
              sx={{ display: 'flex', alignItems: "center", gap: '12px', flexGrow: 1, padding: '8px', borderRadius: '6px', backgroundColor: '#ffffff', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)', border: '1px solid #000000', cursor: 'pointer', '&:hover': { backgroundColor: '#e5e5e5' } }}
              onClick={handleProfileClick}
            >
              <Avatar alt="User Avatar" src={handleAvatarSrc(user.avatar)}>
                {(user.first_name || "U")[0]}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : "User"}
                </Typography>
                <Typography variant="caption" sx={{ color: "#666666" }}>
                  {user.email ? user.email : "Chưa có email"}
                </Typography>
              </Box>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              sx={{ '& .MuiPaper-root': { borderRadius: '8px' } }}
            >
              <MenuItem onClick={handleProfile} sx={{ fontWeight: 500, color: '#000000', padding: '8px 16px' }}>
                <AccountCircle sx={{ fontSize: '20px', marginRight: '5px' }} />
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ fontWeight: 500, color: '#ff0000ff', padding: '8px 16px' }}>
                <LogoutIcon sx={{ fontSize: '20px', marginRight: '5px' }} />
                Log out
              </MenuItem>
            </Menu>
          </Box>
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
                  sx={{ marginBottom: '16px', display: 'flex', justifyContent: message.sender === 'human' ? 'flex-end' : 'flex-start' }}
                >
                  <Box sx={{ maxWidth: '70%', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s ease', wordBreak: 'break-word', whiteSpace: 'pre-wrap', backgroundColor: message.sender === 'human' ? '#000000' : '#e5e5e5', color: message.sender === 'human' ? '#ffffff' : '#000000', '&:hover': { transform: 'translateY(-2px)' } }}>
                    <ReactMarkdown
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        p: ({ node, ...props }) => (
                          <Typography
                            variant="body1"
                            sx={{ wordBreak: 'break-word', margin: '0', lineHeight: 1.4 }}
                            {...props}
                          />
                        ),
                        h3: ({ node, ...props }) => (
                          <Typography
                            variant="h6"
                            sx={{ color: 'inherit', margin: '0', lineHeight: 1.4 }}
                            {...props}
                          />
                        ),
                        strong: ({ node, ...props }) => (
                          <Typography
                            component="span"
                            sx={{ fontWeight: 600, color: 'inherit', lineHeight: 1.4 }}
                            {...props}
                          />
                        ),
                        ul: ({ node, ...props }) => (
                          <Typography
                            component="ul"
                            sx={{ margin: '0', paddingLeft: '20px', lineHeight: 1.4 }}
                            {...props}
                          />
                        ),
                        li: ({ node, ...props }) => (
                          <Typography
                            component="li"
                            sx={{ lineHeight: 1.4 }}
                            {...props}
                          />
                        ),
                      }}
                    >
                      {message.text || "Tin nhắn không có nội dung"}
                    </ReactMarkdown>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        opacity: 0.7,
                        marginTop: '4px',
                        fontSize: '10px',
                        textAlign: message.sender === 'human' ? 'right' : 'left',
                        color: message.sender === 'human' ? '#cccccc' : '#666666',
                      }}
                    >
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
            <Typography variant="body1" sx={{ color: '#666666', fontStyle: 'italic', margin: 'auto' }}>
              Hãy đặt câu hỏi để được tư vấn ngay
            </Typography>
          )}

          {selectedSession && (
            <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', gap: '12px' }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Bạn cần giúp đỡ gì?"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '25px', backgroundColor: '#ffffff', color: '#000000', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#000000' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#333333' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000000' }, '& .MuiInputBase-input': { color: '#000000' }, } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        sx={{ color: '#000000', '&:hover': { color: '#333333' }, '&.Mui-disabled': { color: '#cccccc' } }}
                      >
                        <SendIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}
        </Box>
      </Box>

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={editSession ? "Chỉnh sửa tên phiên chat" : "Tên phiên chat"}
            type="text"
            fullWidth
            variant="outlined"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} sx={{ color: '#666666' }}>
            Hủy
          </Button>
          <Button onClick={handleDialogSubmit} disabled={loading} sx={{ backgroundColor: '#000000', color: '#ffffff', '&:hover': { backgroundColor: '#333333' } }}>
            {loading ? <CircularProgress size={24} sx={{ color: '#666666' }} /> : editSession ? 'Cập nhật' : 'Tạo'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={handleDeleteDialogClose}>
        <DialogTitle>Xác nhận xóa phiên chat</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc muốn xóa phiên chat "{deleteSession?.session_name || "Chưa đặt tên"}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose} sx={{ color: '#666666' }}>
            Hủy
          </Button>
          <Button onClick={handleConfirmDelete} disabled={loading} sx={{ color: '#ff0000' }}>
            {loading ? <CircularProgress size={24} sx={{ color: '#666666' }} /> : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}