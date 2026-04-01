import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Loader2, Building2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useBroker } from '@/contexts/BrokerContext';
import { useToast } from '@/hooks/use-toast';
import { buildSubdomainRedirect } from '@/lib/sessionRelay';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Confirm Password is required'),
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  platformName: z.string().min(1, 'Platform name is required').min(3, 'Platform name must be at least 3 characters'),
  subdomain: z.string().min(1, 'Subdomain is required').min(3, 'Subdomain must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
  phone: z.string().min(1, 'Phone number is required').min(10, 'Please enter a valid phone number'),
  whatsapp: z.string().min(1, 'WhatsApp number is required').min(10, 'Please enter a valid WhatsApp number'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, registerBroker } = useAuth();
  const { broker } = useBroker();
  const { toast } = useToast();

  const [isSignUp, setIsSignUp] = useState(location.pathname === '/register');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    platformName: '',
    subdomain: '',
    phone: '',
    whatsapp: '',
  });

  // Sync mode with URL
  useEffect(() => {
    setIsSignUp(location.pathname === '/register');
    setErrors({});
  }, [location.pathname]);

  // Don't auto-redirect on main domain — user might be logging in and needs to be redirected to subdomain
  // On subdomain, auto-redirect if already logged in
  const subdomain = window.location.hostname.endsWith('.localhost')
    ? window.location.hostname.replace('.localhost', '')
    : null;
  useEffect(() => {
    if (user && subdomain) {
      navigate('/dashboard');
    }
  }, [user, navigate, subdomain]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // For subdomain, force lowercase and remove invalid chars
    if (name === 'subdomain') {
      const cleanValue = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setFormData((prev) => ({ ...prev, [name]: cleanValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await registerBroker(formData);

        if (error) {
          toast({
            title: 'Registration failed',
            description: error.message,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        toast({
          title: 'Platform created!',
          description: 'Your account and platform have been successfully created.',
        });
        // Store subdomain for subscription redirect
        sessionStorage.setItem('broker_subdomain', formData.subdomain);
        navigate('/subscription');
      } else {
        const result = loginSchema.safeParse({ email: formData.email, password: formData.password });
        if (!result.success) {
          // ... handle login errors
          setIsLoading(false);
          return;
        }

        const { error, subdomain: brokerSubdomain } = await signIn(formData.email, formData.password);

        if (error) {
          toast({
            title: 'Sign in failed',
            description: 'Invalid email or password.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Redirect to broker's subdomain dashboard
        if (brokerSubdomain) {
          const redirectUrl = await buildSubdomainRedirect(brokerSubdomain, '/dashboard');
          window.location.href = redirectUrl;
          return;
        }
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Image (Same as before) */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80"
          alt="Luxury property"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 gradient-hero opacity-80" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          {/* Branding Content */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <Building2 className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="font-display text-2xl font-semibold text-primary-foreground">
              {broker?.platform_name || 'Broker Platform'}
            </span>
          </div>
          <h2 className="font-display text-3xl font-bold text-primary-foreground mb-4">
            Manage Your Properties with Ease
          </h2>
          <p className="text-primary-foreground/80 max-w-md">
            Access your broker dashboard to list properties, manage inquiries,
            and grow your real estate business.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {isSignUp ? 'Create your platform' : 'Welcome back'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isSignUp
                ? 'Launch your professional real estate platform today'
                : 'Sign in to access your dashboard'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={errors.firstName ? 'border-destructive' : ''}
                      required
                    />
                    {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={errors.lastName ? 'border-destructive' : ''}
                      required
                    />
                    {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="platformName"
                    name="platformName"
                    value={formData.platformName}
                    onChange={handleChange}
                    placeholder="My Real Estate"
                    className={errors.platformName ? 'border-destructive' : ''}
                    required
                  />
                  {errors.platformName && <p className="text-sm text-destructive">{errors.platformName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subdomain">Choose Your Subdomain <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="subdomain"
                      name="subdomain"
                      value={formData.subdomain}
                      onChange={handleChange}
                      placeholder="mybrand"
                      className={errors.subdomain ? 'border-destructive' : ''}
                      required
                    />
                    <span className="text-sm text-muted-foreground font-medium">.broker.com</span>
                  </div>
                  {formData.subdomain && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Your URL will be: <span className="font-medium text-primary">{formData.subdomain}.{window.location.host}</span>
                    </p>
                  )}
                  {errors.subdomain && <p className="text-sm text-destructive">{errors.subdomain}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'border-destructive' : ''}
                    required
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={errors.phone ? 'border-destructive' : ''}
                    required
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    className={errors.whatsapp ? 'border-destructive' : ''}
                    required
                  />
                  {errors.whatsapp && <p className="text-sm text-destructive">{errors.whatsapp}</p>}
                </div>
              </>
            )}

            {!isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'border-destructive' : ''}
                  required
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'border-destructive' : ''}
                required
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                  required
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link
              to={isSignUp ? "/login" : "/register"}
              className="text-primary font-medium hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
