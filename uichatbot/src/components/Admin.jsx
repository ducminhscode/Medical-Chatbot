import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { Box, Tab, Typography, Alert, CircularProgress, List, Button, Divider, Avatar, Paper, Link, Container, Tabs, Chip, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, TextField } from "@mui/material";
import { authApis, endpoints } from "../configs/APIs";
import { useNavigate } from "react-router-dom";
import cookie from 'react-cookies';
import { MyUserContext } from "../configs/Contexts";

const Admin = () => {
    const [users, setUsers] = useState([]);
    const [knowledge, setKnowledge] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ text: "", variant: "" });
    const [activeTab, setActiveTab] = useState("users");
    const [nextPage, setNextPage] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedKB, setSelectedKB] = useState(null);
    const [openKBDialog, setOpenKBDialog] = useState(false);
    const [detailKBLoading, setDetailKBLoading] = useState(false);
    const [confirmKB, setConfirmKB] = useState({ open: false, id: null });
    const [openAddKB, setOpenAddKB] = useState(false);
    const [newKB, setNewKB] = useState({ title: "", description: "", file: null });
    const [uploading, setUploading] = useState(false);

    const observerRef = useRef(null);
    const navigate = useNavigate();
    const user = useContext(MyUserContext);

    const openConfirmKB = (id) => {
        setConfirmKB({ open: true, id });
    };

    const closeConfirmKB = () => {
        setConfirmKB({ open: false, id: null });
    };

    const fetchUsers = useCallback(async (url = endpoints['all_users'], append = false) => {
        try {
            setLoading(true);
            const token = cookie.load("access_token");
            if (!token) {
                navigate("/login");
                return;
            }
            const res = await authApis().get(url);
            const fetchedUsers = res.data.results || [];
            setUsers((prev) => {
                const newUsers = append ? [...prev, ...fetchedUsers] : fetchedUsers;
                const uniqueUsers = Array.from(
                    new Map(newUsers.map((user) => [user.id, user])).values()
                );
                return uniqueUsers;
            });
            setNextPage(res.data.next);
            setHasMore(!!res.data.next);
        } catch (err) {
            setMessage("Failed to fetch users.");
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    const fetchKnowledge = useCallback(async () => {
        try {
            setLoading(true);
            const token = cookie.load("access_token");
            if (!token) {
                navigate("/login");
                return;
            }
            const res = await authApis().get(endpoints['knowledge']);
            setKnowledge(res.data.results || res.data || []);
        } catch (err) {
            setMessage({ text: "Không thể lấy danh sách datasets", variant: "error" });
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    const fetchUserById = async (id) => {
        try {
            setDetailLoading(true);
            const token = cookie.load("access_token");
            if (!token) {
                navigate("/login");
                return;
            }
            const res = await authApis().get(endpoints['user_by_id'](id));
            setSelectedUser(res.data);
            setOpenDialog(true);
        } catch (err) {
            setMessage({ text: "Không thể lấy thông tin user", variant: "error" });
        } finally {
            setDetailLoading(false);
        }
    };

    const fetchKnowledgeById = async (id) => {
        try {
            setDetailKBLoading(true);
            const token = cookie.load("access_token");
            if (!token) {
                navigate("/login");
                return;
            }
            const res = await authApis().get(endpoints['knowledge_detail'](id));
            setSelectedKB(res.data);
            setOpenKBDialog(true);
        } catch (err) {
            setMessage({ text: "Không thể lấy thông tin datasets", variant: "error" });
        } finally {
            setDetailKBLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.role === 1) {
            setUsers([]);
            fetchUsers(endpoints['all_users'], false);
        } else {
            navigate("/");
        }
    }, [user, fetchUsers, navigate]);

    useEffect(() => {
        if (activeTab === "datasets") {
            fetchKnowledge();
        }
    }, [activeTab, fetchKnowledge]);

    useEffect(() => {
        if (activeTab !== "users") return;
        if (!hasMore || loading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextPage) {
                    fetchUsers(nextPage, true);
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
    }, [activeTab, nextPage, hasMore, loading, fetchUsers]);

    const handleDeleteKB = async (id) => {
        try {
            const token = cookie.load("access_token");
            if (!token) {
                navigate("/login");
                return;
            }
            await authApis().delete(endpoints['knowledge_detail'](id));
            setKnowledge((prev) => prev.filter((kb) => kb.id !== id));
            setOpenKBDialog(false);
            setMessage({ text: "Xóa datasets thành công", variant: "success" });
        } catch (err) {
            setMessage({ text: "Xóa datasets thất bại", variant: "error" });
        }
    };

    const handleOpenAddKB = () => setOpenAddKB(true);
    const handleCloseAddKB = () => {
        setNewKB({ title: "", description: "", file: null });
        setOpenAddKB(false);
    };

    const handleAddKB = async () => {
        try {
            setUploading(true);
            const token = cookie.load("access_token");
            if (!token) {
                navigate("/login");
                return;
            }

            let formData = new FormData();
            formData.append("title", newKB.title);
            formData.append("description", newKB.description);
            if (newKB.file) formData.append("file", newKB.file);

            const res = await authApis().post(endpoints['knowledge'], formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setKnowledge((prev) => [res.data, ...prev]);
            setMessage({ text: "Thêm datasets thành công", variant: "success" });
            handleCloseAddKB();
        } catch (err) {
            setMessage({ text: "Thêm datasets thất bại", variant: "error" });
        } finally {
            setUploading(false);
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
        <Box sx={{ p: 2, backgroundColor: '#ffffff', position: 'relative' }}>
            <Box sx={{ position: "absolute", top: 20, left: 30 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "1.25rem" }}>
                    <Link href="/home" underline="none" color="inherit">
                        ChatMDC
                    </Link>
                </Typography>
            </Box>

            <Container maxWidth="sm" sx={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                    Admin Dashboard
                </Typography>

                {message.text && (
                    <Alert severity={message.variant} sx={{ mb: 2, borderRadius: "50px" }} onClose={() => setMessage({ text: "", variant: "" })}>
                        {message.text}
                    </Alert>
                )}

                <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    centered
                    sx={{ mb: 3 }}
                >
                    <Tab label="Người dùng" value="users" />
                    <Tab label="Datasets" value="datasets" />
                </Tabs>

                <Box component="form">
                    {activeTab === "users" ? (
                        <>
                            <Paper
                                sx={{ maxHeight: 'calc(50vh - 100px)', overflowY: 'auto', p: 2, borderRadius: 3, boxShadow: 3 }}>
                                <List>
                                    {users.map((user) => (
                                        <div key={user.id}>
                                            <Box
                                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, px: 1.5, cursor: "pointer", "&:hover": { backgroundColor: "#f5f5f5", borderRadius: 2 } }}
                                                onClick={() => fetchUserById(user.id)}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar src={handleAvatarSrc(user.avatar)} sx={{ bgcolor: "#666666" }} >
                                                        {(user.first_name || "U")[0]}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="subtitle1" fontWeight="bold">
                                                            {user.first_name} {user.last_name}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Chip
                                                    label={user.role === 1 ? "Admin" : "User"}
                                                    color={user.role === 1 ? "error" : "default"}
                                                    size="small"
                                                />
                                            </Box>
                                            <Divider />
                                        </div>
                                    ))}

                                    {hasMore && (
                                        <Box ref={observerRef} sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                            {loading && <CircularProgress size={20} />}
                                        </Box>
                                    )}
                                </List>
                            </Paper>

                        </>
                    ) : (
                        <>
                            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                                <Button sx={{ width: '280px', marginBottom: '16px', borderRadius: '25px', backgroundColor: '#000000', color: '#ffffff', padding: '12px 0', fontWeight: 500, textTransform: 'none', transition: 'all 0.3s ease', '&:hover': { backgroundColor: '#333333', transform: 'translateY(-2px)' }, '&.Mui-disabled': { backgroundColor: '#cccccc', color: '#666666' } }} variant="contained" onClick={handleOpenAddKB}>
                                    Thêm Dataset
                                </Button>
                            </Box>
                            <Paper sx={{ maxHeight: 'calc(50vh - 100px)', overflowY: 'auto', p: 2, borderRadius: 3, boxShadow: 3 }}>
                                <List>
                                    {loading ? (
                                        <CircularProgress />
                                    ) : knowledge.length > 0 ? (
                                        knowledge.map((kb) => (
                                            <div key={kb.id}>
                                                <Box
                                                    sx={{
                                                        py: 1, px: 1.5, textAlign: "left",
                                                        cursor: "pointer",
                                                        "&:hover": { backgroundColor: "#f5f5f5", borderRadius: 2 }
                                                    }}
                                                    onClick={() => fetchKnowledgeById(kb.id)}
                                                >
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {kb.title || "Không có tiêu đề"}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {kb.description || "Không có mô tả"}
                                                    </Typography>
                                                </Box>
                                                <Divider />
                                            </div>
                                        ))
                                    ) : (
                                        <Typography>Không có knowledge base nào</Typography>
                                    )}
                                </List>

                            </Paper>
                        </>
                    )}
                </Box>
            </Container>
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Thông tin người dùng</DialogTitle>
                <DialogContent dividers>
                    {detailLoading ? (
                        <CircularProgress />
                    ) : selectedUser ? (
                        <Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                                <Avatar src={handleAvatarSrc(selectedUser.avatar)} sx={{ width: 60, height: 60 }} />
                                <Box>
                                    <Typography variant="h6">{selectedUser.first_name} {selectedUser.last_name}</Typography>
                                    <Chip
                                        label={selectedUser.role === 1 ? "Admin" : "User"}
                                        color={selectedUser.role === 1 ? "error" : "default"}
                                        size="small"
                                    />
                                </Box>
                            </Box>
                            <Typography><b>Username:</b> {selectedUser.username}</Typography>
                            <Typography><b>Email:</b> {selectedUser.email}</Typography>
                            <Typography><b>Họ:</b> {selectedUser.last_name}</Typography>
                            <Typography><b>Tên:</b> {selectedUser.first_name}</Typography>
                            <Typography><b>Ngày sinh:</b> {selectedUser.date_of_birth ? new Date(selectedUser.date_of_birth).toLocaleString() : ""}</Typography>
                            <Typography><b>Giới tính:</b> {selectedUser.is_male ? (selectedUser.is_male === 1 ? "Nam" : "Nữ") : ""}</Typography>
                            <Typography><b>Ngày tạo:</b> {new Date(selectedUser.date_joined).toLocaleString()}</Typography>
                        </Box>
                    ) : (
                        <Typography>Không tìm thấy thông tin.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button sx={{ color: "#666666" }} onClick={() => setOpenDialog(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openKBDialog} onClose={() => setOpenKBDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Thông tin Knowledge Base</DialogTitle>
                <DialogContent dividers>
                    {detailKBLoading ? (
                        <CircularProgress />
                    ) : selectedKB ? (
                        <Box>
                            <Typography variant="h6" gutterBottom>{selectedKB.title ? selectedKB.title : "Không có tiêu đề"}</Typography>
                            <Typography><b>Mô tả:</b> {selectedKB.description ? selectedKB.description : "Không có mô tả"}</Typography>
                            <Typography><b>File:</b> {selectedKB.file}</Typography>
                            <Typography><b>Ngày tạo:</b> {new Date(selectedKB.created_date).toLocaleString()}</Typography>
                            <Typography><b>Người tạo:</b> {selectedKB.uploaded_by?.username || "Không rõ"}</Typography>
                        </Box>
                    ) : (
                        <Typography>Không tìm thấy thông tin.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button sx={{ color: "#666666" }} onClick={() => setOpenKBDialog(false)}>Đóng</Button>
                    {selectedKB && (
                        <Button sx={{ background: "#ff0000", color: "#ffffff" }} onClick={() => openConfirmKB(selectedKB.id)}>
                            Xóa
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
            <Dialog open={confirmKB.open} onClose={closeConfirmKB}>
                <DialogTitle>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc chắn muốn xóa datasets này không?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeConfirmKB}>Hủy</Button>
                    <Button
                        color="error"
                        onClick={() => {
                            handleDeleteKB(confirmKB.id);
                            closeConfirmKB();
                        }}
                    >
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openAddKB} onClose={handleCloseAddKB} maxWidth="sm" fullWidth>
                <DialogTitle>Thêm Datasets</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        margin="dense"
                        label="Tiêu đề"
                        fullWidth
                        value={newKB.title}
                        onChange={(e) => setNewKB({ ...newKB, title: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Mô tả"
                        fullWidth
                        multiline
                        rows={3}
                        value={newKB.description}
                        onChange={(e) => setNewKB({ ...newKB, description: e.target.value })}
                    />
                    <Button variant="outlined" component="label" sx={{ mt: 2, color: '#000000', borderColor: '#000000', '&:hover': { backgroundColor: '#f0f0f0', borderColor: '#000000' } }}>
                        Chọn file
                        <input
                            type="file"
                            hidden
                            accept=".csv,application/pdf"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const validTypes = ["text/csv", "application/pdf"];
                                    const validExtensions = [".csv", ".pdf"];
                                    const isValid =
                                        validTypes.includes(file.type) ||
                                        validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

                                    if (isValid) {
                                        setNewKB({ ...newKB, file });
                                    } else {
                                        setMessage({ text: "Chỉ cho phép upload file .csv hoặc .pdf", variant: "error" });
                                        e.target.value = null;
                                    }
                                }
                            }}
                        />
                    </Button>
                    {newKB.file && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            {newKB.file.name}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button sx={{ color: '#666666' }} onClick={handleCloseAddKB}>Hủy</Button>
                    <Button
                        variant="contained"
                        onClick={handleAddKB}
                        disabled={uploading}
                        sx={{ backgroundColor: '#000000', color: '#ffffff', '&:hover': { backgroundColor: '#333333' } }}
                    >
                        {uploading ? "Đang lưu..." : "Thêm"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Admin;