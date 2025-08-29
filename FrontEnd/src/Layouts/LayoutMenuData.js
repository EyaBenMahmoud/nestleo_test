import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../services/api";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

const Navdata = () => {
    const { t } = useTranslation();

    const user = useSelector((state) => state.Loginn.user);

    const history = useNavigate();
    //state data
    const [isDashboard, setIsDashboard] = useState(false);
    const [isContract, setIsContract] = useState(false);
    const [isApps, setIsApps] = useState(false);
    const [isAuth, setIsAuth] = useState(false);
    const [isPages, setIsPages] = useState(false);
    const [isBaseUi, setIsBaseUi] = useState(false);
    const [isAdvanceUi, setIsAdvanceUi] = useState(false);
    const [isForms, setIsForms] = useState(false);
    const [isTables, setIsTables] = useState(false);
    const [isCharts, setIsCharts] = useState(false);
    const [isIcons, setIsIcons] = useState(false);
    const [isMaps, setIsMaps] = useState(false);
    const [isMultiLevel, setIsMultiLevel] = useState(false);

    // Apps
    const [isEmail, setEmail] = useState(false);
    const [isSubEmail, setSubEmail] = useState(false);
    const [isEcommerce, setIsEcommerce] = useState(false);
    const [isProjects, setIsProjects] = useState(false);
    const [isTasks, setIsTasks] = useState(false);
    const [isCRM, setIsCRM] = useState(false);
    const [isCrypto, setIsCrypto] = useState(false);
    const [isInvoices, setIsInvoices] = useState(false);
    const [isSupportTickets, setIsSupportTickets] = useState(false);
    const [isNFTMarketplace, setIsNFTMarketplace] = useState(false);
    const [isJobs, setIsJobs] = useState(false);
    const [isJobList, setIsJobList] = useState(false);
    const [isCandidateList, setIsCandidateList] = useState(false);


    // Authentication
    const [isSignIn, setIsSignIn] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [isPasswordReset, setIsPasswordReset] = useState(false);
    const [isPasswordCreate, setIsPasswordCreate] = useState(false);
    const [isLockScreen, setIsLockScreen] = useState(false);
    const [isLogout, setIsLogout] = useState(false);
    const [isSuccessMessage, setIsSuccessMessage] = useState(false);
    const [isVerification, setIsVerification] = useState(false);
    const [isError, setIsError] = useState(false);

    // Pages
    const [isProfile, setIsProfile] = useState(false);
    const [isLanding, setIsLanding] = useState(false);


    // Charts
    const [isApex, setIsApex] = useState(false);

    // Multi Level
    const [isLevel1, setIsLevel1] = useState(false);
    const [isLevel2, setIsLevel2] = useState(false);

    const [iscurrentState, setIscurrentState] = useState('Dashboard');

    function updateIconSidebar(e) {
        if (e && e.target && e.target.getAttribute("subitems")) {
            const ul = document.getElementById("two-column-menu");
            const iconItems = ul.querySelectorAll(".nav-icon.active");
            let activeIconItems = [...iconItems];
            activeIconItems.forEach((item) => {
                item.classList.remove("active");
                var id = item.getAttribute("subitems");
                if (document.getElementById(id))
                    document.getElementById(id).classList.remove("show");
            });
        }
    }

    useEffect(() => {
        document.body.classList.remove('twocolumn-panel');
        if (iscurrentState !== 'Dashboard') {
            setIsDashboard(false);
        }
        if (iscurrentState !== 'Apps') {
            setIsApps(false);
        }
        if (iscurrentState !== 'Auth') {
            setIsAuth(false);
        }
        if (iscurrentState !== 'Pages') {
            setIsPages(false);
        }
        if (iscurrentState !== 'BaseUi') {
            setIsBaseUi(false);
        }
        if (iscurrentState !== 'AdvanceUi') {
            setIsAdvanceUi(false);
        }
        if (iscurrentState !== 'Forms') {
            setIsForms(false);
        }
        if (iscurrentState !== 'Tables') {
            setIsTables(false);
        }
        if (iscurrentState !== 'Charts') {
            setIsCharts(false);
        }
        if (iscurrentState !== 'Icons') {
            setIsIcons(false);
        }
        if (iscurrentState !== 'Maps') {
            setIsMaps(false);
        }
        if (iscurrentState !== 'MuliLevel') {
            setIsMultiLevel(false);
        }
        if (iscurrentState === 'Widgets') {
            history("/widgets");
            document.body.classList.add('twocolumn-panel');
        }
        if (iscurrentState !== 'Landing') {
            setIsLanding(false);
        }
    }, [
        history,
        iscurrentState,
        isDashboard,
        isApps,
        isAuth,
        isPages,
        isBaseUi,
        isAdvanceUi,
        isForms,
        isTables,
        isCharts,
        isIcons,
        isMaps,
        isMultiLevel
    ]);

    const menuItems = [
        {
            label: "Menu",
            isHeader: true,
        },
        {
            id: "Dashboard",
            icon: "ri-settings-2-line",
            label: "Dashboard",
            roles: ["SuperAdmin", "Admin"],
            link: "/index",
        },
        {
            id: "Users",
            label: "Users",
            icon: "ri-file-list-3-line",
            roles: ["SuperAdmin"],
            link: "/users",
        },
        {

            id: "Admins",
            label: "Admins",
            icon: "ri-file-list-3-line",
            link: "/showAdmins",
            roles: ["SuperAdmin"],
        },
        {
            id: "contract",
            label: "Contracts",
            icon: "ri-file-list-3-line",
            roles: ["SuperAdmin", "Admin"],
            link: "/contract",
        },
        {
            id: "subscription",
            icon: "ri-pages-line",
            label: "Subscriptions",
            roles: ["SuperAdmin", "Admin"],
            link: "/subscription",
        },
        {
            id: "Contact",
            icon: "ri-apps-2-line ",
            label: "Contact",
            roles: ["SuperAdmin", "Admin"],
            link: "/contact",
        },
        {
            id: "Crm",
            icon: "ri-settings-2-line",
            label: "Crm Setting",
            roles: ["SuperAdmin", "Admin"],
            link: "/crmAdmin",
        },
        {
            id: "Assistant",
            label: "Assistant",
            icon: "ri-file-list-3-line",
            roles: ["SuperAdmin"],
            link: "/assistantConfig",
        },

        //Syndicate menu Items

        {
            id: "Dashboard",
            icon: "ri-settings-2-line",
            label: "Dashboard",
            roles: ["SyndicateAdmin"],
            link: "/index",
        },
        {
            id: "Calendar",
            icon: "ri-calendar-line",
            label: "Calendar",
            roles: ["SyndicateAdmin"],
            link: "/calendar",
        },

        {
            id: "Buildings Management",
            icon: "ri-apps-2-line ",
            label: "Buildings Management",
            roles: ["SyndicateAdmin"],
            link: "/BuildingInterface",
        },
        {
            id: "Claims",
            icon: "ri-settings-2-line",
            label: "Claims",
            roles: ["SyndicateAdmin"],
            link: "/Claim",
        },

        {
            id: "Invoices",
            icon: "ri-apps-2-line ",
            label: "Invoices",
            roles: ["SyndicateAdmin"],
            link: "/apps-invoices-list",
        },

        {
            id: "Subscription",
            icon: "ri-settings-2-line",
            label: "Subscription",
            roles: ["SyndicateAdmin"],
            link: "/subscription",
        },
        {
            id: "WorkerReviews",
            icon: "ri-user-star-line",
            label: "Worker Reviews",
            roles: ["SyndicateAdmin"],
            link: "/review",
        },
        {
            id: "Gamification",
            icon: "ri-gamepad-line",
            label: "Gamification",
            roles: ["SyndicateAdmin"],
            link: "/Gamification",
        },

        //Coowner menu Items
        {
            id: "Dashboard",
            icon: "ri-settings-2-line",
            label: "Dashboard",
            roles: ["SyndicateCoowner"],
            link: "/index",
        },
        {
            id: "Calendar",
            icon: "ri-calendar-line",
            label: "Calendar",
            roles: ["SyndicateCoowner"],
            link: "/calendar",
        },
        {
            id: "Apartements",
            icon: "ri-file-list-line",
            label: "Apartements",
            roles: ["SyndicateCoowner"],
            link: "/Apartements",
        },

        {

            id: "Claims",
            icon: "ri-file-list-line",
            label: "Claims",
            roles: ["SyndicateCoowner"],
            link: "/Claim",
        },
        {
            id: "Invoices",
            icon: "ri-settings-2-line",
            label: "Invoices",
            roles: ["SyndicateCoowner"],
            link: "/apps-invoices-list-coOwners",
        },
        {
            id: "task",
            icon: "ri-task-line",
            label: t("task.title"),
            roles: ["SyndicateAdmin", "SyndicateCoowner"],
            link: "/task",
        },
        //worker menu Items
        {
            id: "Dashboard",
            icon: "ri-settings-2-line",
            label: "Dashboard",
            roles: ["Worker"],
            link: "/index",
        },
        {
            id: "task",
            icon: "ri-task-line",
            label: t("task.title"),
            roles: ["Worker"],
            link: "/tasks",
        },
        {
            id: "Reviews",
            icon: "ri-star-smile-line",
            label: "Worker Reviews",
            roles: ["Worker"],
            link: "/reviews",
        },

    ];
    // Function to filter menu items based on user role
    const filterMenuItemsByRole = (items, userRole) => {
        return items.filter(item => {
            if (item.roles && !item.roles.includes(userRole)) {
                return false;
            }
            if (item.subItems) {
                item.subItems = filterMenuItemsByRole(item.subItems, userRole);
            }
            return true;
        });
    };

    // Filter the menu items based on the user's role
    const filteredMenuItems = filterMenuItemsByRole(menuItems, user.role);

    return <React.Fragment>{filteredMenuItems}</React.Fragment>;
};
export default Navdata;