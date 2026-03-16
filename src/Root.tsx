import { HashRouter, Route, Routes, useLocation } from "react-router"
import { LandingPage } from "./pages/LandingPage"
import { AppRoot } from "./AppRoot"
import { WalletProvider } from "./hooks/use-wallet"
import { Toaster } from "sonner"
import { PaymentPage } from "./pages/PaymentPage"
import { useEffect, useRef } from "react"
import { CertPage } from "./pages/CertPage"
import { TermsPage } from "./pages/TermsPage"
import { PrivacyPage } from "./pages/PrivacyPage"

function ScrollToAnchor() {
    const location = useLocation();
    const lastHash = useRef('');

    // listen to location change using useEffect with location as dependency
    // https://jasonwatmore.com/react-router-v6-listen-to-location-route-change-without-history-listen
    useEffect(() => {
        if (location.hash) {
            lastHash.current = location.hash.slice(1); // safe hash for further use after navigation
        }

        if (lastHash.current && document.getElementById(lastHash.current)) {
            setTimeout(() => {
                document
                    .getElementById(lastHash.current)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start', });
                lastHash.current = '';
            }, 100);
        }
    }, [location]);

    return null;
}

export const Root = () => {
    return (
        <HashRouter>
            <Routes>
                <Route path='/' Component={LandingPage} />
                <Route path='/terms' Component={TermsPage} />
                <Route path='/privacy' Component={PrivacyPage} />
                <Route path='/app/*' element={
                    <WalletProvider>
                        <AppRoot />
                    </WalletProvider>
                } />
                <Route path='/payment/:id' Component={PaymentPage} />
                <Route index path='/payment/:id/certificate' Component={CertPage} />
            </Routes>
            <Toaster />
            <ScrollToAnchor />
        </HashRouter>
    )
}