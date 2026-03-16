import { Mail } from 'lucide-react'
import LogoPng from '../../../public/logo.svg'
import { IconBrandGithub } from '@tabler/icons-react'
import { Link } from 'react-router'


export function Footer() {
    return (
        <footer className="border-t border-border/40 px-6 py-16 sm:px-10 md:py-20 lg:px-16">
            <div className="mx-auto flex max-w-[90rem] gap-10 flex-col">
                <div className='flex flex-col md:justify-between md:flex-row gap-5'>
                    <div className='flex flex-col gap-5'>
                        <a href="#" className="font-serif text-3xl tracking-tight text-foreground flex items-center gap-2">
                            <img src={LogoPng} className='w-10' />
                            <span><span className="text-primary">bit</span>lasso</span>
                        </a>
                        <div className='flex flex-col md:gap-1 gap-2'>
                            <Link to='/terms' className='text-sm text-muted-foreground hover:underline'>Terms</Link>
                            <Link to='/privacy' className='text-sm text-muted-foreground hover:underline'>Privacy</Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        {[{ content: <IconBrandGithub />, href: "https://github.com/hexquarter/bitlasso" }, { content: <Mail />, href: 'mailto:bitlasso@hexquarter.com' }].map(({ content, href }, i) => (
                            <a
                                key={i}
                                href={href}
                                target='_blank'
                                className="text-[13px] tracking-wide text-muted-foreground/50 transition-colors duration-300 hover:text-foreground"
                            >
                                {content}
                            </a>
                        ))}
                    </div>
                </div>
                <div className='text-xs text-muted-foreground'>© {new Date().getFullYear()} HexQuarter. All rights reserved.</div>
            </div>
        </footer>
    )
}
