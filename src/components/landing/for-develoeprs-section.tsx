import { useRef } from 'react'
import { Code2, GitBranch, Zap, Database } from 'lucide-react'
import { useInView } from '@/hooks/use-in-view'

const features = [
  {
    icon: Code2,
    title: 'Decentralization authentication',
    description: 'NIP-98 powered authentication for Nostr, designed for cryptographic trust and programmable workflows at scale.',
  },
  {
    icon: Zap,
    title: 'Real-time webhooks',
    description: 'Payment events hit your backend immediately. Guaranteed delivery. Cryptographic signatures for verification.',
  },
  {
    icon: Database,
    title: 'Programmable payment workflows',
    description: 'Turn a Lightning payment into workflow execution—mint credits, sync databases, and trigger external APIs automatically.',
  },
  {
    icon: GitBranch,
    title: 'Built for agentic',
    description: 'Invoicing and payment flows for agent-driven work via API or autonomous agents.',
  },
]

export function ForDevlopersSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="relative border-t border-border/40 px-6 py-32 sm:px-10 md:py-40 lg:px-16">
      <div ref={ref} className="mx-auto max-w-[90rem]">
        {/* Header */}
        <div className={`mb-24 transition-all duration-1000 ${isInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <p className="mb-5 font-mono text-[11px] font-medium tracking-[0.2em] text-primary uppercase">
            For developers
          </p>
          <h2 className="max-w-3xl font-serif text-[clamp(2rem,4.5vw,3.75rem)] font-normal leading-[1.1] tracking-tight text-foreground">
            Payments as a primitive for your agents
          </h2>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-[1.7] text-muted-foreground">
            Lightning invoices are your API entrance point. From there, orchestrate any workflow, trigger any agent, execute any contract.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {features.map((feature, i) => {
            const spans = ['lg:col-span-6', 'lg:col-span-6', 'lg:col-span-6', 'lg:col-span-6']
            return (
              <div
                key={feature.title}
                className={`group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-8 transition-all duration-700 hover:border-border/80 hover:shadow-lg md:p-10 ${spans[i]} ${isInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                style={{ transitionDelay: isInView ? `${300 + i * 120}ms` : '0ms' }}
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary/12 group-hover:ring-primary/20">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-card-foreground md:text-xl">
                  {feature.title}
                </h3>
                <p className="mt-3 max-w-md text-[15px] leading-[1.7] text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* Code sample teaser */}
        <div
          className={`mt-24 overflow-hidden rounded-2xl border border-border/40 bg-muted/30 p-8 transition-all duration-1000 delay-500 md:p-12 ${isInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        >
          <p className="mb-6 font-mono text-[11px] font-medium tracking-[0.2em] text-muted-foreground/60 uppercase">
            Example: Create invoice & trigger agent
          </p>
          <pre className="overflow-x-auto text-[13px] leading-relaxed text-muted-foreground/70">
{`// POST /payment-request
{
  body: {
    amount: 1000,
    description: "Design consultation"
  }
  headers: {
    'Authorization': 'Nostr eyJpZCI6ImZlOTY0ZTc1ODkwMzM2MGY...; L402 9fscasfd:11090fdsf'
  }
}

// Automatic flow:
// 1. Invoice created & sent to client
// 2. Client pays over Lightning
// 3. Bitlasso posts to your webhook (from your settings)
// 4. Your agent receives payment proof
// All in < 10 seconds`}
          </pre>
        </div>
      </div>
    </section>
  )
}
