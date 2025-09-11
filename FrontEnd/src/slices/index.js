import { combineReducers } from "redux";

// Front
import LayoutReducer from "./layouts/reducer";
// Authentication oussama
import LoginnReducer from "./login/loginSlice";
import userrReducer from "./users/userSlice";
// calendar  syndicate
import eventReducer from "./Event/eventSlice";
// Authentication
import LoginReducer from "./auth/login/reducer";
import AccountReducer from "./auth/register/reducer";
import ForgetPasswordReducer from "./auth/forgetpwd/reducer";
import ProfileReducer from "./auth/profile/reducer";

//Calendar
import CalendarReducer from "./calendar/reducer";
//Chat
import chatReducer from "./chat/reducer";
// Tasks
import TasksReducer from "./tasks/reducer";
//Invoice
import InvoiceReducer from "./invoice/slice";
// Dashboard Ecommerce
import DashboardEcommerceReducer from "./dashboardEcommerce/reducer";

// Pages > Team
import TeamDataReducer from "./team/reducer";

// API Key
import buildingreducer from "./buildings/building"
import claimsReducer from "../slices/claim/claimsSlice";
import taskReducer from "../slices/Task/taskSlice";

import pollsReducer from "../slices/poll/slice";

//currency reducer 
import notificationReducer from "./Notification/slice";
import CurrencyReducer from "../slices/currency/currency";
import documentReducer from "../slices/Document/documentSlice";
import gamificationReducer from "../slices/gamification/slice";
import assistantConfigReducer from "../slices/Assistant/assistantConfigSlice";
import reviewReducer from "../slices/Review/reviewSlice";

const rootReducer = combineReducers({
        //////////currently using ///////////////////////
    review: reviewReducer,
    assistantConfig:assistantConfigReducer,
    document: documentReducer,
    task: taskReducer,
    claims: claimsReducer,
    events: eventReducer,
    Userss:userrReducer ,
    Loginn:LoginnReducer,
    Building:buildingreducer,
    Invoice: InvoiceReducer,

    Currency: CurrencyReducer,

    notifications: notificationReducer,
    polls: pollsReducer,
    gamification: gamificationReducer,
/////////////////////////////////
    Layout: LayoutReducer,
    Login: LoginReducer,
    Account: AccountReducer,
    ForgetPassword: ForgetPasswordReducer,
    Profile: ProfileReducer,
    Calendar: CalendarReducer,
    chat: chatReducer,
    Tasks: TasksReducer,
    DashboardEcommerce: DashboardEcommerceReducer,
    Team: TeamDataReducer,
});

export default rootReducer;