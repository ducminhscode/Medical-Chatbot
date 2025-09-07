import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TextField, Button, Container, Typography, Box, Link, Alert, CircularProgress } from "@mui/material";
import { endpoints, authApis } from "../configs/APIs";

export default function ChangePassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || "";
    const otp = location.state?.otp || "";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        if (password !== confirmPassword) {
            setError("Mật khẩu và xác nhận mật khẩu không khớp.");
            setLoading(false);
            return;
        }

        try {
            const response = await authApis().post(endpoints['reset_password'], {
                email,
                otp,
                new_password: password,
                confirm_password: confirmPassword
            });
            setMessage(response.data.message);
            setTimeout(() => {
                navigate('/');
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.error || "Đã có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ backgroundColor: "white", minHeight: "100vh", position: "relative" }}>
            <Box sx={{ position: "absolute", top: 20, left: 30 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "1.25rem" }}>
                    <Link href="/home" underline="none" color="inherit">
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
                    Đổi mật khẩu
                </Typography>

                {message && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        {message}
                    </Alert>
                )}
                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        type="password"
                        label="Mật khẩu mới"
                        required
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        sx={{ mb: 2, mt: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                        InputLabelProps={{ sx: { "& .MuiInputLabel-asterisk": { display: "none" } } }}
                    />
                    <TextField
                        fullWidth
                        variant="outlined"
                        type="password"
                        label="Xác nhận mật khẩu"
                        required
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                        InputLabelProps={{ sx: { "& .MuiInputLabel-asterisk": { display: "none" } } }}
                    />
                    <Button
                        variant="contained"
                        type="submit"
                        fullWidth
                        disabled={loading}
                        sx={{
                            mt: 1,
                            borderRadius: "50px",
                            paddingY: "10px",
                            backgroundColor: "black",
                            "&:hover": { backgroundColor: "#333" },
                            textTransform: "none",
                        }}
                    >
                        {loading ? <CircularProgress size={20} sx={{ display: 'block', margin: '0 auto' }} /> : "Xác nhận"}
                    </Button>
                </Box>
            </Container>
        </Box>
    );
}