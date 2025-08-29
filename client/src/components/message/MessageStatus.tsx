import { getMessageStatus } from "../../api";
import {
  ReduxMessage,
  MessageStatus as MessageStatusType,
} from "../../store/reducers/messageListReducer";
import { ReduxParticipant } from "../../store/reducers/participantsReducer";
import { useEffect, useState } from "react";
import DeliveredIcon from "../icons/Delivered";
import SendingIcon from "../icons/Sending";
import FailedIcon from "../icons/Failed";
import ReadIcon from "../icons/Read";

type MessageStatusProps = {
  message: ReduxMessage;
  channelParticipants: ReduxParticipant[];
};

type MessageStatuses = {
  [MessageStatusType.Delivered]?: number;
  [MessageStatusType.Read]?: number;
  [MessageStatusType.Failed]?: number;
  [MessageStatusType.Sending]?: number;
  [MessageStatusType.None]?: number;
  [MessageStatusType.Sent]?: number;
};

const statusStyle = {
  display: "inline-block",
  verticalAlign: "middle",
};

const statusIconStyle = {};

const MessageStatus: React.FC<MessageStatusProps> = (props) => {
  const [status, setStatus] = useState<MessageStatuses>({});

  useEffect(() => {
    let cancelled = false;

    getMessageStatus(props.message, props.channelParticipants).then(
      (receipt) => {
        if (!cancelled) {
          setStatus(receipt);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [props.channelParticipants, props.message]);

  return (
    <>
      {status[MessageStatusType.Delivered] ? (
        <>
          <DeliveredIcon
            style={{ ...statusStyle, ...statusIconStyle }}
            color="green"
          />
          {props.channelParticipants.length > 2 && (
            <span style={statusStyle}>
              {status[MessageStatusType.Delivered]}
            </span>
          )}
        </>
      ) : null}
      {status[MessageStatusType.Sent] ? (
        <>
          <DeliveredIcon
            style={{ ...statusStyle, ...statusIconStyle }}
            color="green"
          />
          {props.channelParticipants.length > 2 && (
            <span style={statusStyle}>
              {status[MessageStatusType.Delivered]}
            </span>
          )}
        </>
      ) : null}
      {status[MessageStatusType.Sending] ? (
        <>
          <SendingIcon style={{ ...statusStyle, ...statusIconStyle }} />
        </>
      ) : null}
      {status[MessageStatusType.None] ? (
        <>
          <SendingIcon style={{ ...statusStyle, ...statusIconStyle }} />
        </>
      ) : null}

      {status[MessageStatusType.Failed] ? (
        <>
          <FailedIcon
            style={{ ...statusStyle, ...statusIconStyle }}
            color="red"
          />
          {props.channelParticipants.length > 2 && (
            <span style={statusStyle}>{status[MessageStatusType.Failed]}</span>
          )}
        </>
      ) : null}

      {status[MessageStatusType.Read] ? (
        <>
          <ReadIcon
            style={{ ...statusStyle, ...statusIconStyle }}
            color="green"
          />
          {props.channelParticipants.length > 2 && (
            <span style={statusStyle}>{status[MessageStatusType.Read]}</span>
          )}
        </>
      ) : null}
    </>
  );
};

export { MessageStatus };
