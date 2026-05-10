import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Building2 } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useBroker } from '@/contexts/BrokerContext';
import { useToast } from '@/hooks/use-toast';
import { buildSubdomainRedirect } from '@/lib/sessionRelay';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, registerBroker } = useAuth();
  const { broker } = useBroker();
  const { toast } = useToast();
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const { t: tVal } = useTranslation('validation');

  const [isSignUp, setIsSignUp] = useState(location.pathname === '/register');
  const [isLoading, setIsLoading] = useState(false);
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

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(tVal('auth.emailInvalid')),
        password: z.string().min(6, tVal('auth.passwordMin')),
      }),
    [tVal]
  );

  const signupSchema = useMemo(
    () =>
      z
        .object({
          email: z.string().min(1, tVal('auth.emailRequired')).email(tVal('auth.emailInvalid')),
          password: z.string().min(1, tVal('auth.passwordRequired')).min(6, tVal('auth.passwordMin')),
          confirmPassword: z.string().min(1, tVal('auth.confirmPasswordRequired')),
          firstName: z
            .string()
            .min(1, tVal('auth.firstNameRequired'))
            .min(2, tVal('auth.firstNameMin')),
          lastName: z
            .string()
            .min(1, tVal('auth.lastNameRequired'))
            .min(2, tVal('auth.lastNameMin')),
          platformName: z
            .string()
            .min(1, tVal('auth.platformNameRequired'))
            .min(3, tVal('auth.platformNameMin')),
          subdomain: z
            .string()
            .min(1, tVal('auth.subdomainRequired'))
            .min(3, tVal('auth.subdomainMin'))
            .regex(/^[a-z0-9-]+$/, tVal('auth.subdomainFormat')),
          phone: z.string().min(1, tVal('auth.phoneRequired')).min(10, tVal('auth.phoneMin')),
          whatsapp: z
            .string()
            .min(1, tVal('auth.whatsappRequired'))
            .min(10, tVal('auth.whatsappMin')),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: tVal('auth.passwordMismatch'),
          path: ['confirmPassword'],
        }),
    [tVal]
  );

  useEffect(() => {
    setIsSignUp(location.pathname === '/register');
    setErrors({});
  }, [location.pathname]);

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
            title: t('toasts.registerFailedTitle'),
            description: error.message,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        toast({
          title: t('toasts.platformCreatedTitle'),
          description: t('toasts.platformCreatedDescription'),
        });
        sessionStorage.setItem('broker_subdomain', formData.subdomain);
        navigate('/subscription');
      } else {
        const result = loginSchema.safeParse({ email: formData.email, password: formData.password });
        if (!result.success) {
          setIsLoading(false);
          return;
        }

        const { error, subdomain: brokerSubdomain } = await signIn(formData.email, formData.password);

        if (error) {
          toast({
            title: t('toasts.signInFailedTitle'),
            description: t('toasts.signInFailedDescription'),
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        if (brokerSubdomain) {
          const redirectUrl = await buildSubdomainRedirect(brokerSubdomain, '/dashboard');
          window.location.href = redirectUrl;
          return;
        }
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: t('toasts.genericErrorTitle'),
        description: t('toasts.genericErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const requiredMark = <span className="text-destructive">*</span>;

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 gradient-hero opacity-80" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <Building2 className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="font-display text-2xl font-semibold text-primary-foreground">
              {broker?.platform_name || tCommon('brand.name')}
            </span>
          </div>
          <h2 className="font-display text-3xl font-bold text-primary-foreground mb-4">
            {t('leftPanel.heading')}
          </h2>
          <p className="text-primary-foreground/80 max-w-md">
            {t('leftPanel.description')}
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
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t('backToHome')}
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {isSignUp ? t('signUp.title') : t('signIn.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isSignUp ? t('signUp.subtitle') : t('signIn.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      {t('signUp.firstName')} {requiredMark}
                    </Label>
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
                    <Label htmlFor="lastName">
                      {t('signUp.lastName')} {requiredMark}
                    </Label>
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
                  <Label htmlFor="platformName">
                    {t('signUp.platformName')} {requiredMark}
                  </Label>
                  <Input
                    id="platformName"
                    name="platformName"
                    value={formData.platformName}
                    onChange={handleChange}
                    placeholder={t('signUp.platformNamePlaceholder')}
                    className={errors.platformName ? 'border-destructive' : ''}
                    required
                  />
                  {errors.platformName && <p className="text-sm text-destructive">{errors.platformName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subdomain">
                    {t('signUp.subdomain')} {requiredMark}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="subdomain"
                      name="subdomain"
                      value={formData.subdomain}
                      onChange={handleChange}
                      placeholder={t('signUp.subdomainPlaceholder')}
                      className={errors.subdomain ? 'border-destructive' : ''}
                      required
                      dir="ltr"
                    />
                    <span className="text-sm text-muted-foreground font-medium">
                      {t('signUp.subdomainSuffix')}
                    </span>
                  </div>
                  {formData.subdomain && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('signUp.yourUrl')}{' '}
                      <span className="font-medium text-primary" dir="ltr">
                        {formData.subdomain}.{window.location.host}
                      </span>
                    </p>
                  )}
                  {errors.subdomain && <p className="text-sm text-destructive">{errors.subdomain}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    {t('signUp.email')} {requiredMark}
                  </Label>
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
                  <Label htmlFor="phone">
                    {t('signUp.phone')} {requiredMark}
                  </Label>
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
                  <Label htmlFor="whatsapp">
                    {t('signUp.whatsapp')} {requiredMark}
                  </Label>
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
                <Label htmlFor="email">{t('signIn.email')}</Label>
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
              <Label htmlFor="password">
                {isSignUp ? t('signUp.password') : t('signIn.password')} {requiredMark}
              </Label>
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
                <Label htmlFor="confirmPassword">
                  {t('signUp.confirmPassword')} {requiredMark}
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                  required
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                t('signUp.submit')
              ) : (
                t('signIn.submit')
              )}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6">
            {isSignUp ? t('alreadyHaveAccount') : t('noAccountYet')}{' '}
            <Link
              to={isSignUp ? '/login' : '/register'}
              className="text-primary font-medium hover:underline"
            >
              {isSignUp ? t('signInLink') : t('createAccountLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
