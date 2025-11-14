import { ModalBody, Box } from "@twilio-paste/core";
import { RefObject } from "react";
import ModalInputField from "./ModalInputField";
import AddParticipantFooter from "./addParticipantFooter";
import { ActionName } from "../../types";
import ConvoModal from "./ConvoModal";
import { AppState } from "../../store";
import { getTranslation } from "../../utils/localUtils";
import { useSelector } from "react-redux";

interface AddSMSParticipantModalProps {
  name: string;
  isModalOpen: boolean;
  title: string;
  friendlyName: string;
  setName: (name: string) => void;
  setFriendlyName: (name: string) => void;
  error: string;
  nameInputRef: RefObject<HTMLInputElement>;
  handleClose: () => void;
  onBack: () => void;
  action: () => void;
}

const AddSMSParticipantModal: React.FC<AddSMSParticipantModalProps> = (
  props: AddSMSParticipantModalProps
) => {
  const local = useSelector((state: AppState) => state.local);
  const smsNum = getTranslation(local, "smsNum");
  const smsHelpTxt = getTranslation(local, "smsHelpTxt");
  const addSMSParticipant = getTranslation(local, "addSMSParticipant");

  return (
    <>
      <ConvoModal
        handleClose={() => props.handleClose()}
        isModalOpen={props.isModalOpen}
        title={props.title}
        modalBody={
          <ModalBody>
            <h3>{addSMSParticipant}</h3>
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
                label={smsNum}
                input={props.name}
                placeholder="123456789012"
                onChange={props.setName}
                error={props.error}
                // error_text="Enter a valid phone number."
                help_text={smsHelpTxt}
                prefixType="SMS"
              />
              <ModalInputField
                label="Friendly Name"
                input={props.friendlyName}
                placeholder="John Doe"
                onChange={props.setFriendlyName}
                error=""
                help_text="Display name for this participant"
              />
            </Box>
          </ModalBody>
        }
        modalFooter={
          <AddParticipantFooter
            isSaveDisabled={!props.name || !!props.error}
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

export default AddSMSParticipantModal;
