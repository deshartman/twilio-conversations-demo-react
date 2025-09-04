import { ModalBody, Box } from "@twilio-paste/core";
import { RefObject } from "react";
import ModalInputField from "./ModalInputField";
import AddParticipantFooter from "./addParticipantFooter";
import { ActionName } from "../../types";
import ConvoModal from "./ConvoModal";
import { AppState } from "../../store";
import { getTranslation } from "../../utils/localUtils";
import { useSelector } from "react-redux";

interface AddAIAgentModalProps {
  name: string;
  setName: (name: string) => void;
  error: string;
  nameInputRef: RefObject<HTMLInputElement>;
  onBack: () => void;
  action: () => void;
  handleClose: () => void;
  isModalOpen: boolean;
  title: string;
}

const AddAIAgentModal: React.FC<AddAIAgentModalProps> = (
  props: AddAIAgentModalProps
) => {
  const local = useSelector((state: AppState) => state.local);
  const addAIAgent = getTranslation(local, "addAIAgent");
  const aiAgentIdentity = getTranslation(local, "aiAgentIdentity");

  return (
    <>
      <ConvoModal
        handleClose={() => props.handleClose()}
        isModalOpen={props.isModalOpen}
        title={props.title}
        modalBody={
          <ModalBody>
            <h3>{addAIAgent}</h3>
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
                label={aiAgentIdentity}
                isFocused={true}
                input={props.name}
                placeholder="Assistant"
                onChange={props.setName}
                error={props.error}
                help_text="The name of the AI agent participant"
              />
            </Box>
          </ModalBody>
        }
        modalFooter={
          <AddParticipantFooter
            isSaveDisabled={!props.name.trim() || !!props.error}
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

export default AddAIAgentModal;
