import axios from "axios";
import cookie from 'react-cookies';

const BASE_URL = 'http://127.0.0.1:8000/';

export const endpoints = {
    'login': '/o/token/',
    'register': '/register/',

    'current_user': '/user/current/',
    'all_users': '/user/all-users/',
    'change_password': '/user/change-password/',
    'profile': '/user/profile/',
    'user_by_id': (id) => `/user/by-id/${id}/`,
    'user_status': (id) => `/user/status/${id}/`,

    'knowledge': '/knowledge/',
    'knowledge_detail': (id) => `/knowledge/${id}/`,

    'chat_sessions': '/chat-sessions/',
    'chat_session_detail': (id) => `/chat-sessions/${id}/`,

    'messages': (session_id) => `/chat-sessions/${session_id}/messages/`,

    'send_otp': 'user/send-otp/',
    'verify_otp': 'user/verify-otp/',
    'reset_password': 'user/reset-password/',
}

export const authApis = () => {
    return axios.create({
        baseURL: BASE_URL,
        headers: {
            "Authorization": `Bearer ${cookie.load('access_token')}`,
            'Content-Type': 'application/json'
        }
    });
}

export default axios.create({
    baseURL: BASE_URL
});