import { ModalBody, Box } from "@twilio-paste/core";
import { RefObject } from "react";
import ModalInputField from "./ModalInputField";
import AddParticipantFooter from "./addParticipantFooter";
import { ActionName } from "../../types";
import ConvoModal from "./ConvoModal";

interface AddSlackParticipantModalProps {
  email: string;
  friendlyName: string;
  isModalOpen: boolean;
  title: string;
  setEmail: (email: string) => void;
  setFriendlyName: (friendlyName: string) => void;
  error: string;
  emailInputRef: RefObject<HTMLInputElement>;
  handleClose: () => void;
  onBack: () => void;
  action: () => void;
}

const AddSlackParticipantModal: React.FC<AddSlackParticipantModalProps> = (
  props: AddSlackParticipantModalProps
) => {
  const addSlackParticipant = "Add Slack Participant";
  const slackEmailLabel = "Slack Email Address";
  const slackHelpText =
    "Enter the email address of the Slack user (e.g., someuser@somedomain.com)";
  const friendlyNameLabel = "Friendly Name (Optional)";
  const friendlyNameHelpText =
    "Override the display name (defaults to Slack profile name)";

  return (
    <>
      <ConvoModal
        handleClose={() => props.handleClose()}
        isModalOpen={props.isModalOpen}
        title={props.title}
        modalBody={
          <ModalBody>
            <h3>{addSlackParticipant}</h3>
            <Box
              as="form"
              onKeyPress={async (e) => {
                if (e.key === "Enter") {
                  if (props.action) {
                    e.preventDefault();
                    props.action();
                  }
                }
              }}
            >
              <ModalInputField
                isFocused={true}
                label={slackEmailLabel}
                input={props.email}
                placeholder="user@example.com"
                onChange={props.setEmail}
                error={props.error}
                help_text={slackHelpText}
              />
              <ModalInputField
                label={friendlyNameLabel}
                input={props.friendlyName}
                placeholder="Display Name"
                onChange={props.setFriendlyName}
                error=""
                help_text={friendlyNameHelpText}
              />
            </Box>
          </ModalBody>
        }
        modalFooter={
          <AddParticipantFooter
            isSaveDisabled={!props.email || !!props.error}
            actionName={ActionName.Save}
            onBack={() => {
              props.onBack();
            }}
            action={props.action}
          />
        }
      />
    </>
  );
};

export default AddSlackParticipantModal;
