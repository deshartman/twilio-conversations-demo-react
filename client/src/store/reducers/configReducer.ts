import { ActionType } from "../action-types";
import { Action } from "../actions";
import { ProxyNumbers } from "../../api";

const initialState: ProxyNumbers = {
  smsProxyNumber: "",
  whatsappProxyNumber: "",
};

const reducer = (
  state: ProxyNumbers = initialState,
  action: Action
): ProxyNumbers => {
  switch (action.type) {
    case ActionType.SET_PROXY_NUMBER:
      return action.payload;
    default:
      return state;
  }
};

export default reducer;
