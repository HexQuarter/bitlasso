import { Footer } from "@/components/landing/footer"
import { Navbar } from "@/components/landing/navbar"

export const PrivacyPage = () => {
    return (
        <main className="min-h-screen">
            <Navbar />
            <section className="relative min-h-[100svh] overflow-hidden">
                {/* Background accent line */}
                <div className="pointer-events-none absolute inset-y-0 left-[calc(50%-0.5px)] w-px bg-border/30" />

                <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[90rem] flex-col px-6 pt-28 pb-16 sm:px-10 lg:px-16">

                    {/* Center - Main headline */}
                    <div className="animate-fade-up opacity-0 delay-100 my-auto flex flex-col items-start mt-10 gap-10">
                        <h1 className="max-w-5xl font-serif text-6xl font-normal leading-[0.95] tracking-[-0.02em] text-foreground">
                            Privacy Policy
                        </h1>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">1. Our commitment to privacy</h2>
                            <p className="text-muted-foreground">
                                BitLasso is designed from the ground up to respect your privacy. We do not collect, store, or process any personal information about you.
                                <br />There is no account registration, no email address, no name, and no identity tied to your use of the Service.
                                <br />Access to the platform is entirely wallet-based.
                            </p>
                            <p className="text-muted-foreground">This Policy explains what data flows may occur when using the Service, specifically through third-party components we rely on, and what you should know about them.</p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">2. Data we collect</h2>
                            <p className="text-muted-foreground">BitLasso does not collect any personal data. Specifically:</p>
                            <ul className="text-muted-foreground list-disc ml-10">
                                <li>We do not collect names, email addresses, or any contact information</li>
                                <li>We do not require account registration of any kind</li>
                                <li>We do not use tracking pixels, fingerprinting, or behavioral analytics</li>
                                <li>We do not store IP addresses or device identifiers on our systems</li>
                                <li>We do not use advertising networks or sell data to third parties</li>
                            </ul>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">3. Third-party SDKs and services</h2>
                            <p className="text-muted-foreground">
                                BitLasso integrates third-party components to deliver its core functionality. <br />
                                These third parties may independently collect certain technical data — such as IP addresses or connection metadata — as a byproduct of providing their services.
                                <br />We do not control, access, or receive this data.
                            </p>

                            <section className="flex flex-col gap-2">
                                <h2 className="font-serif text-xl">3.1 Breez SDK</h2>
                                <p className="text-muted-foreground">
                                    BitLasso uses the Breez SDK to facilitate Bitcoin Lightning functionality.
                                    <br />When the Breez SDK establishes a connection to Breez infrastructure, certain connection-level data (such as your IP address) may be visible to Breez's servers as a technical byproduct of standard internet communication.
                                    <br />BitLasso does not receive or store this information.
                                </p>
                                <p className="text-muted-foreground">For details on how Breez handles data, please refer to Breez's own privacy policy at: <a className="text-primary" href="https://breez.technology" target="_blank">https://breez.technology</a></p>
                            </section>
                            <section className="flex flex-col gap-2">
                                <h2 className="font-serif text-xl">3.2 Spark SDK</h2>
                                <p className="text-muted-foreground">
                                    BitLasso uses the Breez SDK to facilitate Bitcoin Lightning functionality.
                                    <br />When the Breez SDK establishes a connection to Breez infrastructure, certain connection-level data (such as your IP address) may be visible to Breez's servers as a technical byproduct of standard internet communication.
                                    <br />BitLasso does not receive or store this information.
                                </p>
                                <p className="text-muted-foreground">For details on how Spark handles data, please refer to Spark's documentation and privacy terms at <a className="text-primary" href="https://www.spark.money/" target="_blank">https://www.spark.money</a></p>
                            </section>
                            <section className="flex flex-col gap-2">
                                <h2 className="font-serif text-xl">3.3 Nostr protocol</h2>
                                <p className="text-muted-foreground">
                                    Payment metadata (such as payment request identifiers and amounts) may be published to the Nostr protocol as part of the Service's data layer.
                                    <br />Nostr is a public, decentralized protocol — information published to it is publicly visible and cannot be deleted or modified retroactively.
                                    <br />No personal information is included in data published to Nostr by BitLasso.
                                </p>
                            </section>
                            <section className="flex flex-col gap-2">
                                <h2 className="font-serif text-xl">3.4 Bitcoin blockchain</h2>
                                <p className="text-muted-foreground">
                                    Bitcoin transactions are recorded on a public, immutable blockchain.
                                    <br />Any on-chain payment activity is publicly visible by the nature of the network.
                                    <br />BitLasso has no ability to modify or remove data from the Bitcoin blockchain.
                                </p>
                            </section>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">5. Cookies and Local Storage</h2>
                            <p className="text-muted-foreground">
                                BitLasso does not use cookies for tracking or analytics purposes.
                                <br />Any data stored locally on your device (such as wallet state) remains on your device and is not transmitted to BitLasso.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">6. Children's privacy</h2>
                            <p className="text-muted-foreground">
                                The Service is not directed to individuals under the age of 18. 
                                <br />Because we collect no personal data, no information about minors is collected through our platform.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">7. Changes to this policy</h2>
                            <p className="text-muted-foreground">
                                We may update this Privacy Policy from time to time to reflect changes in our practices or third-party integrations. 
                                <br />Updates will be posted at https://bitlasso.xyz with a revised effective date. 
                                <br />We encourage you to review this policy periodically.</p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">8. Contact</h2>
                            <p className="text-muted-foreground">If you have any questions about this Privacy Policy or our approach to privacy, you can reach us at: <a className="text-primary" href="mailto:bitlasso@hexquarter.com">bitlasso@hexquarter.com</a></p>
                        </article>
                    </div>
                </div>
            </section>
            {/* <HeroSection />
              <ProblemSection />
              <HowItWorksSection />
              <WhyBitcoinSection />
              <OperationalSection />
              <DecentralizationSection />
              <SelfCustodySection />
              <PricingSection />
              <CtaSection /> */}
            <Footer />
        </main >
    )
}