import Home from './pages/Home';
import RegisterVIN from './pages/RegisterVIN';
import Explorer from './pages/Explorer';
import CustomerDashboard from './pages/CustomerDashboard';
import ShopDashboard from './pages/ShopDashboard';
import AdminPanel from './pages/AdminPanel';
import ProfileSetup from './pages/ProfileSetup';
import DealerDashboard from './pages/DealerDashboard';
import UserProfile from './pages/UserProfile';
import Map from './pages/Map';
import ShopProfile from './pages/ShopProfile';
import DealerProfile from './pages/DealerProfile';
import Wallet from './pages/Wallet';
import ServiceRecordPublicView from './pages/ServiceRecordPublicView';
import InvoicePublicView from './pages/InvoicePublicView';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';
import WalletLogin from './pages/WalletLogin';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "RegisterVIN": RegisterVIN,
    "Explorer": Explorer,
    "CustomerDashboard": CustomerDashboard,
    "ShopDashboard": ShopDashboard,
    "AdminPanel": AdminPanel,
    "ProfileSetup": ProfileSetup,
    "DealerDashboard": DealerDashboard,
    "UserProfile": UserProfile,
    "Map": Map,
    "ShopProfile": ShopProfile,
    "DealerProfile": DealerProfile,
    "Wallet": Wallet,
    "ServiceRecordPublicView": ServiceRecordPublicView,
    "InvoicePublicView": InvoicePublicView,
    "TermsOfUse": TermsOfUse,
    "PrivacyPolicy": PrivacyPolicy,
    "WalletLogin": WalletLogin,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};