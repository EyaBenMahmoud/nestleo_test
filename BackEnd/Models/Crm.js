const mongoose = require('mongoose');

// Define schema for policy content with all supported languages
const policyContentSchema = new mongoose.Schema({
    en: {
        content: {
            type: String,
            required: true
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    fr: {
        content: {
            type: String,
            default: ''
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    sp: {
        content: {
            type: String,
            default: ''
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    it: {
        content: {
            type: String,
            default: ''
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }
}, { _id: false, strict: false }); // Added strict: false to allow dynamic language fields

const crmSchema = new mongoose.Schema({
    WebsiteUrl: {
        type: String,
        required: true,
        default: "https://www.elitecom.com.tn"
    },
    address: {
        type: String,
        default: "Immeuble CLEOPATRE, Bureau C4-1, Centre Urbain Nord, Tunis 1082, TN"
    },
    email: {
        type: String,
        default: "contact@elitecom.com.tn"
    },
    phoneNumber: {
        type: String,
        default: "+216 70 033 062"
    },
    policies: {
        termsAndConditions: policyContentSchema,
        cookiePolicy: policyContentSchema,
        privacyPolicy: policyContentSchema
    },
    supportedLanguages: {
        type: [String],
        default: ['en', 'fr', 'sp', 'it']
    }
}, {
    timestamps: true
});

// Initialize default policies for all languages
crmSchema.pre('save', function(next) {
    if (this.isNew) {
        const defaultPolicies = {
            termsAndConditions: {
                en: {
                    content: `<h5>Welcome to Nestleo!</h5>
                    <p>These terms and conditions outline the rules and regulations for the use of Nestleo's platform and services.</p>
                    <p>By accessing our platform, we assume you accept these terms and conditions. Do not continue to use Nestleo if you do not agree to take all of the terms and conditions stated on this page.</p>
                    <h5>Definitions</h5>
                    <p>In these Terms and Conditions, "we", "us", and "our" refers to Nestleo. "Platform" refers to our website and services. "User", "you" and "your" refers to the person accessing this platform.</p>
                    <h5>License</h5>
                    <p>Unless otherwise stated, Nestleo owns the intellectual property rights for all material on the platform. All intellectual property rights are reserved.</p>
                    <p>You must not:</p>
                    <ul>
                      <li>Republish material from our platform</li>
                      <li>Sell, rent or sub-license material from our platform</li>
                      <li>Reproduce, duplicate or copy material from our platform</li>
                      <li>Redistribute content from our platform</li>
                    </ul>
                    <h5>Restrictions</h5>
                    <p>You are specifically restricted from all of the following:</p>
                    <ul>
                      <li>Using our platform in any way that is damaging, or may be damaging, to the platform</li>
                      <li>Using our platform in any way that impacts user access to the platform</li>
                      <li>Using our platform contrary to applicable laws and regulations, or in any way may cause harm to the platform, or to any person or business entity</li>
                      <li>Engaging in any data mining, data harvesting, data extracting or any other similar activity in relation to our platform</li>
                    </ul>
                    <h5>Governing Law</h5>
                    <p>These Terms shall be governed and construed in accordance with the laws applicable in your jurisdiction, without regard to its conflict of law provisions.</p>`,
                    lastUpdated: new Date()
                },
                fr: {
                    content: `<h5>Bienvenue sur Nestleo !</h5>
                    <p>Ces termes et conditions définissent les règles et réglementations pour l'utilisation de la plateforme et des services de Nestleo.</p>
                    <p>En accédant à notre plateforme, nous supposons que vous acceptez ces termes et conditions. Ne continuez pas à utiliser Nestleo si vous n'acceptez pas tous les termes et conditions énoncés sur cette page.</p>`,
                    lastUpdated: new Date()
                },
                sp: {
                    content: `<h5>¡Bienvenido a Nestleo!</h5>
                    <p>Estos términos y condiciones describen las reglas y regulaciones para el uso de la plataforma y servicios de Nestleo.</p>
                    <p>Al acceder a nuestra plataforma, asumimos que acepta estos términos y condiciones. No continúe usando Nestleo si no está de acuerdo con todos los términos y condiciones establecidos en esta página.</p>`,
                    lastUpdated: new Date()
                },
                it: {
                    content: `<h5>Benvenuto su Nestleo!</h5>
                    <p>Questi termini e condizioni definiscono le regole e i regolamenti per l'utilizzo della piattaforma e dei servizi di Nestleo.</p>
                    <p>Accedendo alla nostra piattaforma, presumiamo che tu accetti questi termini e condizioni. Non continuare a utilizzare Nestleo se non accetti tutti i termini e le condizioni stabiliti in questa pagina.</p>`,
                    lastUpdated: new Date()
                }
            },
            cookiePolicy: {
                en: {
                    content: `<h5>What Are Cookies</h5>
                    <p>As is common practice with almost all professional websites, Nestleo uses cookies, which are small files that are downloaded to your device, to improve your experience.</p>
                    <p>This page describes what information they gather, how we use it, and why we sometimes need to store these cookies. We will also share how you can prevent these cookies from being stored, however, this may downgrade or 'break' certain elements of the site's functionality.</p>`,
                    lastUpdated: new Date()
                },
                fr: {
                    content: `<h5>Que sont les cookies</h5>
                    <p>Comme c'est une pratique courante sur presque tous les sites Web professionnels, Nestleo utilise des cookies, qui sont de petits fichiers téléchargés sur votre appareil, pour améliorer votre expérience.</p>
                    <p>Cette page décrit les informations qu'ils recueillent, comment nous les utilisons et pourquoi nous avons parfois besoin de stocker ces cookies. Nous partagerons également comment vous pouvez empêcher le stockage de ces cookies, cependant, cela peut dégrader ou 'casser' certains éléments de la fonctionnalité du site.</p>`,
                    lastUpdated: new Date()
                },
                sp: {
                    content: `<h5>Qué Son las Cookies</h5>
                    <p>Como sp práctica común en casi todos los sitios web profesionales, Nestleo utiliza cookies, que son pequeños archivos que se descargan en su dispositivo, para mejorar su experiencia.</p>
                    <p>Esta página describe qué información recopilan, cómo la usamos y por qué a veces necesitamos almacenar estas cookies. También compartiremos cómo puede evitar que estas cookies se almacenen, sin embargo, esto puede degradar o "romper" ciertos elementos de la funcionalidad del sitio.</p>`,
                    lastUpdated: new Date()
                },
                it: {
                    content: `<h5>Cosa Sono i Cookie</h5>
                    <p>Come è pratica comune in quasi tutti i siti web professionali, Nestleo utilizza i cookie, che sono piccoli file scaricati sul tuo dispositivo, per migliorare la tua esperienza.</p>
                    <p>Questa pagina descrive quali informazioni raccolgono, come le utilizziamo e perché a volte abbiamo bisogno di memorizzare questi cookie. Condivideremo anche come è possibile impedire la memorizzazione di questi cookie, tuttavia ciò potrebbe declassare o "rompere" alcuni elementi della funzionalità del sito.</p>`,
                    lastUpdated: new Date()
                }
            },
            privacyPolicy: {
                en: {
                    content: `<h5>Privacy Policy for Nestleo</h5>
                    <p>At Nestleo, one of our main priorities is the privacy of our users. This Privacy Policy document contains information that is collected and recorded by Nestleo and how we use it.</p>
                    <p>If you have additional questions or require more information about our Privacy Policy, please contact us at support@nestleo.com.</p>`,
                    lastUpdated: new Date()
                },
                fr: {
                    content: `<h5>Politique de confidentialité pour Nestleo</h5>
                    <p>Chez Nestleo, l'une de nos principales priorités est la confidentialité de nos utilisateurs. Ce document de politique de confidentialité contient des informations qui sont collectées et enregistrées par Nestleo et comment nous les utilisons.</p>
                    <p>Si vous avez des questions supplémentaires ou souhaitez plus d'informations sur notre politique de confidentialité, veuillez nous contacter à support@nestleo.com.</p>`,
                    lastUpdated: new Date()
                },
                sp: {
                    content: `<h5>Política de Privacidad para Nestleo</h5>
                    <p>En Nestleo, una de nuestras principales prioridades sp la privacidad de nuestros usuarios. Este documento de Política de Privacidad contiene información que sp recopilada y registrada por Nestleo y cómo la utilizamos.</p>
                    <p>Si tiene preguntas adicionales o necesita más información sobre nuestra Política de Privacidad, contáctenos en support@nestleo.com.</p>`,
                    lastUpdated: new Date()
                },
                it: {
                    content: `<h5>Politica sulla Privacy per Nestleo</h5>
                    <p>In Nestleo, una delle nostre priorità principali è la privacy dei nostri utenti. Questo documento sulla Politica sulla Privacy contiene informazioni raccolte e registrate da Nestleo e come le utilizziamo.</p>
                    <p>Se hai domande aggiuntive o hai bisogno di ulteriori informazioni sulla nostra Politica sulla Privacy, contattaci all'indirizzo support@nestleo.com.</p>`,
                    lastUpdated: new Date()
                }
            }
        };
        
        this.policies = defaultPolicies;
    }
    next();
});

const CRM = mongoose.model('CRM', crmSchema);
module.exports = CRM;