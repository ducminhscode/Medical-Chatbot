import { useContext, useEffect, useState } from "react";
import { Alert, Avatar, Box, Button, CircularProgress, Container, FormControl, IconButton, InputAdornment, InputLabel, Link, MenuItem, Select, Tab, Tabs, TextField, Typography, } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { MyDispatchContext, MyUserContext } from "../configs/Contexts";
import { authApis, endpoints } from "../configs/APIs";

const Profile = () => {
    const user = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);

    const [profile, setProfile] = useState({
        first_name: "",
        last_name: "",
        email: "",
        date_of_birth: "",
        is_male: "",
        password: "",
        confirmPassword: "",
        currentPassword: "",
    });
    const [avatar, setAvatar] = useState(null);
    const [previewAvatar, setPreviewAvatar] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", variant: "" });
    const [activeTab, setActiveTab] = useState("profile");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setProfile({
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
                date_of_birth: user.date_of_birth || "",
                is_male: user.is_male === 1 ? "1" : "0",
                password: "",
                confirmPassword: "",
                currentPassword: "",
            });
            setPreviewAvatar(user.avatar.startsWith('image/upload/https://res.cloudinary.com/dp9b0dkkt/') ? user.avatar.replace('image/upload/', '') : `https://res.cloudinary.com/dp9b0dkkt/${user.avatar}`);
        }
    }, [user]);

    useEffect(() => {
        return () => {
            if (previewAvatar && previewAvatar.startsWith("blob:")) {
                URL.revokeObjectURL(previewAvatar);
            }
        };
    }, [previewAvatar]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile((prev) => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                setMessage({ text: "Vui lòng chọn file hình ảnh", variant: "error" });
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setMessage({ text: "File ảnh quá lớn (tối đa 5MB)", variant: "error" });
                return;
            }
            setAvatar(file);
            setPreviewAvatar(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: "", variant: "" });

        try {
            const formData = new FormData();
            formData.append("first_name", profile.first_name);
            formData.append("last_name", profile.last_name);
            formData.append("email", profile.email);
            formData.append("date_of_birth", profile.date_of_birth);
            formData.append("is_male", profile.is_male);
            if (avatar) formData.append("avatar", avatar);

            const res = await authApis().patch(endpoints["profile"], formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            dispatch({
                type: "login",
                payload: res.data,
            });

            setMessage({ text: "Cập nhật thông tin thành công", variant: "success" });
            setAvatar(null);
        } catch (error) {
            setMessage({
                text: error.response?.data?.errorMessage || "Có lỗi xảy ra khi cập nhật thông tin",
                variant: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: "", variant: "" });

        if (profile.password !== profile.confirmPassword) {
            setMessage({ text: "Mật khẩu không khớp", variant: "error" });
            setLoading(false);
            return;
        }

        try {
            await authApis().patch(endpoints["change_password"], {
                current_password: profile.currentPassword,
                new_password: profile.password,
                confirm_password: profile.confirmPassword,
            });

            setMessage({ text: "Đổi mật khẩu thành công", variant: "success" });
            setProfile((prev) => ({
                ...prev,
                password: "",
                confirmPassword: "",
                currentPassword: "",
            }));
        } catch (error) {
            setMessage({
                text: "Mật khẩu hiện tại không đúng",
                variant: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const maxDateString = maxDate.toISOString().split("T")[0];

    return (
        <Box sx={{ backgroundColor: "white", minHeight: "100vh", position: "relative" }}>
            <Box sx={{ position: "absolute", top: 20, left: 30 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "1.25rem" }}>
                    <Link href="/home" underline="none" color="inherit">
                        ChatMDC
                    </Link>
                </Typography>
            </Box>
            <Container maxWidth="sm" sx={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                    Thông tin người dùng
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
                    <Tab label="Thông tin" value="profile" />
                    <Tab label="Đổi mật khẩu" value="password" />
                </Tabs>

                <Box component="form" onSubmit={activeTab === "profile" ? handleSubmit : handlePasswordChange}>
                    {activeTab === "profile" ? (
                        <>
                            <Box sx={{ display: "grid", justifyContent: "center", mb: 3 }}>
                                <Box sx={{ position: "relative", display: "inline-block" }}>
                                    <input
                                        accept="image/*"
                                        id="avatar-upload"
                                        type="file"
                                        style={{ display: "none" }}
                                        onChange={handleAvatarChange}
                                    />
                                    <label htmlFor="avatar-upload" style={{ cursor: "pointer", justifyContent: "center", display: "flex" }}>
                                        <Avatar src={previewAvatar} sx={{ width: 80, height: 80 }} />
                                    </label>
                                </Box>
                                <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>
                                    {user?.first_name} {user?.last_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Tên tài khoản: {user?.username}
                                </Typography>
                            </Box>

                            <TextField
                                fullWidth
                                variant="outlined"
                                label="Họ"
                                required
                                name="last_name"
                                value={profile.last_name}
                                onChange={handleChange}
                                sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                                InputLabelProps={{ sx: { "& .MuiInputLabel-asterisk": { display: "none" } } }}
                            />

                            <TextField
                                fullWidth
                                variant="outlined"
                                label="Tên"
                                required
                                name="first_name"
                                value={profile.first_name}
                                onChange={handleChange}
                                sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                                InputLabelProps={{ sx: { "& .MuiInputLabel-asterisk": { display: "none" } } }}
                            />

                            <TextField
                                fullWidth
                                variant="outlined"
                                type="date"
                                label="Ngày sinh"
                                required
                                name="date_of_birth"
                                value={profile.date_of_birth}
                                onChange={handleChange}
                                sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                                InputLabelProps={{ shrink: true, sx: { "& .MuiInputLabel-asterisk": { display: "none" } } }}
                                InputProps={{ inputProps: { max: maxDateString } }}
                            />

                            <FormControl fullWidth sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}>
                                <InputLabel id="gender-label">Giới tính</InputLabel>
                                <Select
                                    labelId="gender-label"
                                    name="is_male"
                                    value={profile.is_male}
                                    label="Giới tính"
                                    required
                                    onChange={handleChange}
                                    sx={{ borderRadius: "50px", textAlign: "left" }}>
                                    <MenuItem value="1">Nam</MenuItem>
                                    <MenuItem value="0">Nữ</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                variant="outlined"
                                label="Email"
                                type="email"
                                name="email"
                                value={profile.email}
                                sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                                disabled={true}
                            />

                            <Button
                                variant="contained"
                                type="submit"
                                fullWidth
                                disabled={loading}
                                sx={{ mt: 1, borderRadius: "50px", mb: 3, paddingY: "10px", backgroundColor: "black", "&:hover": { backgroundColor: "#333" }, textTransform: "none" }}
                            >
                                {loading ? <CircularProgress size={24} sx={{ color: '#666666' }} /> : "Cập nhật thông tin"}
                            </Button>
                        </>
                    ) : (
                        <>
                            <TextField
                                fullWidth
                                variant="outlined"
                                type={showCurrentPassword ? "text" : "password"}
                                label="Mật khẩu hiện tại"
                                required
                                name="currentPassword"
                                value={profile.currentPassword}
                                onChange={handleChange}
                                sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowCurrentPassword((prev) => !prev)} edge="end">
                                                {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                InputLabelProps={{ sx: { "& .MuiInputLabel-asterisk": { display: "none" } } }}
                            />

                            <TextField
                                fullWidth
                                variant="outlined"
                                type={showPassword ? "text" : "password"}
                                label="Mật khẩu mới"
                                required
                                name="password"
                                value={profile.password}
                                onChange={handleChange}
                                sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                InputLabelProps={{ sx: { "& .MuiInputLabel-asterisk": { display: "none" } } }}
                            />

                            <TextField
                                fullWidth
                                variant="outlined"
                                type={showConfirmPassword ? "text" : "password"}
                                label="Xác nhận mật khẩu"
                                required
                                name="confirmPassword"
                                value={profile.confirmPassword}
                                onChange={handleChange}
                                sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "50px" } }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowConfirmPassword((prev) => !prev)} edge="end">
                                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                InputLabelProps={{ sx: { "& .MuiInputLabel-asterisk": { display: "none" } } }}
                                error={profile.password !== profile.confirmPassword && profile.confirmPassword !== ""}
                                helperText={profile.password !== profile.confirmPassword && profile.confirmPassword !== "" ? "Mật khẩu không khớp" : ""}
                            />

                            <Button
                                variant="contained"
                                type="submit"
                                fullWidth
                                disabled={loading}
                                sx={{ mt: 1, borderRadius: "50px", paddingY: "10px", backgroundColor: "black", "&:hover": { backgroundColor: "#333" }, textTransform: "none" }}
                            >
                                {loading ? <CircularProgress size={24} sx={{ color: '#666666' }} /> : "Đổi mật khẩu"}
                            </Button>
                        </>
                    )}
                </Box>
            </Container>
        </Box>
    );
};

export default Profile;