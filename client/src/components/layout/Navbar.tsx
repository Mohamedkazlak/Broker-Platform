import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, LayoutDashboard, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBroker } from '@/contexts/BrokerContext';
import { useAuth } from '@/contexts/AuthContext';

interface NavbarProps {
  links?: { href: string; label: string }[];
  transparent?: boolean;
}

export function Navbar({ links, transparent }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { broker } = useBroker();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/home');
  };

  const defaultLinks = [
    { href: '/home', label: 'Home' },
    { href: '/properties', label: 'Properties' },
    { href: '/properties?type=sale', label: 'Buy' },
    { href: '/properties?type=rent', label: 'Rent' },
  ];

  const navLinks = links || defaultLinks;

  const isActive = (path: string) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path && !location.search;
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${transparent ? 'bg-transparent border-none' : 'glass border-b border-border/50'
      }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16 lg:h-20">
          {/* Logo */}
          <div className="flex flex-1 items-center justify-start">
            <Link to="/home" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-display text-xl font-semibold text-foreground">
                {broker?.platform_name || 'Broker'}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`font-body text-sm font-medium transition-colors duration-200 hover:text-primary ${isActive(link.href)
                  ? 'text-primary'
                  : 'text-muted-foreground'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex flex-1 items-center justify-end gap-4">
            {user ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              !['/home', '/properties'].includes(location.pathname) && !location.pathname.startsWith('/properties/') && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button variant="default" size="sm" asChild>
                    <Link to="/register">Get Started</Link>
                  </Button>
                </>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex flex-1 justify-end lg:hidden">
            <button
              className="p-2 text-foreground"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`block py-2 font-body text-base font-medium transition-colors ${isActive(link.href)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border space-y-2">
              {user ? (
                <>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                !['/home', '/properties'].includes(location.pathname) && !location.pathname.startsWith('/properties/') && (
                  <>
                    <Button variant="ghost" className="w-full" asChild>
                      <Link to="/login" onClick={() => setIsOpen(false)}>
                        Sign In
                      </Link>
                    </Button>
                    <Button className="w-full" asChild>
                      <Link to="/register" onClick={() => setIsOpen(false)}>
                        Get Started
                      </Link>
                    </Button>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
