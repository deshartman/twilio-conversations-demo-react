import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { bindActionCreators } from "redux";
import { ReactElement } from "react";

import { Box, Spinner } from "@twilio-paste/core";

import Login from "./login/login";
import AppContainer from "./AppContainer";
import { actionCreators, AppState } from "../store";
import { getToken, getProxyNumber, ProxyNumbers } from "../api";

// TEMP LOGGING - Remove after testing
const tempLogProxyFetch = (proxyNumbers: ProxyNumbers) => {
  console.log("=== PROXY NUMBERS FETCHED ===");
  console.log("SMS Proxy Number:", proxyNumbers.smsProxyNumber);
  console.log("WhatsApp Proxy Number:", proxyNumbers.whatsappProxyNumber);
  console.log("=============================");
};

function App(): ReactElement {
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const { login, setProxyNumber } = bindActionCreators(
    actionCreators,
    dispatch
  );
  const token = useSelector((state: AppState) => state.token);

  const username = localStorage.getItem("username") ?? "";
  const password = localStorage.getItem("password") ?? "";
  const friendlyName = localStorage.getItem("friendlyName") ?? "";

  useEffect(() => {
    if (username.length > 0 && password.length > 0) {
      Promise.all([
        getToken(username, password, friendlyName),
        getProxyNumber(),
      ])
        .then(([token, proxyNumbers]) => {
          tempLogProxyFetch(proxyNumbers); // TEMP LOGGING
          login(token);
          setProxyNumber(proxyNumbers);
        })
        .catch((error) => {
          console.error("Failed to fetch token or config:", error);
          localStorage.setItem("username", "");
          localStorage.setItem("password", "");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  const setToken = async (token: string) => {
    login(token);
    try {
      const proxyNumbers = await getProxyNumber();
      tempLogProxyFetch(proxyNumbers); // TEMP LOGGING
      setProxyNumber(proxyNumbers);
    } catch (error) {
      console.error("Failed to fetch proxy numbers:", error);
    }
    setLoading(false);
  };

  if ((!token && !loading) || !username || !password) {
    return <Login setToken={setToken} />;
  }

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        position="absolute"
        height="100%"
        width="100%"
      >
        <Spinner size="sizeIcon110" decorative={false} title="Loading" />
      </Box>
    );
  }

  return <AppContainer />;
}

export default App;
