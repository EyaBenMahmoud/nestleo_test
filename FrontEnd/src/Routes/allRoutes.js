import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
//login user 
import FreePackInfo from '../pages/FreePackInfo';


//Dashboard
import DashboardEcommerce from "../pages/DashboardEcommerce";


//Chat
import Chat from "../pages/Chat";

//Invoices
import InvoiceList from "../pages/Invoices/InvoiceList";
import InvoiceCreate from "../pages/Invoices/InvoiceCreate";
import InvoiceDetails from "../pages/Invoices/InvoiceDetails";

import ApartmentsList from "../Components/Buildings/apartements";
//Icon pages
import RemixIcons from "../pages/Icons/RemixIcons/RemixIcons";
import BoxIcons from "../pages/Icons/BoxIcons/BoxIcons";
import MaterialDesign from "../pages/Icons/MaterialDesign/MaterialDesign";
import FeatherIcons from "../pages/Icons/FeatherIcons/FeatherIcons";
import LineAwesomeIcons from "../pages/Icons/LineAwesomeIcons/LineAwesomeIcons";
import CryptoIcons from "../pages/Icons/CryptoIcons/CryptoIcons";


//AuthenticationInner pages
import BasicSignIn from '../pages/AuthenticationInner/Login/BasicSignIn';
import CoverSignIn from '../pages/AuthenticationInner/Login/CoverSignIn';
import BasicSignUp from '../pages/AuthenticationInner/Register/BasicSignUp';
import CoverSignUp from "../pages/AuthenticationInner/Register/CoverSignUp";
import BasicPasswReset from '../pages/AuthenticationInner/PasswordReset/BasicPasswReset';
//pages
import Starter from '../pages/Pages/Starter/Starter';
import SimplePage from '../pages/Pages/Profile/SimplePage/SimplePage';
import Settings from '../pages/Pages/Profile/Settings/Settings';
import Team from '../pages/Pages/Team/Team';
import Timeline from '../pages/Pages/Timeline/Timeline';
import Faqs from '../pages/Pages/Faqs/Faqs';
import Pricing from '../pages/Pages/Pricing/Pricing';
import Gallery from '../pages/Pages/Gallery/Gallery';
import Maintenance from '../pages/Pages/Maintenance/Maintenance';
import ComingSoon from '../pages/Pages/ComingSoon/ComingSoon';
import SiteMap from '../pages/Pages/SiteMap/SiteMap';
import SearchResults from '../pages/Pages/SearchResults/SearchResults';

import CoverPasswReset from '../pages/AuthenticationInner/PasswordReset/CoverPasswReset';
import BasicLockScreen from '../pages/AuthenticationInner/LockScreen/BasicLockScr';
import CoverLockScreen from '../pages/AuthenticationInner/LockScreen/CoverLockScr';
import BasicLogout from '../pages/AuthenticationInner/Logout/BasicLogout';
import CoverLogout from '../pages/AuthenticationInner/Logout/CoverLogout';
import BasicSuccessMsg from '../pages/AuthenticationInner/SuccessMessage/BasicSuccessMsg';
import CoverSuccessMsg from '../pages/AuthenticationInner/SuccessMessage/CoverSuccessMsg';
import BasicTwosVerify from '../pages/AuthenticationInner/TwoStepVerification/BasicTwosVerify';
import CoverTwosVerify from '../pages/AuthenticationInner/TwoStepVerification/CoverTwosVerify';
import Basic404 from '../pages/AuthenticationInner/Errors/Basic404';
import Cover404 from '../pages/AuthenticationInner/Errors/Cover404';
import Alt404 from '../pages/AuthenticationInner/Errors/Alt404';
import Error500 from '../pages/AuthenticationInner/Errors/Error500';

import BasicPasswCreate from "../pages/AuthenticationInner/PasswordCreate/BasicPasswCreate";
import CoverPasswCreate from "../pages/AuthenticationInner/PasswordCreate/CoverPasswCreate";
import Offlinepage from "../pages/AuthenticationInner/Errors/Offlinepage";
import ConfirmTransfer from "../pages/Pages/Auth/ConfirmTransfer";
import BuildingTransferConfirmation from "../pages/Pages/BuildingTransferConfirmation";



//login
import Login from "../pages/Authentication/Login";
import ForgetPasswordPage from "../pages/Authentication/ForgetPassword";
import Logout from "../pages/Authentication/Logout";
import Register from "../pages/Authentication/Register";

// Landing Index
import OnePage from "../pages/Landing/OnePage";
// User Profile
import UserProfile from "../pages/Authentication/user-profile";

import SubscriptionList from "../Components/Subscriptions/SubscriptionList";
import ContractsTable from "../Components/ContractsSuperAdmin/ContractsTable";
import { components } from "react-select";
import UsersComponenet from "../Components/Users/userList";
import AdminsComponenet from "../Components/Users/AdminsComponenet";

import LoginUser from "../Components/Auth/login"
import Registerr from "../Components/Auth/register"
import RegisterSyndicate from "../Components/Auth/registerSyndicate";
import RegisterCoowner from "../Components/Auth/registerCoowner";
import RegisterWorker from "../Components/Auth/registerWorker";
import CoownerList from "../Components/Users/Coownerlist";
import WorkerList from "../Components/Users/WorkerList";
import SyndicateAdmin from "../Components/Users/SynidcateList";
import Contact from "../Components/Contact/Contact";
import CrmAdmin from "../Components/Contact/CrmSetting";
import SelectRoleComponent from "../pages/Landing/OnePage/SelectRoleComponent";
import Redirect from "../Components/Auth/redirectcomponent";
import DirectLogin from "../Components/Auth/DirectLogin";
import VerificationBuilding from "../Components/Auth/verificationBuilding";
import Calendarr from "../Components/Events/Calendar";
import BuildingInput from "../pages/Landing/OnePage/BuildingInput";
import ClaimsList from "../Components/Claims/ClaimsList";
import Coowners from "../pages/Pages/Team/Team";
import Success from "../Components/Auth/SucessRedirect";
import SubscriptionDetails from "../Components/Auth/subriptionDetails";
import BuildingInterface from "../Components/Buildings/buildingsComponent";
import BuildingDetails from "../Components/Buildings/buildingdetails";
import BuildingBlocs from "../Components/Buildings/BlocManagement";
import BuildingApartments from "../Components/Buildings/aprtementManagement";
import CoOwnerInvoiceList from "../pages/Invoices/invoiceListCoOwners";
import InvoiceSuccess from "../Components/Auth/invoiceSuccessRedirect";
import TaskBoard from "../Components/Task/TaskBoard";
import Meeting from "../Components/Events/groqmeet";
import PollCreator from "../Components/Events/PollManagement";
import PollManagementSystem from "../Components/Events/PollMangementArchivedPart";
import BuildingVisualizationPage from "../Components/Buildings/containerComponent";
import { useSelector } from "react-redux";
import WarningModal from "../Components/Common/WarningModal";
import AssistantConfigList from "../Components/PlatformAssistant/AssistantConfigList";
import WorkerReviews from "../Components/Review/WorkerReviews";
import TermsAndConditions from "../pages/Landing/OnePage/TermsAndConditions";
import CookiePolicy from "../pages/Landing/OnePage/CookiePolicy";
import PrivacyPolicy from "../pages/Landing/OnePage/PrivacyPolicy";
import SubscriptionExpiredOverlay from "../Components/Auth/subcriptionExpirePopUp";
import SubscriptionExpiredPage from "../Components/Auth/SubcriptionExpireCompoenet";












// the SubscriptionGuard component to show an overlay instead of blocking access
const SubscriptionGuard = ({ children }) => {
  const { user } = useSelector((state) => state.Loginn || {});
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (user?.role === 'SyndicateAdmin') {
      const hasActiveSubscription = user?.subscription?.status === 'active';

      const isInTrialPeriod = () => {
        if (!user?.createdAt) return false;

        const creationDate = new Date(user.createdAt);
        const currentDate = new Date();
        const trialDuration = 7; // 7 days trial

        // Calculate days since account creation
        const timeDifference = currentDate - creationDate;
        const daysDifference = timeDifference / (1000 * 60 * 60 * 24);

        return daysDifference <= trialDuration;
      };

      const subscriptionExpired = (!hasActiveSubscription && !isInTrialPeriod());

      if (subscriptionExpired) {
        setShowOverlay(true);
      }
    }
  }, [user]);

  return (
    <>
      {children}
      {showOverlay && <SubscriptionExpiredOverlay />}
    </>
  );
};










const authProtectedRoutes = [

// Add this to your routes array
{ 
  path: "/votesmanagement", 
  component: <StandalonePollPage />,
  authRequired: true,
  rolePermissions: ["SyndicateAdmin", "SyndicateCoowner"]
},
  { path: "/meeting/:eventId", component: <Meeting /> },
  { path: "/polls", component: <PollCreator /> },
  { path: "/poll-management", component: <PollManagementSystem /> },
  // Make sure the route is exactly like this:
  {
    path: "/2d/:buildingId/visualization",
    component: <BuildingVisualizationPage />,
    roles: ["SyndicateCoowner", "SyndicateAdmin"] // Add relevant roles
  },
  {
    path: "/users",
    component: <UsersComponenet />,
    roles: ["SuperAdmin"]
  },
  {
    path: "/Gamification",
    component:   <GamificationTab />,
    roles: ["SyndicateAdmin"]
  },
  {
    path: "/review",
    component:   <SubscriptionGuard> <WorkerReviews /></SubscriptionGuard>,
    roles: ["SyndicateAdmin"],
  },
  {
    path: "/reviews",
    component: <WorkerReviews />,
    roles: ["Worker"],
  },
  {
    path: "/assistantConfig",
    component: <AssistantConfigList />,
    roles: ["SuperAdmin", "Admin"]
  },
  {
    path: "/showAdmins",
    component: <AdminsComponenet />,
    roles: ["SuperAdmin"]
  },

  {
    path: "/registerSyndicate",
    component: <RegisterSyndicate />,
    roles: ["SuperAdmin", "Admin"]
  },

  {
    path: "/Workers",
    component: <WorkerList />,
    roles: ["SuperAdmin", "Admin"]
  },

  {
    path: "/SyndicateCoOwner",
    component: <CoownerList />,
    roles: ["SuperAdmin", "Admin", "SyndicateCoowner", "SyndicateAdmin", "Worker"]
  },
  {
    path: "/Apartements",
    component:   <CoownerSubscriptionGuard><ApartmentsList /></CoownerSubscriptionGuard>,
    roles: ["SyndicateCoowner"]
  },
  {
    path: "/calendar",
    component:   <CoownerSubscriptionGuard><SubscriptionGuard> <Calendarr /></SubscriptionGuard></CoownerSubscriptionGuard>,
    roles: ["SyndicateCoowner", "SyndicateAdmin"]
  },
  {
    path: "/Claim",
    component:   <CoownerSubscriptionGuard><SubscriptionGuard> <ClaimsList /> </SubscriptionGuard></CoownerSubscriptionGuard>,
    roles: ["SyndicateCoowner", "SyndicateAdmin"],
  },

  {
    path: "/task",
    component:   <CoownerSubscriptionGuard><SubscriptionGuard>  <TaskBoard /> </ SubscriptionGuard></CoownerSubscriptionGuard>,
    roles: ["SyndicateAdmin", "SyndicateCoowner"],
  },
  {
    path: "/tasks",
    component: <TaskBoard />,
    roles: ["Worker"],
  },
  {
    path: "/syndicate",
    component: <SyndicateAdmin />,
    roles: ["SuperAdmin", "Admin", "SyndicateCoowner", "SyndicateAdmin", "Worker"]
  },
  /////dashborad syndicate 
  //contract&&subcription
  {
    path: "/subscription",
    component: <SubscriptionList />,
    roles: ["SuperAdmin", "Admin"]
  },
  {
    path: "/contract",
    component: <ContractsTable />,
    roles: ["SuperAdmin", "Admin"]
  },
  {
    path: "/contact",
    component: <Contact />,
    roles: ["SuperAdmin", "Admin"]
  },
  {
    path: "/crmAdmin",
    component: <CrmAdmin />,
    roles: ["SuperAdmin", "Admin"]
  },
  { path: "/dashboard", component: <DashboardEcommerce /> },
  { path: "/index", component: <DashboardEcommerce /> },
  /////////////chat  /////////////////////////////////
  {
    path: "/apps-chat", component: (

      <Chat />
    )
  },
  //Invoices
  { path: "/apps-invoices-list", component: <SubscriptionGuard><InvoiceList /></SubscriptionGuard> },
  { path: "/apps-invoices-details/:id", component: <InvoiceDetails /> },
  { path: "/apps-invoices-create", component: <InvoiceCreate /> },
  { path: "/apps-invoices-list-coOwners", component: <CoOwnerInvoiceList /> },
  //Icons
  { path: "/icons-remix", component: <RemixIcons /> },
  { path: "/icons-boxicons", component: <BoxIcons /> },
  { path: "/icons-materialdesign", component: <MaterialDesign /> },
  { path: "/icons-feather", component: <FeatherIcons /> },
  { path: "/icons-lineawesome", component: <LineAwesomeIcons /> },
  { path: "/icons-crypto", component: <CryptoIcons /> },
  //Pages
  { path: "/pages-starter", component: <Starter /> },
  { path: "/profile", component: <SimplePage /> },
  { path: "/pages-profile-settings", component: <Settings /> },
  { path: "/pages-team", component: <Coowners /> },
  { path: "/pages-timeline", component: <Timeline /> },
  { path: "/pages-faqs", component: <Faqs /> },
  { path: "/pages-gallery", component: <Gallery /> },
  { path: "/pages-pricing", component: <Pricing /> },
  { path: "/pages-sitemap", component: <SiteMap /> },
  { path: "/pages-search-results", component: <SearchResults /> },
  //User Profile settings
  { path: "/pages-profile", component: <UserProfile /> },
  //subcription details
  { path: "/subscription", component: <SubscriptionDetails /> },
  { path: "/BuildingInterface", component: <SubscriptionGuard> <BuildingInterface /> </SubscriptionGuard> },
  { path: "/buildings/:buildingId", component: <BuildingDetails /> },
  { path: "/buildings/apartments", component: <BuildingApartments /> },
  { path: "/buildings/blocs", component: <BuildingBlocs /> },
  // this route should be at the end of all other route
  {
    path: "/",
    exact: true,
    component: <Navigate to="/dashboard" />,
  },
];
import TwoFaVerify from "../Components/Auth/TwoFaVerify";
import SuperAdminLogin from "./SuperAdminLogin";
import RoleSelection from "../pages/Landing/OnePage/roleSelection";
import VerifyEmail from "../Components/Auth/verifyEmailRedirect";
import VerifyEmailNotice from "../Components/Auth/verifyemailpage";
import GamificationTab from "../Components/GamificationTab";
import CoownerSubscriptionExpired from "../Components/Subscriptions/coownerSubcripiotnExpired";
import CoownerSubscriptionGuard from "../Components/Subscriptions/coownerSubcriptionGuard";
import StandalonePollPage from "../Components/Events/pollPage";
import AcceptPolicies from "../Components/Auth/AcceptPolicies";
const publicRoutes = [
  // add to publicRoutes (so unauthenticated users can access with temp token)
  { path: "/auth-2fa", component: <TwoFaVerify /> },
  { path: "/coowner-subscription-expired", component: <CoownerSubscriptionExpired /> },
  { path: "/free-pack-info", component: <FreePackInfo /> },
  {path: "/accept-policies", component: <AcceptPolicies />},

  { path: "/essai-expire", component: <SubscriptionExpiredPage /> },

  { path: "/verify-email-notice", component: <VerifyEmailNotice /> },
  { path: "/verify-email", component: <VerifyEmail /> },
  //redirect when sign in with google 
  { path: "/TermsAndConditions", component: <TermsAndConditions /> },
  { path: "/cookie-policy", component: <CookiePolicy /> },
  { path: "/privacy-policy", component: <PrivacyPolicy /> },
  { path: "/redirect", component: <Redirect /> },
  { path: "/verificationBuilding", component: <VerificationBuilding /> },
  { path: "/success", component: <Success /> },
  { path: "/invoices/success", component: <InvoiceSuccess /> },
  //direct login for coowners 
  { path: "/directLogin", component: <DirectLogin /> },
  // Other public routes...
  { path: "/building-input", component: <BuildingInput /> },
  { path: "/selectrole", component: <SelectRoleComponent /> },
  { path: "/RoleSelection", component: <RoleSelection /> },
  { path: "/registerSyndicate", component: <RegisterSyndicate /> },
  { path: "/registerCoowner", component: <RegisterCoowner /> },
  { path: "/registerWorker", component: <RegisterWorker /> },
  { path: "/registerr", component: <Registerr /> },
  { path: "/connect", component: <LoginUser /> },
  // Add this to your publicRoutes array
  { path: "/super-admin", component: <SuperAdminLogin /> },
  // Authentication Page
  { path: "/logout", component: <Logout /> },
  { path: "/login", component: <Login /> },
  { path: "/forgot-password", component: <ForgetPasswordPage /> },
  { path: "/register", component: <Register /> },
  //AuthenticationInner pages
  { path: "/auth-signin-basic", component: <BasicSignIn /> },
  { path: "/auth-signin-cover", component: <CoverSignIn /> },
  { path: "/auth-signup-basic", component: <BasicSignUp /> },
  { path: "/auth-signup-cover", component: <CoverSignUp /> },
  { path: "/auth-pass-reset-basic", component: <BasicPasswReset /> },
  { path: "/auth-pass-reset-cover", component: <CoverPasswReset /> },
  { path: "/auth-lockscreen-basic", component: <BasicLockScreen /> },
  { path: "/auth-lockscreen-cover", component: <CoverLockScreen /> },
  { path: "/auth-logout-basic", component: <BasicLogout /> },
  { path: "/auth-logout-cover", component: <CoverLogout /> },
  { path: "/auth-success-msg-basic", component: <BasicSuccessMsg /> },
  { path: "/auth-success-msg-cover", component: <CoverSuccessMsg /> },
  { path: "/auth-twostep-basic", component: <BasicTwosVerify /> },
  { path: "/auth-twostep-cover", component: <CoverTwosVerify /> },
  { path: "/auth-404-basic", component: <Basic404 /> },
  { path: "/auth-404-cover", component: <Cover404 /> },
  { path: "/auth-404-alt", component: <Alt404 /> },
  { path: "/auth-500", component: <Error500 /> },
  { path: "/pages-maintenance", component: <Maintenance /> },
  { path: "/pages-coming-soon", component: <ComingSoon /> },
  { path: "/landing", component: <OnePage /> },
  ///password reset oussama
  { path: "/auth-pass-change-basic/:token", component: <BasicPasswCreate /> },
  { path: "/auth-pass-change-cover", component: <CoverPasswCreate /> },
  { path: "/confirm-transfer/:token", component: <ConfirmTransfer /> },
  { path: "/auth-offline", component: <Offlinepage /> },
  { path: "/confirm-building-transfer/:token", component: <BuildingTransferConfirmation /> },
  // this route should be at the end of all other routes
  {
    path: "/",
    exact: true,
    component: <Navigate to="/landing" />,
  },
];
const filterRoutesByRole = (routes, userRole) => {
  return routes.filter((route) => {
    if (!route.roles) return true;

    // Filter subRoutes if they exist
    if (route.subRoutes) {
      route.subRoutes = filterRoutesByRole(route.subRoutes, userRole);
    }

    return route.roles.includes(userRole);
  });
};

export { authProtectedRoutes, publicRoutes, filterRoutesByRole }; 