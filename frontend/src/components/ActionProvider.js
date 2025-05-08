// ActionProvider.js
class ActionProvider {
  constructor(createChatBotMessage, setStateFunc, createClientMessage) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
    this.createClientMessage = createClientMessage;
  }

  handleMessageResponse(response) {
    const message = this.createChatBotMessage(response);
    this.setState((prev) => {
      const newMessages = [...prev.messages, message];
      // Keep only the last 50 messages
      if (newMessages.length > 50) {
        newMessages.shift();
      }
      return {
        ...prev,
        messages: newMessages,
      };
    });
  }
}

export default ActionProvider;