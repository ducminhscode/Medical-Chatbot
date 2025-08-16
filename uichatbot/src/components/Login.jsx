import React, { useState, useContext } from "react";
import { TextField, Button, Container, Typography, Box, Alert, Link, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import APIs, { authApis, endpoints } from "../configs/APIs";
import { MyDispatchContext } from "../configs/Contexts";
import { useNavigate, useLocation } from "react-router-dom";
import cookie from 'react-cookies';

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const dispatch = useContext(MyDispatchContext);
    const navigate = useNavigate();
    const location = useLocation();
    const success = location.state?.success || "";

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        try {
            let tokenRes = await APIs.post(endpoints["login"], {
                username,
                password,
                client_id: "YEBalsmQZJ9lzHqFCdoXsYwi8HuosizwTPpfl0wd",
                client_secret: "xSIGHpq7XJpFf9Jju6auZ1OjwPgPfWcskwKuPkoqnDnLNeKLqD1cOWGFBNsBBs8ideQK3XUW5dcNH1WfVTG8F1Rd2g8tElmuNiRkEtWUXrJc5pXBnLIjb4X9DXOVWhQu",
                grant_type: "password",
            });

            const cookieOptions = {
                path: '/'
            };

            const accessToken = tokenRes.data.access_token;

            cookie.save("access_token", accessToken, cookieOptions);

            let userRes = await authApis().get(endpoints["current_user"]);

            dispatch({
                type: "login",
                payload: userRes.data,
            });
            navigate("/home");
        } catch (err) {
            console.error(err);
            setError("Sai tên đăng nhập hoặc mật khẩu!");
        }
    };

    const handleTogglePassword = () => {
        setShowPassword((prev) => !prev);
    };

    return (
        <Box sx={{ backgroundColor: "white", minHeight: "100vh", position: "relative" }}>
            <Box sx={{ position: "absolute", top: 20, left: 30 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "1.25rem" }}>
                    <Link href="/" underline="none" color="inherit">
                        ChatMDC
                    </Link>
                </Typography>
            </Box>

            <Container
                maxWidth="xs"
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    minHeight: "100vh",
                    textAlign: "center",
                }}
            >
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Chào mừng trở lại
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: "50px" }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2, borderRadius: "50px" }}>{success}</Alert>}

                <Box component="form" onSubmit={handleLogin}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        label="Tên đăng nhập"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                        InputLabelProps={{
                            sx: {
                                "& .MuiInputLabel-asterisk": { display: "none" },
                            },
                        }}
                    />
                    <TextField
                        fullWidth
                        variant="outlined"
                        type={showPassword ? "text" : "password"}
                        label="Mật khẩu"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={handleTogglePassword} edge="end">
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                        InputLabelProps={{
                            sx: {
                                "& .MuiInputLabel-asterisk": { display: "none" },
                            },
                        }}
                    />
                    <Button
                        variant="contained"
                        type="submit"
                        fullWidth
                        sx={{
                            mt: 1,
                            borderRadius: "50px",
                            paddingY: "10px",
                            backgroundColor: "black",
                            "&:hover": { backgroundColor: "#333" },
                            textTransform: "none",
                        }}
                    >
                        Đăng nhập
                    </Button>
                </Box>

                <Typography variant="body2" align="center" sx={{ mt: 3 }}>
                    Không có tài khoản?{" "}
                    <Link href="/register" underline="hover">
                        Đăng ký
                    </Link>
                </Typography>
            </Container>
        </Box>
    );
}