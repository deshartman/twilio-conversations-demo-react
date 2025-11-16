import React, { useState, createRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { bindActionCreators } from "redux";

import { Client } from "@twilio/conversations";

import SettingsMenu from "./SettingsMenu";
import ManageParticipantsModal from "../modals/manageParticipantsModal";
import { Content } from "../../types";
import {
  addNonChatParticipant,
  addUserAsParticipant,
  addSlackParticipant,
  removeParticipant,
} from "../../api";
import AddChatParticipantModal from "../modals/addChatMemberModal";
import AddSMSParticipantModal from "../modals/addSMSParticipantModal";
import AddWhatsAppParticipantModal from "../modals/addWhatsAppParticipant";
import AddAIAgentModal from "../modals/addAIAgentModal";
import AddSlackParticipantModal from "../modals/addSlackParticipantModal";
import { actionCreators } from "../../store";
import ActionErrorModal from "../modals/ActionErrorModal";
import {
  CONVERSATION_MESSAGES,
  ERROR_MODAL_MESSAGES,
  SMS_PREFIX,
  WHATSAPP_PREFIX,
} from "../../constants";
import {
  successNotification,
  unexpectedErrorNotification,
} from "../../helpers";
import { ReduxConversation } from "../../store/reducers/convoReducer";
import {
  getSdkConversationObject,
  getSdkParticipantObject,
} from "../../conversations-objects";
import { ReduxParticipant } from "../../store/reducers/participantsReducer";
import { isValidPhoneNumber } from "libphonenumber-js";
import { AppState } from "../../store";
import { getTranslation } from "../../utils/localUtils";
import { formatPhoneNumber } from "../../utils/phoneUtils";

// TEMP LOGGING - Remove after testing
const tempLogProxyUsage = (
  type: string,
  participantNumber: string,
  proxyNumber: string
) => {
  console.log(`=== ADDING ${type} PARTICIPANT ===`);
  console.log("Participant Number:", participantNumber);
  console.log("Proxy Number from Redux:", proxyNumber);
  console.log("================================");
};

interface SettingsProps {
  participants: ReduxParticipant[];
  client?: Client;
  convo: ReduxConversation;
  isManageParticipantOpen: boolean;
  setIsManageParticipantOpen: (open: boolean) => void;
}

const invalidPhoneNumberErrorMessage = "Invalid phone number";
const Settings: React.FC<SettingsProps> = (props: SettingsProps) => {
  const handleParticipantClose = () => props.setIsManageParticipantOpen(false);

  const [isAddChatOpen, setIsAddChatOpen] = useState(false);
  // TODO: move to app loading state
  // const [isLoading, setLoading] = useState(false);
  const handleChatOpen = () => setIsAddChatOpen(true);
  const handleChatClose = () => setIsAddChatOpen(false);

  const [isAddSMSOpen, setIsAddSMSOpen] = useState(false);
  const handleSMSOpen = () => setIsAddSMSOpen(true);
  const handleSMSClose = () => setIsAddSMSOpen(false);

  const [isAddWhatsAppOpen, setIsAddWhatsAppOpen] = useState(false);
  const handleWhatsAppOpen = () => setIsAddWhatsAppOpen(true);
  const handleWhatsAppClose = () => setIsAddWhatsAppOpen(false);

  const [isAddAIAgentOpen, setIsAddAIAgentOpen] = useState(false);
  const handleAIAgentOpen = () => setIsAddAIAgentOpen(true);
  const handleAIAgentClose = () => setIsAddAIAgentOpen(false);

  const [isAddSlackOpen, setIsAddSlackOpen] = useState(false);
  const handleSlackOpen = () => setIsAddSlackOpen(true);
  const handleSlackClose = () => setIsAddSlackOpen(false);

  const local = useSelector((state: AppState) => state.local);
  const proxyNumbers = useSelector((state: AppState) => state.proxyNumber);
  const manageParticipants = getTranslation(local, "manageParticipants");

  const [name, setName] = useState("");
  const [friendlyName, setFriendlyName] = useState("");
  const [error, setError] = useState("");

  const [showError, setErrorToShow] = useState<
    | {
        title: string;
        description: string;
      }
    | false
  >();
  const [errorData, setErrorData] = useState<
    | {
        message: string;
        code: number;
      }
    | undefined
  >();

  const nameInputRef = createRef<HTMLInputElement>();

  const dispatch = useDispatch();
  const { updateCurrentConversation, addNotifications } = bindActionCreators(
    actionCreators,
    dispatch
  );

  const sdkConvo = useMemo(
    () => getSdkConversationObject(props.convo),
    [props.convo.sid]
  );

  function emptyData() {
    setName("");
    setFriendlyName("");
    setError("");
  }

  function setErrors(errorText: string) {
    setError(errorText);
  }

  return (
    <>
      <SettingsMenu
        onParticipantListOpen={() => props.setIsManageParticipantOpen(true)}
        leaveConvo={async () => {
          try {
            await sdkConvo.leave();
            successNotification({
              message: CONVERSATION_MESSAGES.LEFT,
              addNotifications,
            });
            updateCurrentConversation("");
          } catch (e) {
            unexpectedErrorNotification(e.message, addNotifications);
          }
        }}
        conversation={props.convo}
        addNotifications={addNotifications}
      />
      <ActionErrorModal
        errorText={showError || ERROR_MODAL_MESSAGES.CHANGE_CONVERSATION_NAME}
        isOpened={!!showError}
        onClose={() => {
          setErrorToShow(false);
          setErrorData(undefined);
        }}
        error={errorData}
      />
      {props.isManageParticipantOpen && (
        <ManageParticipantsModal
          handleClose={handleParticipantClose}
          isModalOpen={props.isManageParticipantOpen}
          title={manageParticipants}
          participantsCount={props.participants.length}
          participantsList={props.participants}
          onClick={(content: Content) => {
            handleParticipantClose();
            switch (content) {
              case Content.AddSMS:
                handleSMSOpen();
                return null;
              case Content.AddWhatsApp:
                handleWhatsAppOpen();
                return null;
              case Content.AddChat:
                handleChatOpen();
                return null;
              case Content.AddAIAgent:
                handleAIAgentOpen();
                return null;
              case Content.AddSlack:
                handleSlackOpen();
                return null;
              default:
                return null;
            }
          }}
          onParticipantRemove={async (participant) => {
            await removeParticipant(
              sdkConvo,
              getSdkParticipantObject(participant),
              addNotifications
            );
          }}
        />
      )}
      {isAddSMSOpen && (
        <AddSMSParticipantModal
          name={name}
          friendlyName={friendlyName}
          isModalOpen={isAddSMSOpen}
          title={manageParticipants}
          setName={(name: string) => {
            const formattedName = formatPhoneNumber(name);
            setName(formattedName);
            setError(
              !isValidPhoneNumber(`+${formattedName}`)
                ? invalidPhoneNumberErrorMessage
                : ""
            );
          }}
          setFriendlyName={setFriendlyName}
          error={error}
          nameInputRef={nameInputRef}
          handleClose={() => {
            emptyData();
            handleSMSClose();
          }}
          onBack={() => {
            emptyData();
            handleSMSClose();
            props.setIsManageParticipantOpen(true);
          }}
          action={async () => {
            try {
              tempLogProxyUsage(
                "SMS",
                SMS_PREFIX + name,
                proxyNumbers.smsProxyNumber
              ); // TEMP LOGGING
              await addNonChatParticipant(
                SMS_PREFIX + name,
                proxyNumbers.smsProxyNumber,
                sdkConvo,
                addNotifications,
                friendlyName
              );
              emptyData();
              handleSMSClose();
            } catch (e) {
              setErrorData(e.body);
              setErrorToShow(ERROR_MODAL_MESSAGES.ADD_PARTICIPANT);
            }
          }}
        />
      )}
      {isAddWhatsAppOpen && (
        <AddWhatsAppParticipantModal
          name={name}
          friendlyName={friendlyName}
          isModalOpen={isAddWhatsAppOpen}
          title={manageParticipants}
          setName={(name: string) => {
            const formattedName = formatPhoneNumber(name);
            setName(formattedName);
            setError(
              !isValidPhoneNumber(`+${formattedName}`)
                ? invalidPhoneNumberErrorMessage
                : ""
            );
          }}
          setFriendlyName={setFriendlyName}
          error={error}
          nameInputRef={nameInputRef}
          handleClose={() => {
            emptyData();
            handleWhatsAppClose();
          }}
          onBack={() => {
            emptyData();
            handleWhatsAppClose();
            props.setIsManageParticipantOpen(true);
          }}
          action={async () => {
            try {
              tempLogProxyUsage(
                "WhatsApp",
                WHATSAPP_PREFIX + name,
                proxyNumbers.whatsappProxyNumber
              ); // TEMP LOGGING
              await addNonChatParticipant(
                WHATSAPP_PREFIX + name,
                "whatsapp:" + proxyNumbers.whatsappProxyNumber,
                sdkConvo,
                addNotifications,
                friendlyName
              );
              emptyData();
              handleWhatsAppClose();
            } catch (e) {
              setErrorData(e.body);
              setErrorToShow(ERROR_MODAL_MESSAGES.ADD_PARTICIPANT);
            }
          }}
        />
      )}
      {isAddChatOpen && (
        <AddChatParticipantModal
          name={name}
          friendlyName={friendlyName}
          isModalOpen={isAddChatOpen}
          title={manageParticipants}
          setName={(name: string) => {
            setName(name);
            setErrors("");
          }}
          setFriendlyName={setFriendlyName}
          error={error}
          nameInputRef={nameInputRef}
          handleClose={() => {
            emptyData();
            handleChatClose();
          }}
          onBack={() => {
            emptyData();
            handleChatClose();
            props.setIsManageParticipantOpen(true);
          }}
          action={async () => {
            try {
              await addUserAsParticipant(
                name.trim(),
                friendlyName.trim() || name.trim(),
                props.convo.sid,
                addNotifications
              );
              emptyData();
              handleChatClose();
            } catch (e) {
              setErrorData(e.body);
              setErrorToShow(ERROR_MODAL_MESSAGES.ADD_PARTICIPANT);
            }
          }}
        />
      )}
      {isAddAIAgentOpen && (
        <AddAIAgentModal
          name={name}
          isModalOpen={isAddAIAgentOpen}
          title={manageParticipants}
          setName={(name: string) => {
            setName(name);
            setErrors("");
          }}
          error={error}
          nameInputRef={nameInputRef}
          handleClose={() => {
            emptyData();
            handleAIAgentClose();
          }}
          onBack={() => {
            emptyData();
            handleAIAgentClose();
            props.setIsManageParticipantOpen(true);
          }}
          action={async () => {
            try {
              await addUserAsParticipant(
                "ASKAI-" + name.trim(),
                name.trim(),
                props.convo.sid,
                addNotifications
              );
              emptyData();
              handleAIAgentClose();
            } catch (e) {
              setErrorData(e.body);
              setErrorToShow(ERROR_MODAL_MESSAGES.ADD_PARTICIPANT);
            }
          }}
        />
      )}
      {isAddSlackOpen && (
        <AddSlackParticipantModal
          email={name}
          friendlyName={friendlyName}
          isModalOpen={isAddSlackOpen}
          title={manageParticipants}
          setEmail={(email: string) => {
            setName(email);
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (email && !emailRegex.test(email)) {
              setError("Invalid email format");
            } else {
              setError("");
            }
          }}
          setFriendlyName={setFriendlyName}
          error={error}
          emailInputRef={nameInputRef}
          handleClose={() => {
            emptyData();
            handleSlackClose();
          }}
          onBack={() => {
            emptyData();
            handleSlackClose();
            props.setIsManageParticipantOpen(true);
          }}
          action={async () => {
            try {
              await addSlackParticipant(
                name.trim(),
                props.convo.sid,
                addNotifications,
                friendlyName.trim() || undefined
              );
              emptyData();
              handleSlackClose();
            } catch (e) {
              setErrorData(e.body);
              setErrorToShow(ERROR_MODAL_MESSAGES.ADD_PARTICIPANT);
            }
          }}
        />
      )}
      {/* {isLoading ? (
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
      ) : null} */}
    </>
  );
};

export default Settings;
