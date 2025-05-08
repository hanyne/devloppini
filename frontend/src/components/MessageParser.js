class MessageParser {
    constructor(actionProvider, handleMessage) {
      this.actionProvider = actionProvider;
      this.handleMessage = handleMessage;
    }
  
    async parse(message) {
      const lowerCaseMessage = message.toLowerCase();
      let reply;
  
      if (lowerCaseMessage.includes('paiement') || lowerCaseMessage.includes('payment')) {
        reply = await this.handleMessage('Vérifiez vos factures sur la page Mes Factures pour le statut de paiement.');
      } else if (lowerCaseMessage.includes('facture') || lowerCaseMessage.includes('invoice')) {
        reply = await this.handleMessage('Consultez vos factures sur la page Mes Factures ou téléchargez le PDF.');
      } else if (lowerCaseMessage.includes('devis') || lowerCaseMessage.includes('quote')) {
        reply = await this.handleMessage('Pour demander un devis, rendez-vous sur la page Demander un Devis.');
      } else if (lowerCaseMessage.includes('aide') || lowerCaseMessage.includes('help')) {
        reply = await this.handleMessage('Je peux vous aider avec les paiements, factures ou devis. Essayez "paiement", "facture" ou "devis".');
      } else {
        reply = await this.handleMessage('Je ne suis pas sûr de comprendre. Essayez "paiement", "facture", "devis" ou "aide".');
      }
  
      this.actionProvider.handleMessageResponse(reply);
    }
  }
  
  export default MessageParser;