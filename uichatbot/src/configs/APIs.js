import axios from "axios";

const BASE_URL = 'http://127.0.0.1:8000/';

export const endpoints = {
    'login': '/o/token/',
    'register': '/register/',
    'current_user': 'user/current/',
}

export default axios.create({
    baseURL: BASE_URL
})