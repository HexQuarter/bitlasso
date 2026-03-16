import { Footer } from "@/components/landing/footer"
import { Navbar } from "@/components/landing/navbar"

export const TermsPage = () => {
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
                            Terms of Use
                        </h1>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">1. Acceptance of terms</h2>
                            <p className="text-muted-foreground">
                                By accessing or using the BitLasso platform at bitlasso.xyz (the "Service"), you agree to be bound by these Terms of Use ("Terms").
                                <br />The Service is created, owned, and operated by HexQuarter ("HexQuarter", "we", "us", or "our").
                                <br />If you do not agree to these Terms, you must not use the Service.
                                <br />HexQuarter reserves the right to update these Terms at any time; continued use of the Service following any such change constitutes your acceptance of the revised Terms.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">2. Description of service</h2>
                            <p className="text-muted-foreground">
                                BitLasso provides a Bitcoin-native payment and loyalty infrastructure platform created and operated by HexQuarter for merchants ("Merchants") built on the Spark protocol.<br />
                                The Service enables Merchants to create self-custodial Bitcoin payment requests, issue loyalty rewards, and manage customer interactions — all with full custody of funds at all times. <br />
                                BitLasso does not hold, custody, or transmit Bitcoin on behalf of any user.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">3. Eligibility</h2>
                            <p className="text-muted-foreground">You must be at least 18 years of age and have the legal authority to enter into binding contracts in your jurisdiction to use the Service.
                                <br />
                                By using the Service, you represent and warrant that you meet these requirements.
                                <br />Use of the Service by entities requires that an authorized representative accept these Terms on the entity's behalf.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">4. Account registration</h2>
                            <p className="text-muted-foreground">To access certain features you must register for a Merchant account. You agree to:</p>
                            <ul className="text-muted-foreground list-disc ml-10">
                                <li>Provide accurate, current, and complete information during registration</li>
                                <li>Maintain the security of your account credentials, including any seed phrases or private keys</li>
                                <li>Promptly notify us of any unauthorized access to your account</li>
                                <li>Accept full responsibility for all activity that occurs under your account</li>
                            </ul>
                            <p className="text-muted-foreground">Because BitLasso operates on a self-custody model, you are solely responsible for safeguarding your cryptographic keys. <br />
                                BitLasso cannot recover lost keys or restore access to funds.</p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">5. Fees and billing</h2>
                            <p className="text-muted-foreground">
                                BitLasso charges a flat fee per payment request generated through the platform, as specified on our pricing page.
                                <br />Fees are subject to change with notice.
                                <br />Current founder pricing and any promotional rates are provided at BitLasso's discretion and may be modified upon reasonable notice.
                                All fees are non-refundable unless otherwise stated in writing.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">6. Acceptable use</h2>
                            <p className="text-muted-foreground">You agree to use the Service only for lawful purposes and in compliance with all applicable laws and regulations. You must not:</p>
                            <ul className="text-muted-foreground list-disc ml-10">
                                <li>Use the Service to facilitate illegal transactions, money laundering, or financing of prohibited activities</li>
                                <li>Attempt to reverse-engineer, decompile, or otherwise derive source code from the platform</li>
                                <li>Use the Service in any manner that could damage, disable, or impair the platform or interfere with other users</li>
                                <li>Misrepresent your identity or affiliation with any person or entity</li>
                                <li>Use automated means to access the Service without our prior written consent</li>
                                <li>Violate the intellectual property rights of BitLasso or any third party</li>
                            </ul>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">7. Bitcoin and cryptocurrency risks</h2>
                            <p className="text-muted-foreground">You acknowledge and accept the following risks inherent to Bitcoin and related protocols:</p>
                            <ul className="text-muted-foreground list-disc ml-10">
                                <li>Bitcoin transactions are irreversible. Once confirmed on the network, payments cannot be reversed or refunded by BitLasso.</li>
                                <li>The value of Bitcoin is highly volatile and may change significantly in short periods of time.</li>
                                <li>The Spark protocol and related technology are experimental. Software bugs, network congestion, or protocol changes may affect the availability or function of the Service.</li>
                                <li>Regulatory requirements relating to Bitcoin and cryptocurrency vary by jurisdiction and may change. You are solely responsible for your compliance with applicable laws.</li>
                            </ul>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">8. Self-custody and key management</h2>
                            <p className="text-muted-foreground">BitLasso is built on a self-custody model. This means:</p>
                            <ul className="text-muted-foreground list-disc ml-10">
                                <li>BitLasso does not hold, store, or have access to your Bitcoin or private keys.</li>
                                <li>You are solely responsible for the secure storage of your seed phrases, private keys, and any recovery information.</li>
                                <li>BitLasso cannot recover lost funds, reverse transactions, or restore access to wallets in the event of lost credentials.</li>
                            </ul>
                            <p className="text-muted-foreground">We strongly recommend you back up your recovery phrase in a secure offline location immediately upon account creation.</p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">9. Intellectual property</h2>
                            <p className="text-muted-foreground">
                                All content, branding, software, and technology comprising the BitLasso platform — including the name "BitLasso," logos, product designs, and source code — are created and owned by HexQuarter and are protected by applicable intellectual property laws.                                <br />You are granted a limited, non-exclusive, non-transferable license to access and use the Service solely as permitted by these Terms.
                                <br />BitLasso and all associated materials are the exclusive property of HexQuarter or its licensors.
                                <br />You are granted a limited, non-exclusive, non-transferable license to access and use the Service solely as permitted by these Terms.
                                <br />No rights are granted beyond those expressly stated herein.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">10. Third-party services</h2>
                            <p className="text-muted-foreground">
                                The Service may integrate with or rely on third-party protocols, networks, and services, including the Spark protocol and Nostr. <br />
                                BitLasso makes no representations as to the reliability, accuracy, or availability of third-party services and is not responsible for any harm arising from your use of them.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">11. Disclaimer of warranties</h2>
                            <p className="text-muted-foreground">
                                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
                                <br />HEXQUARTER EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
                                <br />HEXQUARTER DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">12. Limitation of liability</h2>
                            <p className="text-muted-foreground">
                                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, HEXQUARTER AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE OR INABILITY TO ACCESS FUNDS, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                                <br />IN NO EVENT SHALL BITLASSO'S TOTAL LIABILITY EXCEED THE FEES PAID BY YOU TO BITLASSO IN THE TWELVE MONTHS PRECEDING THE CLAIM.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">13. Indemnification</h2>
                            <p className="text-muted-foreground">
                                You agree to indemnify, defend, and hold harmless HexQuarter and its affiliates, officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or related to your use of the Service, your breach of these Terms, or your violation of any applicable law or third-party rights.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">14. Termination</h2>
                            <p className="text-muted-foreground">
                                HexQuarter may suspend or terminate your access to the Service at any time, with or without cause, upon notice.
                                <br />You may terminate your account at any time by contacting us. Upon termination, your right to use the Service ceases immediately.
                                <br />Provisions of these Terms that by their nature should survive termination — including Sections 7, 8, 9, 11, 12, 13, and 15 — shall survive.
                            </p>
                        </article>
                        <article className="flex flex-col gap-2">
                            <h2 className="font-serif text-2xl">15. Company information</h2>
                            <p className="text-muted-foreground">
                                BitLasso is developed, owned, and operated by HexQuarter.
                                HexQuarter is responsible for maintaining the BitLasso platform and related services.
                                For legal inquiries or notices regarding these Terms, you may contact: <a href="mailto:bitlasso@hexquarter.com" className="text-primary">bitlasso@hexquarter.com</a>
                            </p>
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