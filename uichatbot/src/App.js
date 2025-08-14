import { useEffect, useReducer, useState } from "react";
import MyUserReducer from './reducers/MyUserReducer';
import { MyDispatchContext, MyUserContext } from "./configs/Contexts";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./components/Home";
import cookie from 'react-cookies';
import { authApis, endpoints } from "./configs/APIs";

function App() {
  const [user, dispatch] = useReducer(MyUserReducer, null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = cookie.load("access_token");
    if (token) {
      authApis().get(endpoints['current_user'])
        .then(res => {
          dispatch({
            type: 'login',
            payload: res.data,
          });
        })
        .catch(err => {
          console.error('Failed to load user data:', err);
          cookie.remove('access_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div></div>;
  }

  return (
    <MyUserContext.Provider value={user}>
      <MyDispatchContext.Provider value={dispatch}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/home"
              element={user ? <Home /> : <Navigate to="/" replace />}
            />
          </Routes>
        </BrowserRouter>
      </MyDispatchContext.Provider>
    </MyUserContext.Provider>
  );
}

export default App;