const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const createStandardEmailTemplate = ({ 
  headerTitle, 
  mainContent, 
  buttonText = null, 
  buttonUrl = null, 
  footerText = null 
}) => {
  const currentYear = new Date().getFullYear();
  
  // Create button HTML if button parameters are provided
  const buttonHtml = (buttonText && buttonUrl) ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${buttonUrl}" style="background: #0ab39c; color: #fff; padding: 14px 36px; border-radius: 6px; text-decoration: none; font-size: 17px; font-weight: 600; box-shadow: 0 2px 8px rgba(10,179,156,0.10); display: inline-block; border: none;">
        ${buttonText}
      </a>
    </div>
  ` : '';
  
  // Create footer HTML if footer text is provided
  const footerHtml = footerText ? `
    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;">
    <p style="font-size: 12px; color: #888; text-align: center;">
      ${footerText}<br>
      &copy; ${currentYear} Nestleo
    </p>
  ` : `
    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;">
    <p style="font-size: 12px; color: #888; text-align: center;">
      &copy; ${currentYear} Nestleo
    </p>
  `;
  
  // Complete HTML template
  return `
    <div style="font-family: Roboto, Arial, sans-serif; background: #f7f7f9; padding: 0; margin: 0;">
      <div style="max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); overflow: hidden;">
        <div style="background: #0ab39c; padding: 32px 0 16px 0; text-align: center;">
          <h2 style="color: #fff; margin: 0; font-weight: 700;">${headerTitle}</h2>
        </div>
        <div style="padding: 32px 24px 24px 24px;">
          ${mainContent}
          ${buttonHtml}
          ${footerHtml}
        </div>
      </div>
    </div>
  `;
};
// Helper function to get user language from database
const getUserLanguage = async (email) => {
  try {
    const User = require('../Models/User');
    const user = await User.findOne({ email });
    return user?.language || 'en';
  } catch (error) {
    console.log('Error getting user language:', error);
    return 'en'; // Default fallback
  }
};

// Email templates for multiple languages
const emailTemplates = {
  verification: {
    en: {
      subject: 'Verify your email address',
      welcome: 'Welcome to Nestleo!',
      thankYou: 'Thank you for signing up.',
      instruction: 'Please verify your email address by clicking the button below:',
      buttonText: 'Verify my email',
      noAction: 'If you did not create an account, you can ignore this email.',
      expiry: 'This link will expire in 24 hours.'
    },
    fr: {
      subject: 'Vérifiez votre adresse email',
      welcome: 'Bienvenue chez Nestleo !',
      thankYou: 'Merci de vous être inscrit.',
      instruction: 'Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :',
      buttonText: 'Vérifier mon email',
      noAction: 'Si vous n\'avez pas créé de compte, vous pouvez ignorer cet email.',
      expiry: 'Ce lien expirera dans 24 heures.'
    },
    it: {
      subject: 'Verifica il tuo indirizzo email',
      welcome: 'Benvenuto in Nestleo!',
      thankYou: 'Grazie per esserti registrato.',
      instruction: 'Per favore verifica il tuo indirizzo email cliccando sul pulsante qui sotto:',
      buttonText: 'Verifica la mia email',
      noAction: 'Se non hai creato un account, puoi ignorare questa email.',
      expiry: 'Questo link scadrà tra 24 ore.'
    },
    sp: {
      subject: 'Verifica tu dirección de correo electrónico',
      welcome: '¡Bienvenido a Nestleo!',
      thankYou: 'Gracias por registrarte.',
      instruction: 'Por favor verifica tu dirección de correo electrónico haciendo clic en el botón de abajo:',
      buttonText: 'Verificar mi email',
      noAction: 'Si no creaste una cuenta, puedes ignorar este correo.',
      expiry: 'Este enlace expirará en 24 horas.'
    }
  },
  welcome: {
    en: {
      subject: 'Welcome to Nestleo!',
      welcome: 'Welcome to Nestleo!',
      message: 'Your account has been successfully created.',
      getStarted: 'You can now start using our platform.',
      loginButton: 'Login to your account'
    },
    fr: {
      subject: 'Bienvenue chez Nestleo !',
      welcome: 'Bienvenue chez Nestleo !',
      message: 'Votre compte a été créé avec succès.',
      getStarted: 'Vous pouvez maintenant commencer à utiliser notre plateforme.',
      loginButton: 'Se connecter à votre compte'
    },
    it: {
      subject: 'Benvenuto in Nestleo!',
      welcome: 'Benvenuto in Nestleo!',
      message: 'Il tuo account è stato creato con successo.',
      getStarted: 'Ora puoi iniziare a utilizzare la nostra piattaforma.',
      loginButton: 'Accedi al tuo account'
    },
    sp: {
      subject: '¡Bienvenido a Nestleo!',
      welcome: '¡Bienvenido a Nestleo!',
      message: 'Tu cuenta ha sido creada exitosamente.',
      getStarted: 'Ahora puedes comenzar a usar nuestra piattaforma.',
      loginButton: 'Iniciar sesión en tu cuenta'
    }
  },
  passwordReset: {
    en: {
      subject: 'Password Reset Request',
      title: 'Reset Your Password',
      message: 'You requested a password reset for your Nestleo account.',
      instruction: 'Click the button below to reset your password:',
      buttonText: 'Reset Password',
      noAction: 'If you did not request this, please ignore this email.',
      expiry: 'This link will expire in 1 hour.'
    },
    fr: {
      subject: 'Demande de réinitialisation du mot de passe',
      title: 'Réinitialisez votre mot de passe',
      message: 'Vous avez demandé une réinitialisation de mot de passe pour votre compte Nestleo.',
      instruction: 'Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :',
      buttonText: 'Réinitialiser le mot de passe',
      noAction: 'Si vous n\'avez pas demandé cela, veuillez ignorer cet email.',
      expiry: 'Ce lien expirera dans 1 heure.'
    },
    it: {
      subject: 'Richiesta di reset password',
      title: 'Reimposta la tua password',
      message: 'Hai richiesto un reset della password per il tuo account Nestleo.',
      instruction: 'Clicca sul pulsante qui sotto per reimpostare la tua password:',
      buttonText: 'Reimposta Password',
      noAction: 'Se non hai richiesto questo, per favore ignora questa email.',
      expiry: 'Questo link scadrà tra 1 ora.'
    },
    sp: {
      subject: 'Solicitud de restablecimiento de contraseña',
      title: 'Restablece tu contraseña',
      message: 'Has solicitado restablecer la contraseña de tu cuenta Nestleo.',
      instruction: 'Haz clic en el botón de abajo para restablecer tu contraseña:',
      buttonText: 'Restablecer Contraseña',
      noAction: 'Si no solicitaste esto, por favor ignora este correo.',
      expiry: 'Este enlace expirará en 1 hora.'
    }
  },
  activation: {
    en: {
      subject: 'Account Activation',
      title: 'Your Account is Now Active!',
      message: 'Your account has been successfully activated. You can now log in and access your features.',
      thanks: 'Thank you for using Nestleo!'
    },
    fr: {
      subject: 'Activation du compte',
      title: 'Votre compte est maintenant actif !',
      message: 'Votre compte a été activé avec succès. Vous pouvez maintenant vous connecter et accéder à vos fonctionnalités.',
      thanks: 'Merci d\'utiliser Nestleo !'
    },
    it: {
      subject: 'Attivazione account',
      title: 'Il tuo account è ora attivo!',
      message: 'Il tuo account è stato attivato con successo. Ora puoi accedere e utilizzare le tue funzionalità.',
      thanks: 'Grazie per aver utilizzato Nestleo!'
    },
    sp: {
      subject: 'Activación de cuenta',
      title: '¡Tu cuenta está ahora activa!',
      message: 'Tu cuenta ha sido activada exitosamente. Ahora puedes iniciar sesión y acceder a tus funciones.',
      thanks: '¡Gracias por usar Nestleo!'
    }
  },
  deactivation: {
    en: {
      subject: 'Account Deactivation',
      title: 'Your Account is Now Deactivated!',
      message: 'Your account has been deactivated. You cannot log in now.',
      contact: 'Contact us for more information.',
      thanks: 'Thank you for using Nestleo!'
    },
    fr: {
      subject: 'Désactivation du compte',
      title: 'Votre compte est maintenant désactivé !',
      message: 'Votre compte a été désactivé. Vous ne pouvez plus vous connecter maintenant.',
      contact: 'Contactez-nous pour plus d\'informations.',
      thanks: 'Merci d\'utiliser Nestleo !'
    },
    it: {
      subject: 'Disattivazione account',
      title: 'Il tuo account è ora disattivato!',
      message: 'Il tuo account è stato disattivato. Non puoi più accedere ora.',
      contact: 'Contattaci per maggiori informazioni.',
      thanks: 'Grazie per aver utilizzato Nestleo!'
    },
    sp: {
      subject: 'Desactivación de cuenta',
      title: '¡Tu cuenta está ahora desactivada!',
      message: 'Tu cuenta ha sido desactivada. No puedes iniciar sesión ahora.',
      contact: 'Contáctanos para más información.',
      thanks: '¡Gracias por usar Nestleo!'
    }
  },
  paymentConfirmation: {
    en: {
      subject: 'Payment Confirmation for Invoice',
      title: 'Payment Confirmed',
      message: 'We have successfully processed your payment for Invoice',
      amountPaid: 'Amount Paid',
      datePaid: 'Date Paid',
      transactionId: 'Transaction ID',
      receiptNumber: 'Receipt Number',
      receiptAttached: 'The payment receipt is attached to this email for your records.',
      thankYou: 'Thank you for your payment!'
    },
    fr: {
      subject: 'Confirmation de paiement pour la facture',
      title: 'Paiement confirmé',
      message: 'Nous avons traité avec succès votre paiement pour la facture',
      amountPaid: 'Montant payé',
      datePaid: 'Date de paiement',
      transactionId: 'ID de transaction',
      receiptNumber: 'Numéro de reçu',
      receiptAttached: 'Le reçu de paiement est joint à cet email pour vos dossiers.',
      thankYou: 'Merci pour votre paiement !'
    },
    it: {
      subject: 'Conferma di pagamento per la fattura',
      title: 'Pagamento confermato',
      message: 'Abbiamo elaborato con successo il tuo pagamento per la fattura',
      amountPaid: 'Importo pagato',
      datePaid: 'Data di pagamento',
      transactionId: 'ID transazione',
      receiptNumber: 'Numero ricevuta',
      receiptAttached: 'La ricevuta di pagamento è allegata a questa email per i tuoi archivi.',
      thankYou: 'Grazie per il tuo pagamento!'
    },
    sp: {
      subject: 'Confirmación de pago para la factura',
      title: 'Pago confirmado',
      message: 'Hemos procesado exitosamente tu pago para la factura',
      amountPaid: 'Cantidad pagada',
      datePaid: 'Fecha de pago',
      transactionId: 'ID de transacción',
      receiptNumber: 'Número de recibo',
      receiptAttached: 'El recibo de pago está adjunto a este correo para tus registros.',
      thankYou: '¡Gracias por tu pago!'
    }
  },
  invoice: {
    en: {
      subject: 'New Invoice',
      subjectUpdate: 'Invoice Has Been Updated',
      title: 'New Invoice',
      titleUpdate: 'Invoice Updated',
      message: 'A new invoice has been generated for you:',
      messageUpdate: 'Your invoice has been updated with the following changes:',
      invoiceNumber: 'Invoice Number',
      totalAmount: 'Total Amount',
      dueDate: 'Due Date',
      updatedOn: 'Updated On',
      paidStatus: 'This invoice has been marked as PAID',
      unpaidStatus: 'Payment Status: UNPAID',
      seeAttached: 'Please see the attached PDF for complete details.',
      importantUpdate: 'Important: If you\'ve already made a payment, please verify that the updated amounts match your records.',
      thankYou: 'Thank you for your business!'
    },
    fr: {
      subject: 'Nouvelle facture',
      subjectUpdate: 'La facture a été mise à jour',
      title: 'Nouvelle facture',
      titleUpdate: 'Facture mise à jour',
      message: 'Une nouvelle facture a été générée pour vous :',
      messageUpdate: 'Votre facture a été mise à jour avec les modifications suivantes :',
      invoiceNumber: 'Numéro de facture',
      totalAmount: 'Montant total',
      dueDate: 'Date d\'échéance',
      updatedOn: 'Mis à jour le',
      paidStatus: 'Cette facture a été marquée comme PAYÉE',
      unpaidStatus: 'Statut de paiement : NON PAYÉE',
      seeAttached: 'Veuillez consulter le PDF ci-joint pour tous les détails.',
      importantUpdate: 'Important : Si vous avez déjà effectué un paiement, veuillez vérifier que les montants mis à jour correspondent à vos dossiers.',
      thankYou: 'Merci pour votre business !'
    },
    it: {
      subject: 'Nuova fattura',
      subjectUpdate: 'La fattura è stata aggiornata',
      title: 'Nuova fattura',
      titleUpdate: 'Fattura aggiornata',
      message: 'È stata generata una nuova fattura per te:',
      messageUpdate: 'La tua fattura è stata aggiornata con le seguenti modifiche:',
      invoiceNumber: 'Numero fattura',
      totalAmount: 'Importo totale',
      dueDate: 'Data di scadenza',
      updatedOn: 'Aggiornato il',
      paidStatus: 'Questa fattura è stata contrassegnata come PAGATA',
      unpaidStatus: 'Stato pagamento: NON PAGATA',
      seeAttached: 'Per favore consulta il PDF allegato per tutti i dettagli.',
      importantUpdate: 'Importante: Se hai già effettuato un pagamento, verifica che gli importi aggiornati corrispondano ai tuoi record.',
      thankYou: 'Grazie per il tuo business!'
    },
    sp: {
      subject: 'Nueva factura',
      subjectUpdate: 'La factura ha sido actualizada',
      title: 'Nueva factura',
      titleUpdate: 'Factura actualizada',
      message: 'Se ha generado una nueva factura para ti:',
      messageUpdate: 'Tu factura ha sido actualizada con los siguientes cambios:',
      invoiceNumber: 'Número de factura',
      totalAmount: 'Monto total',
      dueDate: 'Fecha de vencimiento',
      updatedOn: 'Actualizado el',
      paidStatus: 'Esta factura ha sido marcada como PAGADA',
      unpaidStatus: 'Estado de pago: NO PAGADA',
      seeAttached: 'Por favor consulta el PDF adjunto para todos los detalles.',
      importantUpdate: 'Importante: Si ya has realizado un pago, por favor verifica que los montos actualizados coincidan con tus registros.',
      thankYou: '¡Gracias por tu negocio!'
    }
  },
  accountTransfer: {
    en: {
      subject: 'Syndic Account Transferred Successfully',
      title: 'Account Transfer Completed',
      message: 'Your syndic account has been successfully transferred to a new email address.',
      details: 'Here are your updated account details:',
      oldEmail: 'Previous Email Address',
      newEmail: 'New Email Address',
      newPassword: 'New Password',
      transferDate: 'Transfer Date',
      loginInfo: 'You can now log in with your new email address and password.',
      securityNote: 'For security reasons, we recommend changing your password after your first login.',
      thankYou: 'Thank you for using Nestleo!'
    },
    fr: {
      subject: 'Compte Syndic Transféré avec Succès',
      title: 'Transfert de Compte Terminé',
      message: 'Votre compte syndic a été transféré avec succès vers une nouvelle adresse email.',
      details: 'Voici les détails de votre compte mis à jour :',
      oldEmail: 'Ancienne Adresse Email',
      newEmail: 'Nouvelle Adresse Email',
      newPassword: 'Nouveau Mot de Passe',
      transferDate: 'Date de Transfert',
      loginInfo: 'Vous pouvez maintenant vous connecter avec votre nouvelle adresse email et mot de passe.',
      securityNote: 'Pour des raisons de sécurité, nous recommandons de changer votre mot de passe après votre première connexion.',
      thankYou: 'Merci d\'utiliser Nestleo !'
    },
    it: {
      subject: 'Account Sindacale Trasferito con Successo',
      title: 'Trasferimento Account Completato',
      message: 'Il tuo account sindacale è stato trasferito con successo a un nuovo indirizzo email.',
      details: 'Ecco i dettagli del tuo account aggiornato:',
      oldEmail: 'Indirizzo Email Precedente',
      newEmail: 'Nuovo Indirizzo Email',
      newPassword: 'Nuova Password',
      transferDate: 'Data di Trasferimento',
      loginInfo: 'Ora puoi accedere con il tuo nuovo indirizzo email e password.',
      securityNote: 'Per motivi di sicurezza, consigliamo di cambiare la password dopo il primo accesso.',
      thankYou: 'Grazie per aver utilizzato Nestleo!'
    },
    sp: {
      subject: 'Cuenta de Síndico Transferida Exitosamente',
      title: 'Transferencia de Cuenta Completada',
      message: 'Tu cuenta de síndico ha sido transferida exitosamente a una nueva dirección de correo electrónico.',
      details: 'Aquí están los detalles de tu cuenta actualizada:',
      oldEmail: 'Dirección de Correo Anterior',
      newEmail: 'Nueva Dirección de Correo',
      newPassword: 'Nueva Contraseña',
      transferDate: 'Fecha de Transferencia',
      loginInfo: 'Ahora puedes iniciar sesión con tu nueva dirección de correo y contraseña.',
      securityNote: 'Por razones de seguridad, recomendamos cambiar tu contraseña después de tu primer inicio de sesión.',
      thankYou: '¡Gracias por usar Nestleo!'
    }
  },
  transferConfirmationNotification: {
    en: {
      subject: 'Account Transfer Request Confirmed',
      title: 'Your Account Transfer Request Has Been Confirmed',
      message: 'The new email address {newEmail} has confirmed your account transfer request. You can now complete the transfer process in your account settings.',
      nextSteps: 'Next Steps',
      finalizeInstructions: 'To finalize the transfer, please go to your account settings and complete the final approval step.',
      warningTitle: 'Important Notice',
      warningMessage: 'If you did not initiate this transfer, please contact our support team immediately.',
      expiryNote: 'Your transfer request will remain in a pending state until you complete the final approval.',
      thankYou: 'Thank you for using Nestleo!'
    },
    fr: {
      subject: 'Demande de Transfert de Compte Confirmée',
      title: 'Votre Demande de Transfert de Compte a été Confirmée',
      message: 'La nouvelle adresse email {newEmail} a confirmé votre demande de transfert de compte. Vous pouvez maintenant terminer le processus de transfert dans les paramètres de votre compte.',
      nextSteps: 'Prochaines Étapes',
      finalizeInstructions: 'Pour finaliser le transfert, veuillez vous rendre dans les paramètres de votre compte et compléter l\'étape d\'approbation finale.',
      warningTitle: 'Avis Important',
      warningMessage: 'Si vous n\'avez pas initié ce transfert, veuillez contacter notre équipe de support immédiatement.',
      expiryNote: 'Votre demande de transfert restera en attente jusqu\'à ce que vous complétiez l\'approbation finale.',
      thankYou: 'Merci d\'utiliser Nestleo !'
    },
    it: {
      subject: 'Richiesta di Trasferimento Account Confermata',
      title: 'La Tua Richiesta di Trasferimento Account è Stata Confermata',
      message: 'Il nuovo indirizzo email {newEmail} ha confermato la tua richiesta di trasferimento account. Ora puoi completare il processo di trasferimento nelle impostazioni del tuo account.',
      nextSteps: 'Prossimi Passi',
      finalizeInstructions: 'Per finalizzare il trasferimento, vai alle impostazioni del tuo account e completa la fase di approvazione finale.',
      warningTitle: 'Avviso Importante',
      warningMessage: 'Se non hai avviato questo trasferimento, contatta immediatamente il nostro team di supporto.',
      expiryNote: 'La tua richiesta di trasferimento rimarrà in sospeso fino a quando non completerai l\'approvazione finale.',
      thankYou: 'Grazie per aver utilizzato Nestleo!'
    },
    sp: {
      subject: 'Solicitud de Transferencia de Cuenta Confirmada',
      title: 'Tu Solicitud de Transferencia de Cuenta Ha Sido Confirmada',
      message: 'La nueva dirección de correo {newEmail} ha confirmado tu solicitud de transferencia de cuenta. Ahora puedes completar el proceso de transferencia en la configuración de tu cuenta.',
      nextSteps: 'Próximos Pasos',
      finalizeInstructions: 'Para finalizar la transferencia, ve a la configuración de tu cuenta y completa el paso de aprobación final.',
      warningTitle: 'Aviso Importante',
      warningMessage: 'Si no iniciaste esta transferencia, contacta a nuestro equipo de soporte inmediatamente.',
      expiryNote: 'Tu solicitud de transferencia permanecerá en estado pendiente hasta que completes la aprobación final.',
      thankYou: '¡Gracias por usar Nestleo!'
    }
  },
  transferConfirmation: {
    en: {
      subject: 'Confirm Account Transfer Request',
      title: 'Account Transfer Confirmation Required',
      message: 'You are receiving this email because {oldEmail} has designated you as the new trustee for the associated account. To confirm this action and continue the process, please click the button below.',
      newEmail: 'New Email Address',
      oldEmail: 'Old Email Address',
      confirmButton: 'Confirm Transfer',
      warningTitle: 'Important Security Notice',
      warningMessage: 'If you did not request this transfer, please ignore this email and contact our support team immediately.',
      expiryNote: 'This confirmation link will expire in 30 minutes for your security.',
      thankYou: 'Thank you for using Nestleo!'
    },
    fr: {
      subject: 'Confirmer la Demande de Transfert de Compte',
      title: 'Confirmation de Transfert de Compte Requise',
      message: 'Vous recevez cet email car {oldEmail} vous désigne comme le nouveau syndic du compte associé. Pour confirmer cette action et poursuivre le processus, veuillez cliquer sur le bouton ci-dessous.',
      newEmail: 'Nouvelle Adresse Email',
      oldEmail: 'Ancienne Adresse Email',
      confirmButton: 'Confirmer le Transfert',
      warningTitle: 'Avis de Sécurité Important',
      warningMessage: 'Si vous n\'avez pas demandé ce transfert, veuillez ignorer cet email et contacter notre équipe de support immédiatement.',
      expiryNote: 'Ce lien de confirmation expirera dans 30 minutes pour votre sécurité.',
      thankYou: 'Merci d\'utiliser Nestleo !'
    },
    it: {
      subject: 'Conferma Richiesta di Trasferimento Account',
      title: 'Richiesta Conferma Trasferimento Account',
      message: 'Stai ricevendo questa email perché {oldEmail} ti ha designato come nuovo amministratore per l\'account associato. Per confermare questa azione e continuare il processo, clicca sul pulsante qui sotto.',
      newEmail: 'Nuovo Indirizzo Email',
      oldEmail: 'Vecchio Indirizzo Email',
      confirmButton: 'Conferma Trasferimento',
      warningTitle: 'Avviso di Sicurezza Importante',
      warningMessage: 'Se non hai richiesto questo trasferimento, ignora questa email e contatta immediatamente il nostro team di supporto.',
      expiryNote: 'Questo link di conferma scadrà in 30 minuti per la tua sicurezza.',
      thankYou: 'Grazie per aver utilizzato Nestleo!'
    },
    sp: {
      subject: 'Confirmar Solicitud de Transferencia de Cuenta',
      title: 'Confirmación de Transferencia de Cuenta Requerida',
      message: 'Estás recibiendo este correo porque {oldEmail} te ha designado como el nuevo síndico de la cuenta asociada. Para confirmar esta acción y continuar con el proceso, haz clic en el botón de abajo.',
      newEmail: 'Nueva Dirección de Correo',
      oldEmail: 'Dirección de Correo Anterior',
      confirmButton: 'Confirmar Transferencia',
      warningTitle: 'Aviso de Seguridad Importante',
      warningMessage: 'Si no solicitaste esta transferencia, ignora este correo y contacta a nuestro equipo de soporte inmediatamente.',
      expiryNote: 'Este enlace de confirmación expirará en 30 minutos por tu seguridad.',
      thankYou: '¡Gracias por usar Nestleo!'
    }
  },
  buildingTransferConfirmation: {
    en: {
      subject: 'Confirm Building Transfer Request',
      title: 'Building Transfer Confirmation Required',
      message: 'You have been requested to receive ownership of a building. Please confirm this action by clicking the button below.',
      buildingInfo: 'Building Information',
      currentOwner: 'Current Owner',
      newOwner: 'New Owner (You)',
      confirmButton: 'Accept Building Transfer',
      warningTitle: 'Important Notice',
      warningMessage: 'By accepting this transfer, you will become the new owner of this building and all its associated responsibilities.',
      expiryNote: 'This confirmation link will expire in 30 minutes for security reasons.',
      thankYou: 'Thank you for using Nestleo!'
    },
    fr: {
      subject: 'Confirmer la Demande de Transfert d\'Immeuble',
      title: 'Confirmation de Transfert d\'Immeuble Requise',
      message: 'On vous a demandé de recevoir la propriété d\'un immeuble. Veuillez confirmer cette action en cliquant sur le bouton ci-dessous.',
      buildingInfo: 'Informations sur l\'Immeuble',
      currentOwner: 'Propriétaire Actuel',
      newOwner: 'Nouveau Propriétaire (Vous)',
      confirmButton: 'Accepter le Transfert d\'Immeuble',
      warningTitle: 'Avis Important',
      warningMessage: 'En acceptant ce transfert, vous deviendrez le nouveau propriétaire de cet immeuble et de toutes ses responsabilités associées.',
      expiryNote: 'Ce lien de confirmation expirera dans 30 minutes pour des raisons de sécurité.',
      thankYou: 'Merci d\'utiliser Nestleo !'
    },
    it: {
      subject: 'Conferma Richiesta di Trasferimento Edificio',
      title: 'Richiesta Conferma Trasferimento Edificio',
      message: 'Ti è stato richiesto di ricevere la proprietà di un edificio. Conferma questa azione cliccando il pulsante qui sotto.',
      buildingInfo: 'Informazioni Edificio',
      currentOwner: 'Proprietario Attuale',
      newOwner: 'Nuovo Proprietario (Tu)',
      confirmButton: 'Accetta Trasferimento Edificio',
      warningTitle: 'Avviso Importante',
      warningMessage: 'Accettando questo trasferimento, diventerai il nuovo proprietario di questo edificio e di tutte le responsabilità associate.',
      expiryNote: 'Questo link di conferma scadrà in 30 minuti per motivi di sicurezza.',
      thankYou: 'Grazie per aver utilizzato Nestleo!'
    },
    sp: {
      subject: 'Confirmar Solicitud de Transferencia de Edificio',
      title: 'Confirmación de Transferencia de Edificio Requerida',
      message: 'Se te ha solicitado recibir la propiedad de un edificio. Confirma esta acción haciendo clic en el botón de abajo.',
      buildingInfo: 'Información del Edificio',
      currentOwner: 'Propietario Actual',
      newOwner: 'Nuevo Propietario (Tú)',
      confirmButton: 'Aceptar Transferencia de Edificio',
      warningTitle: 'Aviso Importante',
      warningMessage: 'Al aceptar esta transferencia, te convertirás en el nuevo propietario de este edificio y todas sus responsabilidades asociadas.',
      expiryNote: 'Este enlace de confirmación expirará en 30 minutos por razones de seguridad.',
      thankYou: '¡Gracias por usar Nestleo!'
    }
  },
  buildingTransferNotification: {
    en: {
      subject: 'Building Transfer Confirmation Received',
      title: 'Building Transfer Update',
      message: 'The recipient has confirmed the building transfer request. You can now finalize the transfer from your settings.',
      buildingInfo: 'Building Information',
      recipient: 'Transfer Recipient',
      nextSteps: 'Next Steps',
      nextStepsMessage: 'Go to your building settings to complete the transfer process.',
      warningTitle: 'Important Reminder',
      warningMessage: 'Once you finalize the transfer, you will no longer have access to this building.',
      thankYou: 'Thank you for using Nestleo!'
    },
    fr: {
      subject: 'Confirmation de Transfert d\'Immeuble Reçue',
      title: 'Mise à Jour du Transfert d\'Immeuble',
      message: 'Le destinataire a confirmé la demande de transfert d\'immeuble. Vous pouvez maintenant finaliser le transfert depuis vos paramètres.',
      buildingInfo: 'Informations sur l\'Immeuble',
      recipient: 'Destinataire du Transfert',
      nextSteps: 'Prochaines Étapes',
      nextStepsMessage: 'Allez à vos paramètres d\'immeuble pour terminer le processus de transfert.',
      warningTitle: 'Rappel Important',
      warningMessage: 'Une fois que vous finalisez le transfert, vous n\'aurez plus accès à cet immeuble.',
      thankYou: 'Merci d\'utiliser Nestleo !'
    },
    it: {
      subject: 'Conferma Trasferimento Edificio Ricevuta',
      title: 'Aggiornamento Trasferimento Edificio',
      message: 'Il destinatario ha confermato la richiesta di trasferimento dell\'edificio. Ora puoi finalizzare il trasferimento dalle tue impostazioni.',
      buildingInfo: 'Informazioni Edificio',
      recipient: 'Destinatario Trasferimento',
      nextSteps: 'Prossimi Passi',
      nextStepsMessage: 'Vai alle impostazioni del tuo edificio per completare il processo di trasferimento.',
      warningTitle: 'Promemoria Importante',
      warningMessage: 'Una volta finalizzato il trasferimento, non avrai più accesso a questo edificio.',
      thankYou: 'Grazie per aver utilizzato Nestleo!'
    },
    sp: {
      subject: 'Confirmación de Transferencia de Edificio Recibida',
      title: 'Actualización de Transferencia de Edificio',
      message: 'El destinatario ha confirmado la solicitud de transferencia del edificio. Ahora puedes finalizar la transferencia desde tu configuración.',
      buildingInfo: 'Información del Edificio',
      recipient: 'Destinatario de la Transferencia',
      nextSteps: 'Próximos Pasos',
      nextStepsMessage: 'Ve a la configuración de tu edificio para completar el proceso de transferencia.',
      warningTitle: 'Recordatorio Importante',
      warningMessage: 'Una vez que finalices la transferencia, ya no tendrás acceso a este edificio.',
      thankYou: '¡Gracias por usar Nestleo!'
    }
  }
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});


const sendVerificationEmail = async (email, verifyUrl, language = 'en') => {
  const template = emailTemplates.verification[language] || emailTemplates.verification.en;
  const mailOptions = {
    from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
    to: email,
    subject: template.subject,
    html: `
      <div style="font-family: Roboto, Arial, sans-serif; background: #f7f7f9; padding: 0; margin: 0;">
        <div style="max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); overflow: hidden;">
          <div style="background: #0ab39c; padding: 32px 0 16px 0; text-align: center;">
            <h2 style="color: #fff; margin: 0; font-weight: 700;">${template.welcome}</h2>
          </div>
          <div style="padding: 32px 24px 24px 24px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
              ${template.thankYou}<br>
              ${template.instruction}
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verifyUrl}" style="background: #0ab39c; color: #fff; padding: 14px 36px; border-radius: 6px; text-decoration: none; font-size: 17px; font-weight: 600; box-shadow: 0 2px 8px rgba(10,179,156,0.10); display: inline-block; border: none;">
                ${template.buttonText}
              </a>
            </div>
            <p style="font-size: 15px; color: #666; margin-bottom: 0;">
              ${template.noAction}
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">
              ${template.expiry}<br>
              &copy; ${new Date().getFullYear()} Nestleo
            </p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
  }
};



const generateAndSaveInvoicePDF = async (invoice, isUpdate = undefined) => {
  const pdfPath = path.join(__dirname, `../public/invoices/invoice_${invoice.invoiceNumber}.pdf`);
  const doc = new PDFDocument({ margin: 30, size: 'A4' });

  const arabicFontPath = path.join(__dirname, '../public/fonts/NotoSansArabic-VariableFont_wdth,wght.ttf');
  if (!fs.existsSync(arabicFontPath)) {
    throw new Error(`Arabic font not found at: ${arabicFontPath}`);
  }
  doc.registerFont('ArabicFont', arabicFontPath);

  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  let y = 50;

  // Helper function to check if text contains Arabic characters
  const containsArabic = (text) => {
    return /[\u0600-\u06FF]/.test(text);
  };

  // Function to format currency properly based on whether it's Arabic or not
  const formatCurrency = (symbol, amount) => {
    if (containsArabic(symbol)) {
      // For Arabic currencies, use the Arabic font and right-to-left formatting
      return `${amount.toFixed(2)} ${symbol}`;
    } else {
      // For non-Arabic currencies, use standard formatting
      return `${symbol}${amount.toFixed(2)}`;
    }
  };

  // Header Section: Logo and Company Info with background styling
  doc.rect(30, y, 540, 100).fill('#0ab39c');
  doc.image(path.join(__dirname, '../public/images/idw1MjGaM1_logos.png'), 40, y + 10, { width: 100 });
  doc.fillColor('#fff')
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('Nestleo Property Management', 150, y + 20)
    .font('Helvetica')
    .fontSize(12)
    .text('centre Cleorpatre, Centre Urbain Nord', 150, y + 40)
    .text('4 eme etage, bloc b', 150, y + 55)
    .text('Phone: (123) 456-7890', 150, y + 70);

  y += 120;
  doc.moveDown(3);

  // If invoice is paid, add a "PAID" watermark
  if (invoice.status === 'paid') {
    doc.save()
      .rotate(-20, { origin: [300, 400] })
      .fillColor('#198754')
      .opacity(0.15)
      .fontSize(80)
      .text('PAID', 150, 300, { align: 'center', width: 300 })
      .restore();
  }
  if (isUpdate) {
    doc.save()
      .rotate(-20, { origin: [300, 400] })
      .fillColor('#dc3545')
      .opacity(0.15)
      .fontSize(50)
      .text('UPDATED', 150, 200, {
        align: 'center',
        width: 400,
        lineBreak: false,
      })
      .restore();
  }

  // Invoice metadata in two columns avec "Issue Date" au lieu de "Date"
  doc.font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#333')
    .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, y)
    .text(`Issue Date: ${invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A'}`, 350, y);
  y += 20;
  doc.font('Helvetica')
    .text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}`, 50, y)
    .fillColor(invoice.status === 'paid' ? '#198754' : '#d63384')
    .text(`Status: ${invoice.status?.toUpperCase() || 'UNPAID'}`, 350, y);
  y += 40;

  // Bill To Section avec nom du building
  const coOwnerName = invoice.coOwner?.firstName + ' ' + invoice.coOwner?.lastName || '[Co-owner Name]';
  const coOwnerEmail = invoice.coOwner?.email || '[Email]';
  const buildingName = invoice.building?.name || invoice.buildingName || invoice.syndicateName || '[BUILDING NAME]';
  
  doc.font('Helvetica-Bold')
    .fillColor('#0ab39c')
    .text(`Building: ${buildingName}`, 50, y)
    .text('BILL TO:', 50, y + 20);
  doc.font('Helvetica')
    .fillColor('#333')
    .text(coOwnerName, 50, y + 35)
    .text(coOwnerEmail, 50, y + 50)
    .text(`Apartment #: ${invoice.apartmentNumber || '[APARTMENT NUMBER]'}`, 50, y + 65)
    .text(`${invoice.city || '[City]'}, ${invoice.postalCode || '[Postal Code]'}`, 50, y + 80);
  y += 120;
  doc.moveDown(3);

  // Items table header with background color
  doc.rect(50, y, 500, 20)
    .fillAndStroke('#0ab39c', '#0ab39c');
  doc.fillColor('#fff')
    .font('Helvetica-Bold')
    .text('Description', 55, y + 5)
    .text('Amount', 455, y + 5, { width: 90, align: 'right' });
  y += 25;

  // Ensure currency symbol is defined
  const currencySymbol = invoice.currencySymbol || invoice.currency?.symbol || '€';
  const isArabicCurrency = containsArabic(currencySymbol);

  // Items rows with alternating background colors
  (invoice.items || []).forEach((item, index) => {
    if (y > 650) {
      doc.addPage();
      y = 50;
    }
    const bgColor = index % 2 === 0 ? '#f8f9fa' : '#fff';
    doc.rect(50, y, 500, 20)
      .fillAndStroke(bgColor, '#ddd');
    
    // Item description
    doc.fillColor('#333')
      .font('Helvetica')
      .text(item.description || 'Item', 55, y + 5);
    
    // Format currency amount with proper font
    const formattedAmount = formatCurrency(currencySymbol, (item.amount || 0));
    
    // Use Arabic font for Arabic currency symbols
    if (isArabicCurrency) {
      doc.font('ArabicFont');
    } else {
      doc.font('Helvetica');
    }
    
    doc.text(formattedAmount, 455, y + 5, { width: 90, align: 'right' });
    y += 20;
  });
  y += 10;

  // Totals section with border and emphasis
  doc.rect(350, y, 200, 80)
    .stroke('#0ab39c');
  
  // Subtotal row
  doc.fillColor('#333')
    .font('Helvetica')
    .text('Subtotal:', 360, y + 15);
  
  // Use Arabic font for Arabic currency symbols
  if (isArabicCurrency) {
    doc.font('ArabicFont');
  } else {
    doc.font('Helvetica');
  }
  
  doc.text(formatCurrency(currencySymbol, (invoice.subtotal || 0)), 460, y + 15, { width: 80, align: 'right' });
  
  // Tax row
  doc.font('Helvetica')
    .text(`Tax (${((invoice.taxRate || 0.2) * 100).toFixed(1)}%):`, 360, y + 35);
  
  // Use Arabic font for Arabic currency symbols
  if (isArabicCurrency) {
    doc.font('ArabicFont');
  } else {
    doc.font('Helvetica');
  }
  
  doc.text(formatCurrency(currencySymbol, (invoice.tax || 0)), 460, y + 35, { width: 80, align: 'right' });
  
  // Total row
  doc.font('Helvetica-Bold')
    .text('TOTAL:', 360, y + 55);
  
  // Use Arabic font for Arabic currency symbols (Bold if available)
  if (isArabicCurrency) {
    doc.font('ArabicFont');
  } else {
    doc.font('Helvetica-Bold');
  }
  
  doc.text(formatCurrency(currencySymbol, (invoice.total || 0)), 460, y + 55, { width: 80, align: 'right', underline: true });
  y += 100;

  // Footer text
  if (y < 700) {
    doc.font('Helvetica')
      .fontSize(10)
      .fillColor('#777')
      .text(
        'Payment Terms: Due upon receipt. Please make checks payable to Nestleo Property Management.',
        50, y, { width: 500, align: 'center' }
      )
      .text(
        'Thank you for your business!', 50, y + 20, { width: 500, align: 'center', underline: true }
      );
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return pdfPath;
};
const sendInvoiceEmail = async (emailParams, req, res) => {
  try {
    // Handle both direct calls and nested body calls
    const params = emailParams.body || emailParams;

    const {
      coOwnerEmail = '',
      coOwnerName = '',
      status,
      invoiceData = {},
      isUpdate = false,
      language = null,
      isDelegateEmail = false,
      delegatedFor = '',
      delegateAmount = 0,
      sharedPercentage = 0
    } = params;

    if (!coOwnerEmail || !invoiceData.invoiceNumber) {
      throw new Error('Missing required email parameters');
    }

    // Get user's language preference
    const userLanguage = language || await getUserLanguage(coOwnerEmail);
    const template = emailTemplates.invoice[userLanguage] || emailTemplates.invoice.en;

    let pdfPath;
    if (isUpdate) {
      pdfPath = await generateAndSaveInvoicePDF(invoiceData, isUpdate);
    } else {
      pdfPath = await generateAndSaveInvoicePDF(invoiceData);
    }

    // Generate the invoice PDF using our unified design
    const pdfFilename = `invoice_${invoiceData.invoiceNumber}.pdf`;
    const pdfUrl = `/invoices/${pdfFilename}`;

    // Build email content with localized templates
    const emailSubject = isDelegateEmail
      ? `${template.subject} #${invoiceData.invoiceNumber} - Delegate for ${delegatedFor}`
      : isUpdate
        ? `${template.subjectUpdate} #${invoiceData.invoiceNumber}`
        : `${template.subject} #${invoiceData.invoiceNumber}`;

    const statusAlert = status === 'paid'
      ? `<div style="background-color: #d1e7dd; color: #0f5132; padding: 10px; border-radius: 5px; margin: 10px 0; text-align: center;">${template.paidStatus}</div>`
      : `<div style="background-color: #f8d7da; color: #842029; padding: 10px; border-radius: 5px; margin: 10px 0; text-align: center;">${template.unpaidStatus}</div>`;

    const actionMessage = isDelegateEmail
      ? `You are receiving this invoice as a payment delegate for ${delegatedFor}. ${isUpdate ? template.messageUpdate : template.message}`
      : isUpdate ? template.messageUpdate : template.message;

    // Additional delegate information
    const delegateInfo = isDelegateEmail ? `
      <div style="background-color: #e7f3ff; color: #004085; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #007bff;">
        <h4 style="margin: 0 0 10px 0; color: #004085;">Delegation Details</h4>
        <p style="margin: 5px 0;"><strong>Acting as delegate for:</strong> ${delegatedFor}</p>
        ${sharedPercentage > 0 ? `<p style="margin: 5px 0;"><strong>Shared percentage:</strong> ${sharedPercentage}%</p>` : ''}
        ${delegateAmount > 0 ? `<p style="margin: 5px 0;"><strong>Your delegate amount:</strong> ${invoiceData.currencySymbol}${delegateAmount.toFixed(2)}</p>` : ''}
      </div>
    ` : '';

    const mainContent = `
      <p style="text-align: left; font-size: 15px; color: #555;">
        Hello ${coOwnerName},<br><br>
        ${actionMessage}
      </p>
      ${delegateInfo}
      ${statusAlert}
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p><strong>${template.invoiceNumber}:</strong> ${invoiceData.invoiceNumber || 'N/A'}</p>
        <p><strong>${template.totalAmount}:</strong> ${invoiceData.currencySymbol}${(invoiceData.total || 0).toFixed(2)}</p>
        <p><strong>${template.dueDate}:</strong> ${invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString() : 'N/A'}</p>
        ${isUpdate ? `<p><strong>${template.updatedOn}:</strong> ${new Date().toLocaleDateString()}</p>` : ''}
      </div>
      <p style="text-align: center; font-size: 14px; color: #777;">
        ${template.seeAttached}
      </p>
      ${isUpdate ? `
      <div style="background-color: #fff3cd; color: #664d03; padding: 10px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
        <strong>${template.importantUpdate}</strong>
      </div>
      ` : ''}
    `;

    const htmlContent = createStandardEmailTemplate({
      headerTitle: isDelegateEmail ? 'Invoice - Payment Delegate' : (isUpdate ? template.titleUpdate : template.title),
      mainContent,
      footerText: template.thankYou
    });

    // Email options with the generated PDF attached
    const mailOptions = {
      from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
      to: coOwnerEmail,
      subject: emailSubject,
      html: htmlContent,
      attachments: [{
        filename: pdfFilename,
        path: pdfPath
      }]
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      pdfUrl,
      isUpdate
    });
  } catch (error) {
    console.error('Error in sendInvoiceEmail:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
const sendInvoiceEmailToAllCoOwners = async (emailParams) => {
  try {
    const params = emailParams.body || emailParams;

    const {
      coOwnerEmail = '',
      coOwnerName = '',
      status,
      invoiceData = {},
      isUpdate = false,
      language = null
    } = params;

    if (!coOwnerEmail || !invoiceData.invoiceNumber) {
      throw new Error('Missing required email parameters');
    }
    
    // Get user's language preference
    const userLanguage = language || await getUserLanguage(coOwnerEmail);
    const template = emailTemplates.invoice[userLanguage] || emailTemplates.invoice.en;

    console.log(invoiceData.currencySymbol);

    // Generate invoice PDF
    let pdfPath = await generateAndSaveInvoicePDF(invoiceData, isUpdate);

    const pdfFilename = `invoice_${invoiceData.invoiceNumber}.pdf`;
    const pdfUrl = `/invoices/${pdfFilename}`; // In case you serve PDFs statically

    // Email subject and alert with localized templates
    const emailSubject = isUpdate
      ? `${template.subjectUpdate} #${invoiceData.invoiceNumber}`
      : `${template.subject} #${invoiceData.invoiceNumber}`;

    const statusAlert = status === 'paid'
      ? `<div style="background-color: #d1e7dd; color: #0f5132; padding: 10px; border-radius: 5px;">${template.paidStatus}</div>`
      : `<div style="background-color: #f8d7da; color: #842029; padding: 10px; border-radius: 5px;">${template.unpaidStatus}</div>`;

    const actionMessage = isUpdate ? template.messageUpdate : template.message;

    const emailHtml = `
      <div style="font-family: Roboto, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="text-align: center; color: #0ab39c;">${isUpdate ? template.titleUpdate : template.title}</h2>
        <p style="text-align: center;">Hello ${coOwnerName},<br>${actionMessage}</p>
        ${statusAlert}
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>${template.invoiceNumber}:</strong> ${invoiceData.invoiceNumber}</p>
          <p><strong>${template.totalAmount}:</strong> ${invoiceData.currencySymbol}${(invoiceData.total || 0).toFixed(2)}</p>
          <p><strong>${template.dueDate}:</strong> ${invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString() : 'N/A'}</p>
          ${isUpdate ? `<p><strong>${template.updatedOn}:</strong> ${new Date().toLocaleDateString()}</p>` : ''}
        </div>
        <p style="text-align: center;">${template.seeAttached}</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="text-align: center; font-size: 12px; color: #999;">${template.thankYou}</p>
      </div>
    `;

    const mailOptions = {
      from: `"Nestleo" <${process.env.EMAIL_USER}>`,
      to: coOwnerEmail,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: pdfFilename,
          path: pdfPath,
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Invoice email sent to ${coOwnerEmail}`);
  } catch (error) {
    console.error('Failed to send invoice email:', error.message);
    throw error;
  }
};


const sendWelcomeEmail = async (email, password, resetUrl, language = 'en') => {
  const template = emailTemplates.welcome[language] || emailTemplates.welcome.en;
  
  const mailOptions = {
    from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
    to: email,
    subject: template.subject,
    html: `
      <div style="font-family: Roboto, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" stroke="#0ab39c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 style="text-align: center; color: #0ab39c;">${template.welcome}</h2>
        <p style="text-align: center; font-size: 15px; color: #555;">
          ${template.message}
        </p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; margin: 15px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>${language === 'fr' ? 'Mot de passe temporaire' : language === 'it' ? 'Password temporanea' : language === 'sp' ? 'Contraseña temporal' : 'Temporary Password'}:</strong> ${password}</p>
        </div>
        <p style="text-align: center; font-size: 14px; color: #777;">
          ${language === 'fr' ? 'Veuillez changer votre mot de passe dès que possible pour des raisons de sécurité.' : 
            language === 'it' ? 'Per favore cambia la tua password il prima possibile per ragioni di sicurezza.' :
            language === 'sp' ? 'Por favor cambia tu contraseña lo antes posible por razones de seguridad.' :
            'Please change your password as soon as possible for security reasons.'}
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #405189; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-size: 16px; display: inline-block;">
            ${language === 'fr' ? 'Réinitialiser le mot de passe' : 
              language === 'it' ? 'Reimposta Password' :
              language === 'sp' ? 'Restablecer Contraseña' :
              'Reset Password'}
          </a>
        </div>
        <p style="text-align: center; font-size: 14px; color: #777;">
          ${language === 'fr' ? 'Si vous avez des questions, n\'hésitez pas à contacter notre équipe de support.' :
            language === 'it' ? 'Se hai domande, non esitare a contattare il nostro team di supporto.' :
            language === 'sp' ? 'Si tienes preguntas, no dudes en contactar a nuestro equipo de soporte.' :
            'If you have any questions, feel free to contact our support team.'}
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="text-align: center; font-size: 12px; color: #999;">
          ${language === 'fr' ? 'Merci de rejoindre Nestleo !' :
            language === 'it' ? 'Grazie per esserti unito a Nestleo!' :
            language === 'sp' ? '¡Gracias por unirte a Nestleo!' :
            'Thank you for joining Nestleo!'}
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

const sendPasswordResetEmail = async (email, resetUrl, language = 'en') => {
  const template = emailTemplates.passwordReset[language] || emailTemplates.passwordReset.en;
  
  const mainContent = `
    <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
      ${template.message}<br>
      ${template.instruction}
    </p>
    <p style="font-size: 15px; color: #666; margin-bottom: 0;">
      ${template.noAction}
    </p>
  `;

  const htmlContent = createStandardEmailTemplate({
    headerTitle: template.title,
    mainContent,
    buttonText: template.buttonText,
    buttonUrl: resetUrl,
    footerText: template.expiry
  });

  const mailOptions = {
    from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
    to: email,
    subject: template.subject,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
  }
};
const sendToggleUserEmail = async (email, firstName, lastName, language = null) => {
  // Get user language from database if not provided
  const userLanguage = language || await getUserLanguage(email);
  const template = emailTemplates.activation[userLanguage] || emailTemplates.activation.en;
  
  const mailOptions = {
    from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
    to: email,
    subject: template.subject,
    html: `
      <div style="font-family: Roboto, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" stroke="#0ab39c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="16,12 12,8 8,12"></polyline>
            <line x1="12" y1="16" x2="12" y2="8"></line>
          </svg>
        </div>
        <h2 style="text-align: center; color: #0ab39c;">${template.title}</h2>
        <p style="text-align: center; font-size: 15px; color: #555;">
          ${userLanguage === 'fr' ? 'Bonjour' : userLanguage === 'it' ? 'Ciao' : userLanguage === 'sp' ? 'Hola' : 'Hello'} ${firstName} ${lastName},<br><br>
          ${template.message}
        </p>
        <div style="background-color: #d1e7dd; color: #0f5132; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center;">
          <strong>✓ ${userLanguage === 'fr' ? 'Compte Activé' : userLanguage === 'it' ? 'Account Attivato' : userLanguage === 'sp' ? 'Cuenta Activada' : 'Account Activated'}</strong>
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="text-align: center; font-size: 12px; color: #999;">
          ${template.thanks}
        </p>
      </div>
    `
  };


  try {
    await transporter.sendMail(mailOptions);
    console.log(`Activation email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send activation email to ${email}:`, error);
  }
};

const sendToggleUserDeactivateEmail = async (email, firstName, lastName, language = null) => {
  // Get user language from database if not provided
  const userLanguage = language || await getUserLanguage(email);
  const template = emailTemplates.deactivation[userLanguage] || emailTemplates.deactivation.en;
  
  const mailOptions = {
    from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
    to: email,
    subject: template.subject,
    html: `
      <div style="font-family: Roboto, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <h2 style="text-align: center; color: #dc3545;">${template.title}</h2>
        <p style="text-align: center; font-size: 15px; color: #555;">
          ${userLanguage === 'fr' ? 'Bonjour' : userLanguage === 'it' ? 'Ciao' : userLanguage === 'sp' ? 'Hola' : 'Hello'} ${firstName} ${lastName},<br><br>
          ${template.message}<br>
          ${template.contact}
        </p>
        <div style="background-color: #f8d7da; color: #842029; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center;">
          <strong>✗ ${userLanguage === 'fr' ? 'Compte Désactivé' : userLanguage === 'it' ? 'Account Disattivato' : userLanguage === 'sp' ? 'Cuenta Desactivada' : 'Account Deactivated'}</strong>
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="text-align: center; font-size: 12px; color: #999;">
          ${template.thanks}
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`DeActivation email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send Deactivation email to ${email}:`, error);
  }
};

// Welcome email for co-owners
const sendWelcomeEmailForCoowners = async (
  email,
  password,
  loginUrl,
  buildingMatricule,
  blocName,
  buildingName,
  apartmentNumber,
  apartmentFloor,
  language = 'en'
) => {
  const template = emailTemplates.welcome[language] || emailTemplates.welcome.en;
  
  const mainContent = `
    <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
      ${template.message}
    </p>
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: left; margin: 15px 0;">
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>${language === 'fr' ? 'Mot de passe temporaire' : language === 'it' ? 'Password temporanea' : language === 'sp' ? 'Contraseña temporal' : 'Temporary Password'}:</strong> ${password}</p>
      <p><strong>${language === 'fr' ? 'Bâtiment' : language === 'it' ? 'Edificio' : language === 'sp' ? 'Edificio' : 'Building'}:</strong> ${buildingName}</p>
      ${buildingMatricule ? `<p><strong>${language === 'fr' ? 'Matricule du bâtiment' : language === 'it' ? 'Matricola edificio' : language === 'sp' ? 'Matrícula del edificio' : 'Building Matricule'}:</strong> ${buildingMatricule}</p>` : ''}
      <p><strong>${language === 'fr' ? 'Bloc' : language === 'it' ? 'Blocco' : language === 'sp' ? 'Bloque' : 'Block'}:</strong> ${blocName}</p>
      <p><strong>${language === 'fr' ? 'Appartement' : language === 'it' ? 'Appartamento' : language === 'sp' ? 'Apartamento' : 'Apartment'}:</strong> #${apartmentNumber} (${language === 'fr' ? 'Étage' : language === 'it' ? 'Piano' : language === 'sp' ? 'Piso' : 'Floor'} ${apartmentFloor})</p>
    </div>
    <p style="font-size: 15px; color: #666; margin-bottom: 0;">
      ${language === 'fr' ? 'Veuillez changer votre mot de passe dès que possible pour des raisons de sécurité.' : 
        language === 'it' ? 'Per favore cambia la tua password il prima possibile per ragioni di sicurezza.' :
        language === 'sp' ? 'Por favor cambia tu contraseña lo antes posible por razones de seguridad.' :
        'Please change your password as soon as possible for security reasons.'}
    </p>
  `;

  const htmlContent = createStandardEmailTemplate({
    headerTitle: template.welcome,
    mainContent,
    buttonText: template.loginButton,
    buttonUrl: loginUrl,
    footerText: language === 'fr' ? 'Merci de rejoindre Nestleo !' :
                language === 'it' ? 'Grazie per esserti unito a Nestleo!' :
                language === 'sp' ? '¡Gracias por unirte a Nestleo!' :
                'Thank you for joining Nestleo!'
  });

  const mailOptions = {
    from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
    to: email,
    subject: template.subject,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

// New assignment email for co-owners
const sendNewAssignmentEmail = async (
  email,
  buildingName,
  blocName,
  apartmentNumber,
  apartmentFloor,
  loginUrl,
  language = null
) => {
  // Get user language from database if not provided
  const userLanguage = language || await getUserLanguage(email);
  
  const mailOptions = {
    from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
    to: email,
    subject: userLanguage === 'fr' ? 'Notification d\'attribution de nouveau bâtiment' :
             userLanguage === 'it' ? 'Notifica nuova assegnazione edificio' :
             userLanguage === 'sp' ? 'Notificación de nueva asignación de edificio' :
             'New Building Assignment Notification',
    html: `
      <div style="font-family: Roboto, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <!-- Replace this SVG with your logo or icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" stroke="#0ab39c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 style="text-align: center; color: #0ab39c;">${userLanguage === 'fr' ? 'Nouvelle Attribution de Bâtiment' :
                                                             userLanguage === 'it' ? 'Nuova Assegnazione Edificio' :
                                                             userLanguage === 'sp' ? 'Nueva Asignación de Edificio' :
                                                             'New Building Assignment'}</h2>
        <p style="text-align: center; font-size: 15px; color: #555;">
          ${userLanguage === 'fr' ? 'Vous avez été ajouté comme copropriétaire à :' :
            userLanguage === 'it' ? 'Sei stato aggiunto come comproprietario a:' :
            userLanguage === 'sp' ? 'Has sido agregado como copropietario a:' :
            'You have been added as a co-owner to:'}
        </p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; margin: 15px 0;">
          <p><strong>${userLanguage === 'fr' ? 'Bâtiment' : userLanguage === 'it' ? 'Edificio' : userLanguage === 'sp' ? 'Edificio' : 'Building'}:</strong> ${buildingName}</p>
          <p><strong>${userLanguage === 'fr' ? 'Bloc' : userLanguage === 'it' ? 'Blocco' : userLanguage === 'sp' ? 'Bloque' : 'Block'}:</strong> ${blocName}</p>
          <p><strong>${userLanguage === 'fr' ? 'Appartement' : userLanguage === 'it' ? 'Appartamento' : userLanguage === 'sp' ? 'Apartamento' : 'Apartment'}:</strong> #${apartmentNumber} (${userLanguage === 'fr' ? 'Étage' : userLanguage === 'it' ? 'Piano' : userLanguage === 'sp' ? 'Piso' : 'Floor'} ${apartmentFloor})</p>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${loginUrl}" style="background-color: #405189; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-size: 16px; display: inline-block;">
            ${userLanguage === 'fr' ? 'Se connecter au Syndicat' :
              userLanguage === 'it' ? 'Accedi al Consorzio' :
              userLanguage === 'sp' ? 'Iniciar sesión en el Sindicato' :
              'Login to Syndicate'}
          </a>
        </div>
        <p style="text-align: center; font-size: 14px; color: #777;">
          ${userLanguage === 'fr' ? 'Ce lien expirera dans 1 heure.' :
            userLanguage === 'it' ? 'Questo link scadrà tra 1 ora.' :
            userLanguage === 'sp' ? 'Este enlace expirará en 1 hora.' :
            'This link will expire in 1 hour.'}
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="text-align: center; font-size: 12px; color: #999;">
          ${userLanguage === 'fr' ? 'Merci de rejoindre Nestleo !' :
            userLanguage === 'it' ? 'Grazie per esserti unito a Nestleo!' :
            userLanguage === 'sp' ? '¡Gracias por unirte a Nestleo!' :
            'Thank you for joining Nestleo!'}
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('New assignment email sent to:', email);
  } catch (error) {
    console.error('Error sending new assignment email:', error);
    throw new Error('Failed to send assignment notification');
  }
};


const sendPaymentConfirmationEmail = async (options) => {
  try {
    const {
      coOwnerEmail,
      coOwnerName,
      invoiceData,
      paymentDetails,
      iscash = undefined,
      isDelegateEmail = false,
      delegatedFor = '',
    } = options;

    // Validate input
    if (!coOwnerEmail || !invoiceData?.invoiceNumber || !paymentDetails?.transactionId) {
      throw new Error('Missing required payment confirmation parameters');
    }

    // Setup directories and paths
    const receiptsDir = path.join(__dirname, '../public/receipts');
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }
    const receiptFilename = `receipt_${invoiceData.invoiceNumber}.pdf`;
    const receiptPath = path.join(receiptsDir, receiptFilename);

    // Create PDF
    await generatePaymentReceiptPDF(receiptPath, invoiceData, paymentDetails, iscash);

    // Send email with PDF attachment
    await sendConfirmationEmail({
      to: coOwnerEmail,
      name: coOwnerName,
      invoiceNumber: invoiceData.invoiceNumber,
      symbol: invoiceData.currency.symbol,
      paymentDetails,
      receiptFilename,
      receiptPath,
      iscash,
      isDelegateEmail,
      delegatedFor,
      language: await getUserLanguage(coOwnerEmail) // Get user's language
    });

    return { success: true, receiptPath };

  } catch (error) {
    console.error('Error in sendPaymentConfirmationEmail:', error);
    throw error;
  }
};
async function generatePaymentReceiptPDF(receiptPath, invoiceData, paymentDetails, iscash = undefined) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 30,
      size: 'A4',
      bufferPages: true
    });

    const stream = fs.createWriteStream(receiptPath);
    doc.pipe(stream);

    // ========= HEADER SECTION (unchanged) =========
    let y = 50;
    // Header background block
    doc.save();
    doc.rect(30, y, 540, 100)
      .fill('#0ab39c'); // Deep teal background
    doc.restore();

    // Company logo on the left
    const logoPath = path.join(__dirname, '../public/images/idw1MjGaM1_logos.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, y + 10, { width: 100 });
    } else {
      console.warn('Logo not found at path:', logoPath);
    }

    // Company details on the right, white text on dark background
    doc.fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('Nestleo Property Management', 150, y + 20, {
        align: 'right',
        width: 360
      })
      .font('Helvetica')
      .fontSize(12)
      .text('Centre Cléopâtre, Centre Urbain Nord', 150, y + 45, {
        align: 'right',
        width: 360
      })
      .text('4ème étage, bloc B', 150, y + 60, {
        align: 'right',
        width: 360
      })
      .text('Phone: (123) 456-7890', 150, y + 75, {
        align: 'right',
        width: 360
      });
    doc.moveDown(3);

    // ========= BODY SECTION: CREATIVE TABLE VIEW =========
    // Define table parameters
    const tableLeft = 30;
    const tableWidth = 540;
    const rowHeight = 30;
    const tableTop = doc.y + 10;

    // Prepare the rows to display in the table
    const rows = [
      { label: "Invoice #", value: invoiceData.invoiceNumber },
      { label: "Paid On", value: new Date(paymentDetails.date).toLocaleString() },
      { label: iscash ? "Receipt Number" : "Transaction ID", value: paymentDetails.transactionId },
      { label: "Amount Paid", value: `${invoiceData.currencySymbol} ${paymentDetails.amount.toFixed(2)}` },
      { label: "Payment Method", value: paymentDetails.method }
    ];

    // Draw table header
    doc.lineWidth(1);
    // Header background: a soft blue color
    doc.rect(tableLeft, tableTop, tableWidth, rowHeight)
      .fill('#e8f4fc');
    // Header text: centered bold
    doc.fillColor('#0ab39c')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('PAYMENT SUMMARY', tableLeft, tableTop + 7, {
        width: tableWidth,
        align: 'center'
      });
    // Draw header bottom border
    doc.moveTo(tableLeft, tableTop + rowHeight)
      .lineTo(tableLeft + tableWidth, tableTop + rowHeight)
      .strokeColor('#0ab39c')
      .stroke();

    // Draw each row with alternating background colors
    rows.forEach((row, i) => {
      const currentY = tableTop + rowHeight * (i + 1);
      // Alternate row background: light gray for even rows, white for odd rows
      const fillColor = i % 2 === 0 ? '#f7f7f7' : '#ffffff';
      doc.rect(tableLeft, currentY, tableWidth, rowHeight).fill(fillColor);

      // Left cell: Label
      doc.fillColor('#333333')
        .font('Helvetica')
        .fontSize(12)
        .text(row.label, tableLeft + 10, currentY + 8, {
          width: tableWidth / 2 - 10,
        });

      // Right cell: Value, in bold
      doc.fillColor('#000000')
        .font('Helvetica-Bold')
        .text(row.value, tableLeft + tableWidth / 2, currentY + 8, {
          width: tableWidth / 2 - 20,
          align: 'left'
        });

      // Draw a horizontal line after each row
      doc.moveTo(tableLeft, currentY + rowHeight)
        .lineTo(tableLeft + tableWidth, currentY + rowHeight)
        .strokeColor('#cccccc')
        .stroke();
    });

    // Draw outer border around the table
    const tableHeight = rowHeight * (rows.length + 1);
    doc.rect(tableLeft, tableTop, tableWidth, tableHeight).stroke('#cccccc');

    // ========= FOOTER SECTION =========
    // Draw a decorative line before the footer text
    doc.moveTo(30, doc.page.height - 80)
      .lineTo(570, doc.page.height - 80)
      .lineWidth(1)
      .strokeColor('#cccccc')
      .stroke();

    // Footer text: italic and centered
    doc.font('Helvetica-Oblique')
      .fontSize(10)
      .fillColor('#555555')
      .text('This is an automatically generated receipt. Thank you for your payment.', 30, doc.page.height - 70, {
        align: 'center'
      });

    // Finalize PDF file
    doc.end();

    stream.on('finish', () => {
      console.log(`Receipt generated at: ${receiptPath}`);
      resolve();
    });

    stream.on('error', (err) => {
      console.error('Error generating PDF:', err);
      reject(err);
    });
  });
}






async function sendConfirmationEmail({ to, name, invoiceNumber, paymentDetails, receiptFilename, receiptPath, symbol, iscash = undefined, language = null, isDelegateEmail = false, delegatedFor = '' }) {
  // Get user language from database if not provided
  const userLanguage = language || await getUserLanguage(to);
  const template = emailTemplates.paymentConfirmation[userLanguage] || emailTemplates.paymentConfirmation.en;
  
  // Delegate-specific content
  const delegateInfo = isDelegateEmail ? `
    <div style="background-color: #e7f3ff; color: #004085; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #007bff;">
      <h4 style="margin: 0 0 10px 0; color: #004085;">Payment Delegate Notification</h4>
      <p style="margin: 5px 0;"><strong>Payment made for:</strong> ${delegatedFor}</p>
      <p style="margin: 5px 0;">You received this confirmation as the payment delegate for this invoice.</p>
      ${paymentDetails.delegateAmount > 0 ? `<p style="margin: 5px 0;"><strong>Your delegate amount:</strong> ${symbol}${paymentDetails.delegateAmount.toFixed(2)}</p>` : ''}
      ${paymentDetails.sharedPercentage > 0 ? `<p style="margin: 5px 0;"><strong>Shared percentage:</strong> ${paymentDetails.sharedPercentage}%</p>` : ''}
    </div>
  ` : '';

  const emailSubject = isDelegateEmail 
    ? `${template.subject} #${invoiceNumber} - Delegate for ${delegatedFor}`
    : `${template.subject} #${invoiceNumber}`;

  const emailTitle = isDelegateEmail
    ? 'Payment Confirmation - Delegate'
    : template.title;
  
  const mailOptions = {
    from: `"Nestleo  Property Management" <${process.env.EMAIL_USERNAME}>`,
    to,
    subject: emailSubject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="background-color: #0ab39c; padding: 20px; color: white; text-align: center;">
          <h1>${emailTitle}</h1>
        </div>
        
        <div style="padding: 20px;">
          <p>${userLanguage === 'fr' ? 'Cher' : userLanguage === 'it' ? 'Caro' : userLanguage === 'sp' ? 'Estimado' : 'Dear'} ${name},</p>
          <p>${isDelegateEmail ? `Payment has been confirmed for invoice #${invoiceNumber} for ${delegatedFor}.` : `${template.message} #${invoiceNumber}.`}</p>
          ${delegateInfo}
          <div style="background-color: #d1e7dd; color: #0f5132; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin-top: 0;">${userLanguage === 'fr' ? 'Détails du paiement' : userLanguage === 'it' ? 'Dettagli del pagamento' : userLanguage === 'sp' ? 'Detalles del pago' : 'Payment Details'}</h3>
            <p><strong>${template.amountPaid}:</strong> ${symbol}${paymentDetails.amount.toFixed(2)}</p>
            <p><strong>${template.datePaid}:</strong> ${new Date(paymentDetails.date).toLocaleString()}</p>
            <p><strong>${iscash ? template.receiptNumber : template.transactionId}:</strong> ${paymentDetails.transactionId}</p>
          </div>
          <p>${template.receiptAttached}</p>
          <p>${template.thankYou}</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: receiptFilename,
        path: receiptPath,
        contentType: 'application/pdf'
      },
      {
        filename: `invoice_${invoiceNumber}.pdf`,
        path: path.join(__dirname, `../public/invoices/invoice_${invoiceNumber}.pdf`)
      }
    ]
  };

  await transporter.sendMail(mailOptions);
}

const sendEmailConatact = async ({ from, to, subject, html }) => {
  try {
    if (!to || !subject || !html) {
      throw new Error('Missing required email parameters');
    }

    const mailOptions = {
      from: from || `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    return { messageId: info.messageId };
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw error;
  }
};

// Send delegate invitation email
const sendDelegateInvitationEmail = async ({ delegateEmail, delegatorName, delegateName, delegationType, activationToken, buildings }) => {
  try {
    const language = await getUserLanguage(delegateEmail);
    
    const templates = {
      en: {
        subject: 'Delegation Invitation - Nestleo',
        title: 'You have been assigned as a delegate',
        greeting: delegateName ? `Hello ${delegateName},` : `Hello,`,
        message: `${delegatorName} has assigned you as their delegate for ${delegationType} in the following buildings: ${buildings}.`,
        meetingInfo: 'For meeting participation, please click the activation link below to confirm your availability.',
        paymentInfo: 'For payment delegation, the assignment is now active.',
        activateButton: 'Activate Delegation',
        footer: 'This link will expire in 24 hours.'
      },
      fr: {
        subject: 'Invitation de délégation - Nestleo',
        title: 'Vous avez été désigné comme délégué',
        greeting: delegateName ? `Bonjour ${delegateName},` : `Bonjour,`,
        message: `${delegatorName} vous a désigné comme délégué pour ${delegationType} dans les bâtiments suivants : ${buildings}.`,
        meetingInfo: 'Pour la participation aux réunions, veuillez cliquer sur le lien d\'activation ci-dessous pour confirmer votre disponibilité.',
        paymentInfo: 'Pour la délégation de paiement, l\'attribution est maintenant active.',
        activateButton: 'Activer la délégation',
        footer: 'Ce lien expirera dans 24 heures.'
      }
    };

    const template = templates[language] || templates.en;
    const activationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/delegate/activate/${activationToken}`;

    const html = `
      <div style="font-family: Roboto, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" stroke="#0ab39c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <path d="m17 11 2 2 4-4"></path>
          </svg>
        </div>
        <h2 style="text-align: center; color: #0ab39c;">${template.title}</h2>
        <p>${template.greeting}</p>
        <p>${template.message}</p>
        ${delegationType === 'meeting' || delegationType === 'both' ? `<p><strong>${template.meetingInfo}</strong></p>` : ''}
        ${delegationType === 'payment' || delegationType === 'both' ? `<p><strong>${template.paymentInfo}</strong></p>` : ''}
        ${(delegationType === 'meeting' || delegationType === 'both') ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activationUrl}" style="background-color: #0ab39c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              ${template.activateButton}
            </a>
          </div>
          <p style="color: #666; font-size: 12px; text-align: center;">${template.footer}</p>
        ` : ''}
        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
          Powered by Nestleo
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"Nestleo" <${process.env.EMAIL_USER}>`,
      to: delegateEmail,
      subject: template.subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Delegate invitation email sent to ${delegateEmail}`);
  } catch (error) {
    console.error('Failed to send delegate invitation email:', error.message);
    throw error;
  }
};

// Send delegate activation notification email to owner
const sendDelegateActivationNotificationEmail = async ({ ownerEmail, ownerName, delegateEmail }) => {
  try {
    const language = await getUserLanguage(ownerEmail);
    
    const templates = {
      en: {
        subject: 'Delegate Activated - Nestleo',
        title: 'Your delegate has confirmed participation',
        message: `Good news! Your delegate ${delegateEmail} has confirmed their participation and is now active for meeting representation.`,
        nextSteps: 'Future meeting invitations will be sent to your delegate, with you in copy (CC).'
      },
      fr: {
        subject: 'Délégué activé - Nestleo',
        title: 'Votre délégué a confirmé sa participation',
        message: `Bonne nouvelle ! Votre délégué ${delegateEmail} a confirmé sa participation et est maintenant actif pour la représentation en réunion.`,
        nextSteps: 'Les futures invitations aux réunions seront envoyées à votre délégué, avec vous en copie (CC).'
      }
    };

    const template = templates[language] || templates.en;

    const html = `
      <div style="font-family: Roboto, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
        </div>
        <h2 style="text-align: center; color: #28a745;">${template.title}</h2>
        <p>Hello ${ownerName},</p>
        <p>${template.message}</p>
        <p><strong>${template.nextSteps}</strong></p>
        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
          Powered by Nestleo
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"Nestleo" <${process.env.EMAIL_USER}>`,
      to: ownerEmail,
      subject: template.subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Delegate activation notification sent to ${ownerEmail}`);
  } catch (error) {
    console.error('Failed to send delegate activation notification:', error.message);
    throw error;
  }
};

// Send meeting invitation with delegate handling
const sendMeetingInvitationWithDelegate = async ({ eventId, eventTitle, eventDate, eventTime, meetingLink, participants }) => {
  try {
    for (const participant of participants) {
      const { userId, email, name, isDelegate, delegatorEmail, delegatorName } = participant;
      const language = await getUserLanguage(email);
      
      const templates = {
        en: {
          subject: isDelegate 
            ? `Meeting Invitation (as delegate) - ${eventTitle}` 
            : `Meeting Invitation - ${eventTitle}`,
          title: isDelegate 
            ? `You are invited as a delegate to: ${eventTitle}`
            : `You are invited to: ${eventTitle}`,
          representingText: isDelegate 
            ? `You are representing: ${delegatorName} (${delegatorEmail})`
            : '',
          joinButton: 'Join Meeting'
        },
        fr: {
          subject: isDelegate 
            ? `Invitation à la réunion (en tant que délégué) - ${eventTitle}` 
            : `Invitation à la réunion - ${eventTitle}`,
          title: isDelegate 
            ? `Vous êtes invité en tant que délégué à : ${eventTitle}`
            : `Vous êtes invité à : ${eventTitle}`,
          representingText: isDelegate 
            ? `Vous représentez : ${delegatorName} (${delegatorEmail})`
            : '',
          joinButton: 'Rejoindre la réunion'
        }
      };

      const template = templates[language] || templates.en;

      const html = `
        <div style="font-family: Roboto, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" stroke="#0ab39c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h2 style="text-align: center; color: #0ab39c;">${template.title}</h2>
          <p>Hello ${name},</p>
          ${isDelegate ? `<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 10px; margin: 15px 0;">
            <strong>${template.representingText}</strong>
          </div>` : ''}
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Date:</strong> ${eventDate}</p>
            <p><strong>Time:</strong> ${eventTime}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${meetingLink}" style="background-color: #0ab39c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              ${template.joinButton}
            </a>
          </div>
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
            Powered by Nestleo
          </p>
        </div>
      `;

      const mailOptions = {
        from: `"Nestleo" <${process.env.EMAIL_USER}>`,
        to: email,
        cc: isDelegate ? delegatorEmail : undefined,
        subject: template.subject,
        html
      };

      await transporter.sendMail(mailOptions);
      console.log(`Meeting invitation sent to ${email}${isDelegate ? ` (delegate for ${delegatorEmail})` : ''}`);
    }
  } catch (error) {
    console.error('Failed to send meeting invitations:', error.message);
    throw error;
  }
};

// Send transfer confirmation email
const sendTransferConfirmationEmail = async (newEmail, oldEmail, confirmUrl, firstName, lastName, language = 'en') => {
  try {
    const template = emailTemplates.transferConfirmation[language] || emailTemplates.transferConfirmation.en;

    const mainContent = `
      <div style="margin: 20px 0;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          ${template.message.replace('{oldEmail}', oldEmail)}
        </p>
        
        <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">${template.oldEmail}:</strong>
            <span style="color: #6c757d; margin-left: 10px;">${oldEmail}</span>
          </div>
          
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">${template.newEmail}:</strong>
            <span style="color: #0ab39c; margin-left: 10px; font-weight: 600;">${newEmail}</span>
          </div>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h4 style="color: #856404; margin-bottom: 10px; font-size: 16px;">
            ⚠️ ${template.warningTitle}
          </h4>
          <p style="margin: 0; color: #856404; font-size: 14px;">
            ${template.warningMessage.replace('{oldEmail}', oldEmail)}
          </p>
        </div>
        
        <div style="background-color: #e7f3f0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ab39c;">
          <p style="margin: 0; color: #155724; font-size: 14px;">
            <strong>⏰ ${template.expiryNote}</strong>
          </p>
        </div>
      </div>
    `;

    const html = createStandardEmailTemplate({
      headerTitle: template.title,
      mainContent,
      buttonText: template.confirmButton,
      buttonUrl: confirmUrl,
      footerText: template.thankYou
    });

    const mailOptions = {
      from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
      to: newEmail,
      subject: template.subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Transfer confirmation email sent to ${newEmail}`);
    
  } catch (error) {
    console.error('Failed to send transfer confirmation email:', error.message);
    throw error;
  }
};

// Send transfer confirmation notification to original email
const sendTransferConfirmationNotificationEmail = async (oldEmail, newEmail, firstName, lastName, language = 'en') => {
  try {
    const template = emailTemplates.transferConfirmationNotification[language] || emailTemplates.transferConfirmationNotification.en;

    const mainContent = `
      <div style="margin: 20px 0;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          ${template.message.replace('{newEmail}', newEmail)}
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #0ab39c; margin-bottom: 15px; font-size: 18px;">
            ${template.nextSteps}
          </h4>
          <p style="font-size: 15px; color: #333;">
            ${template.finalizeInstructions}
          </p>
        </div>
        
        <div style="background-color: #e7f3f0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ab39c;">
          <p style="margin: 0; color: #155724; font-size: 14px;">
            <strong>⏰ ${template.expiryNote}</strong>
          </p>
        </div>
      </div>
    `;

    const html = createStandardEmailTemplate({
      headerTitle: template.title,
      mainContent,
      footerText: template.thankYou
    });

    const mailOptions = {
      from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
      to: oldEmail,
      subject: template.subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Transfer confirmation notification email sent to ${oldEmail}`);
    
  } catch (error) {
    console.error('Failed to send transfer confirmation notification email:', error.message);
    throw error;
  }
};

// Send account transfer notification email
const sendAccountTransferEmail = async (oldEmail, newEmail, newPassword, firstName, lastName, language = 'en') => {
  try {
    const template = emailTemplates.accountTransfer[language] || emailTemplates.accountTransfer.en;
    const transferDate = new Date().toLocaleString();
    const loginUrl = `${process.env.CLIENT_URL}/connect`;

    const mainContent = `
      <div style="margin: 20px 0;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          ${template.message}
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #0ab39c; margin-bottom: 15px; font-size: 18px;">
            ${template.details}
          </h4>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">${template.oldEmail}:</strong>
            <span style="color: #6c757d; margin-left: 10px;">${oldEmail}</span>
          </div>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">${template.newEmail}:</strong>
            <span style="color: #0ab39c; margin-left: 10px; font-weight: 600;">${newEmail}</span>
          </div>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">${template.newPassword}:</strong>
            <span style="background-color: #fff; padding: 4px 8px; border: 1px solid #dee2e6; border-radius: 4px; font-family: monospace; margin-left: 10px;">${newPassword}</span>
          </div>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">${template.transferDate}:</strong>
            <span style="color: #6c757d; margin-left: 10px;">${transferDate}</span>
          </div>
        </div>
        
        <div style="background-color: #e7f3f0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ab39c;">
          <p style="margin: 0; color: #155724; font-size: 14px;">
            <strong>📧 ${template.loginInfo}</strong>
          </p>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>🔒 ${template.securityNote}</strong>
          </p>
        </div>
      </div>
    `;

    // Get the appropriate button text based on the language
    let buttonText = 'Login to Your Account';
    if (language === 'fr') {
      buttonText = 'Connectez-vous à votre compte';
    } else if (language === 'it') {
      buttonText = 'Accedi al tuo account';
    } else if (language === 'sp') {
      buttonText = 'Inicia sesión en tu cuenta';
    }
    
    const html = createStandardEmailTemplate({
      headerTitle: template.title,
      mainContent,
      buttonText: buttonText,
      buttonUrl: loginUrl,
      footerText: template.thankYou
    });

    const mailOptions = {
      from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
      to: newEmail,
      subject: template.subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Account transfer notification sent to ${newEmail}`);
    
  } catch (error) {
    console.error('Failed to send account transfer email:', error.message);
    throw error;
  }
};

// Send building transfer confirmation email
const sendBuildingTransferConfirmationEmail = async (targetEmail, currentOwnerEmail, confirmUrl, firstName, lastName, building, language = 'en') => {
  try {
    const template = emailTemplates.buildingTransferConfirmation[language] || emailTemplates.buildingTransferConfirmation.en;

    const mainContent = `
      <div style="margin: 20px 0;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          ${template.message}
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #0ab39c; margin-bottom: 15px; font-size: 18px;">
            ${template.buildingInfo}
          </h4>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">Building Name:</strong>
            <span style="color: #0ab39c; margin-left: 10px; font-weight: 600;">${building.name}</span>
          </div>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">Matricule:</strong>
            <span style="color: #6c757d; margin-left: 10px;">${building.matricule}</span>
          </div>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">Address:</strong>
            <span style="color: #6c757d; margin-left: 10px;">${building.address_number} ${building.address_street}, ${building.address_city}, ${building.address_country}</span>
          </div>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">${template.currentOwner}:</strong>
            <span style="color: #6c757d; margin-left: 10px;">${currentOwnerEmail}</span>
          </div>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">${template.newOwner}:</strong>
            <span style="color: #0ab39c; margin-left: 10px; font-weight: 600;">${targetEmail}</span>
          </div>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h4 style="color: #856404; margin-bottom: 10px; font-size: 16px;">
            ⚠️ ${template.warningTitle}
          </h4>
          <p style="margin: 0; color: #856404; font-size: 14px;">
            ${template.warningMessage}
          </p>
        </div>
        
        <div style="background-color: #e7f3f0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ab39c;">
          <p style="margin: 0; color: #155724; font-size: 14px;">
            <strong>⏰ ${template.expiryNote}</strong>
          </p>
        </div>
      </div>
    `;

    const html = createStandardEmailTemplate({
      headerTitle: template.title,
      mainContent,
      buttonText: template.confirmButton,
      buttonUrl: confirmUrl,
      footerText: template.thankYou
    });

    const mailOptions = {
      from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
      to: targetEmail,
      subject: template.subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Building transfer confirmation email sent to ${targetEmail}`);
    
  } catch (error) {
    console.error('Failed to send building transfer confirmation email:', error.message);
    throw error;
  }
};

// Send building transfer notification email to current owner
const sendBuildingTransferNotificationEmail = async (currentOwnerEmail, recipientEmail, building, firstName, language = 'en') => {
  try {
    const template = emailTemplates.buildingTransferNotification[language] || emailTemplates.buildingTransferNotification.en;
    const settingsUrl = `${process.env.CLIENT_URL}/BuildingInterface`;

    const mainContent = `
      <div style="margin: 20px 0;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          ${template.message}
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #0ab39c; margin-bottom: 15px; font-size: 18px;">
            ${template.buildingInfo}
          </h4>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">Building Name:</strong>
            <span style="color: #0ab39c; margin-left: 10px; font-weight: 600;">${building.name}</span>
          </div>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">Matricule:</strong>
            <span style="color: #6c757d; margin-left: 10px;">${building.matricule}</span>
          </div>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #495057;">${template.recipient}:</strong>
            <span style="color: #0ab39c; margin-left: 10px; font-weight: 600;">${recipientEmail}</span>
          </div>
        </div>
        
        <div style="background-color: #e7f3f0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ab39c;">
          <h4 style="color: #155724; margin-bottom: 10px; font-size: 16px;">
            📋 ${template.nextSteps}
          </h4>
          <p style="margin: 0; color: #155724; font-size: 14px;">
            ${template.nextStepsMessage}
          </p>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h4 style="color: #856404; margin-bottom: 10px; font-size: 16px;">
            ⚠️ ${template.warningTitle}
          </h4>
          <p style="margin: 0; color: #856404; font-size: 14px;">
            ${template.warningMessage}
          </p>
        </div>
      </div>
    `;

    const html = createStandardEmailTemplate({
      headerTitle: template.title,
      mainContent,
      buttonText: 'Go to Building details',
      buttonUrl: settingsUrl,
      footerText: template.thankYou
    });

    const mailOptions = {
      from: `"Nestleo" <${process.env.EMAIL_USERNAME}>`,
      to: currentOwnerEmail,
      subject: template.subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Building transfer notification email sent to ${currentOwnerEmail}`);
    
  } catch (error) {
    console.error('Failed to send building transfer notification email:', error.message);
    throw error;
  }
};

module.exports = {
  sendEmailConatact, 
  sendInvoiceEmailToAllCoOwners,
  generateAndSaveInvoicePDF, 
  sendPaymentConfirmationEmail, 
  sendInvoiceEmail, 
  sendNewAssignmentEmail, 
  sendToggleUserDeactivateEmail, 
  sendWelcomeEmail, 
  sendPasswordResetEmail, 
  sendToggleUserEmail, 
  sendWelcomeEmailForCoowners, 
  sendVerificationEmail, 
  getUserLanguage, 
  sendDelegateInvitationEmail, 
  sendDelegateActivationNotificationEmail, 
  sendMeetingInvitationWithDelegate,
  sendTransferConfirmationEmail,
  sendTransferConfirmationNotificationEmail,
  sendAccountTransferEmail,
  sendBuildingTransferConfirmationEmail,
  sendBuildingTransferNotificationEmail
};
