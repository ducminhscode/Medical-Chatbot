import { useEffect, useReducer } from "react";
import MyUserReducer from './reducers/MyUserReducer';
import { MyDispatchContext, MyUserContext } from "./configs/Contexts";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./components/Home";

function App() {
  const [user, dispatch] = useReducer(MyUserReducer, null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      dispatch({ type: "login", payload: JSON.parse(savedUser) });
    }
  }, []);

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
