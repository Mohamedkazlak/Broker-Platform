import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PublicNavbar() {
    const [isOpen, setIsOpen] = useState(false);

    const navLinks = [
        { href: '/#features', label: 'Features', isHash: true },
        { href: '/pricing', label: 'Pricing', isHash: false },
        { href: '/about', label: 'About Us', isHash: false },
        { href: '/contact', label: 'Contact', isHash: false },
    ];

    const handleLinkClick = (href: string, isHash: boolean) => {
        setIsOpen(false);
        if (isHash) {
            if (window.location.pathname === '/') {
                // Already on home, scroll
                const element = document.getElementById(href.replace('/#', ''));
                element?.scrollIntoView({ behavior: 'smooth' });
            }
            // If not on home, Link will handle redirect
        } else {
            // Standard navigation
            window.scrollTo(0, 0);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                        <span className="font-display text-lg font-semibold text-foreground">Broker Platform</span>
                        <p className="text-xs text-muted-foreground">Website for brokers</p>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Button
                            key={link.label}
                            variant="ghost"
                            className="text-foreground hover:text-accent-foreground hover:scale-105 hover:shadow-gold transition-all duration-300"
                            asChild
                        >
                            {link.isHash ? (
                                window.location.pathname === '/' ? (
                                    <a
                                        href={link.href}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    >
                                        {link.label}
                                    </a>
                                ) : (
                                    <Link to={link.href}>{link.label}</Link>
                                )
                            ) : (
                                <Link to={link.href}>{link.label}</Link>
                            )}
                        </Button>
                    ))}

                    <Button
                        variant="ghost"
                        className="text-foreground hover:text-accent-foreground hover:scale-105 hover:shadow-gold transition-all duration-300"
                        asChild
                    >
                        <Link to="/login">Log In</Link>
                    </Button>

                    <Button asChild variant="hero">
                        <Link to="/register">Get Started</Link>
                    </Button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="lg:hidden p-2 text-foreground"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Toggle menu"
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="lg:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <div className="container mx-auto px-4 py-4 space-y-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                to={link.href}
                                className="block py-3 font-display text-lg font-medium text-foreground hover:text-primary transition-colors border-b border-border/50 last:border-0"
                                onClick={() => handleLinkClick(link.href, link.isHash)}
                            >
                                {link.label}
                            </Link>
                        ))}

                        <div className="pt-4 space-y-3">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-lg h-12"
                                asChild
                                onClick={() => setIsOpen(false)}
                            >
                                <Link to="/login">Log In</Link>
                            </Button>
                            <Button
                                variant="hero"
                                className="w-full justify-center text-lg h-12"
                                asChild
                                onClick={() => setIsOpen(false)}
                            >
                                <Link to="/register">Get Started</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
