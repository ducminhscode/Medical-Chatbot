import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { Box, Tab, Typography, Alert, CircularProgress, List, Divider, ListItemText, Paper, Link, Container, Tabs } from "@mui/material";
import { authApis, endpoints } from "../configs/APIs";
import { useNavigate } from "react-router-dom";
import cookie from 'react-cookies';
import { MyUserContext } from "../configs/Contexts";

const Admin = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ text: "", variant: "" });
    const [activeTab, setActiveTab] = useState("users");
    const [nextPage, setNextPage] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef(null);
    const navigate = useNavigate();
    const user = useContext(MyUserContext);

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

    useEffect(() => {
        if (user && user.role === 1) {
            setUsers([]);
            fetchUsers(endpoints['all_users'], false);
        } else {
            navigate("/");
        }
    }, [user, fetchUsers, navigate]);

    useEffect(() => {
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
    }, [nextPage, hasMore, loading, fetchUsers]);

    return (
        <Box sx={{ p: 2, backgroundColor: '#ffffff', minHeight: '100vh', position: 'relative' }}>
            <Box sx={{ position: "absolute", top: 20, left: 30 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "1.25rem" }}>
                    <Link href="/home" underline="none" color="inherit">
                        ChatMDC
                    </Link>
                </Typography>
            </Box>

            <Container maxWidth="sm" sx={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh", textAlign: "center" }}>
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
                            <Paper sx={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '16px' }}>
                                <List>
                                    {users.map((user) => (
                                        <div key={user.id}>
                                            <ListItemText
                                                primary={user.username}
                                                secondary={`${user.email} - ${user.role === 1 ? "Admin" : "User"}`}
                                            />
                                            <Divider />
                                        </div>
                                    ))}
                                    {hasMore && (
                                        <div ref={observerRef} style={{ height: '20px' }}>
                                            {loading && <CircularProgress size={20} sx={{ display: 'block', margin: '0 auto' }} />}
                                        </div>
                                    )}
                                </List>
                            </Paper>
                        </>
                    ) : (
                    <>

                    </>
                )}
                </Box>
            </Container>
        </Box>
    );
};

export default Admin;