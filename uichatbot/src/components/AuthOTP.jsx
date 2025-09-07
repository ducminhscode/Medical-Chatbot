import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TextField, Button, Container, Typography, Box, Link, Alert, CircularProgress } from "@mui/material";
import { endpoints, authApis } from "../configs/APIs";

export default function AuthOTP() {
    const [otp, setOtp] = useState("");
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || "";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            await authApis().post(endpoints['verify_otp'], { email, otp });
            setMessage("Mã OTP xác thực thành công!");
            setTimeout(() => {
                navigate('/change-password', { state: { email, otp } });
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
                    Xác thực OTP
                </Typography>
                <Typography variant="body1" gutterBottom>
                    Hãy nhập mã OTP đã được gửi đến email của bạn
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
                        label="OTP của bạn"
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        sx={{ mb: 2, mt: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
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
                        {loading ? <CircularProgress size={20} sx={{ display: 'block', margin: '0 auto' }} /> : "Tiếp tục"}
                    </Button>
                </Box>
            </Container>
        </Box>
    );
}