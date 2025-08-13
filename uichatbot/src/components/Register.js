import { useState, useEffect } from "react";
import { TextField, Button, Container, Typography, Box, Alert, Avatar, Link, FormControl, InputLabel, Select, MenuItem, IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import APIs, { endpoints } from "../configs/APIs";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const [firstName, setFirstname] = useState("");
    const [lastName, setLastname] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isMale, setIsMale] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [avatar, setAvatar] = useState(null);
    const [previewAvatar, setPreviewAvatar] = useState("");

    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        return () => {
            if (previewAvatar && previewAvatar.startsWith("blob:")) {
                URL.revokeObjectURL(previewAvatar);
            }
        };
    }, [previewAvatar]);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Vui lòng chọn file hình ảnh");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError("File ảnh quá lớn (tối đa 5MB)");
            return;
        }

        setAvatar(file);
        setPreviewAvatar(URL.createObjectURL(file));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("first_name", firstName);
            formData.append("last_name", lastName);
            formData.append("username", username);
            formData.append("email", email);
            formData.append("password", password);
            formData.append("date_of_birth", dateOfBirth);
            formData.append("is_male", isMale);
            if (avatar) formData.append("avatar", avatar);

            await APIs.post(endpoints["register"], formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            navigate("/", { state: { success: "Đăng ký thành công" } });
            setFirstname("");
            setLastname("");
            setUsername("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setDateOfBirth("");
            setIsMale("");
            setAvatar(null);
            setPreviewAvatar("");
        } catch (err) {
            setError("Đăng ký thất bại. Kiểm tra lại thông tin.");
        }
    };

    const handleTogglePassword = () => {
        setShowPassword((prev) => !prev);
    };

    const handleToggleConfirmPassword = () => {
        setShowConfirmPassword((prev) => !prev);
    };

    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const maxDateString = maxDate.toISOString().split("T")[0];

    return (
        <Box sx={{ backgroundColor: "white", minHeight: "100vh", position: "relative" }}>
            <Box sx={{ position: "absolute", top: 20, left: 30 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "1.25rem" }}>
                    <Link href="/" underline="none" color="inherit">
                        ChatMDC
                    </Link>
                </Typography>
            </Box>
            <Container maxWidth="xs" sx={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh", textAlign: "center" }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                    Tạo một tài khoản
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: "50px" }}>{error}</Alert>}

                <Box component="form" onSubmit={handleRegister}>
                    <Box sx={{ display: "grid", justifyContent: "center", mb: 2 }}>
                        <input
                            accept="image/*"
                            id="avatar-upload"
                            type="file"
                            style={{ display: "none" }}
                            onChange={handleAvatarChange}
                        />
                        <label htmlFor="avatar-upload" style={{ cursor: "pointer" }}>
                            <Avatar src={previewAvatar} sx={{ width: 80, height: 80 }} />
                        </label>
                    </Box>

                    <TextField
                        fullWidth
                        variant="outlined"
                        label="Họ"
                        required
                        value={lastName}
                        onChange={(e) => setLastname(e.target.value)}
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
                        label="Tên"
                        required
                        value={firstName}
                        onChange={(e) => setFirstname(e.target.value)}
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
                        type="date"
                        label="Ngày sinh"
                        required
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        sx={{
                            mb: 2,
                            "& .MuiOutlinedInput-root": { borderRadius: "50px" },
                        }}
                        InputLabelProps={{
                            shrink: true, sx: {
                                "& .MuiInputLabel-asterisk": { display: "none" },
                            },
                        }}
                        InputProps={{
                            inputProps: { max: maxDateString },
                        }}
                    />

                    <FormControl fullWidth sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}>
                        <InputLabel id="gender-label">Giới tính</InputLabel>
                        <Select
                            labelId="gender-label"
                            value={isMale}
                            label="Giới tính"
                            required
                            onChange={(e) => setIsMale(e.target.value)}
                            sx={{ borderRadius: "50px", textAlign: "left" }}
                        >
                            <MenuItem value="1">Nam</MenuItem>
                            <MenuItem value="0">Nữ</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        variant="outlined"
                        label="Email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                        value={password}
                        required
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

                    <TextField
                        fullWidth
                        variant="outlined"
                        type={showConfirmPassword ? "text" : "password"}
                        label="Xác nhận mật khẩu"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={handleToggleConfirmPassword} edge="end">
                                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
                        Đăng ký
                    </Button>
                </Box>

                <Typography variant="body2" align="center" sx={{ mt: 3, mb: 3 }}>
                    Đã có tài khoản?{" "}
                    <Link href="/" underline="hover">
                        Đăng nhập
                    </Link>
                </Typography>
            </Container>
        </Box>
    );
}