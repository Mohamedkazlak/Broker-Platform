import { useState } from 'react';
import { Phone, Mail, Clock, Send, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import api from '@/lib/api';

export default function Contact() {
  const { toast } = useToast();
  const { t } = useTranslation('contact');
  const { t: tVal } = useTranslation('validation');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const contactSchema = z.object({
    name: z.string().trim().min(2, tVal('contact.nameMin')).max(100),
    email: z.string().trim().email(tVal('contact.emailInvalid')).max(255),
    phone: z.string().trim().optional(),
    subject: z.string().trim().min(5, tVal('contact.subjectMin')).max(200),
    message: z.string().trim().min(10, tVal('contact.messageMin')).max(1000),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const result = contactSchema.safeParse(formData);
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

    try {
      await api.post('/contact', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        subject: formData.subject,
        message: formData.message,
      });

      toast({
        title: t('toasts.sentTitle'),
        description: t('toasts.sentDescription'),
      });

      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.errorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative gradient-hero pt-16">
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            {t('hero.headlinePart1')}{' '}
            <span className="text-accent">{t('hero.headlineHighlight')}</span>
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            {t('hero.subheadline')}
          </p>
        </div>
      </section>

      <main>
        {/* Content */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Contact Info */}
              <div className="space-y-8">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    {t('info.heading')}
                  </h2>
                  <p className="text-muted-foreground">{t('info.description')}</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{t('info.phoneLabel')}</h3>
                      <a
                        href="tel:12345"
                        className="text-muted-foreground hover:text-primary mt-1 block"
                      >
                        12345
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{t('info.emailLabel')}</h3>
                      <a
                        href="mailto:info@broker-platform.eg"
                        className="text-muted-foreground hover:text-primary mt-1 block"
                      >
                        info@broker-platform.eg
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{t('info.hoursLabel')}</h3>
                      <p className="text-muted-foreground mt-1">
                        {t('info.hoursValueLine1')}
                        <br />
                        {t('info.hoursValueLine2')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="bg-card rounded-2xl border border-border p-8 shadow-card">
                  <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                    {t('form.heading')}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('form.nameLabel')}</Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          placeholder={t('form.namePlaceholder')}
                          value={formData.name}
                          onChange={handleChange}
                          className={errors.name ? 'border-destructive' : ''}
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">{t('form.emailLabel')}</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder={t('form.emailPlaceholder')}
                          value={formData.email}
                          onChange={handleChange}
                          className={errors.email ? 'border-destructive' : ''}
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('form.phoneLabel')}</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder={t('form.phonePlaceholder')}
                          value={formData.phone}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">{t('form.subjectLabel')}</Label>
                        <Input
                          id="subject"
                          name="subject"
                          type="text"
                          placeholder={t('form.subjectPlaceholder')}
                          value={formData.subject}
                          onChange={handleChange}
                          className={errors.subject ? 'border-destructive' : ''}
                        />
                        {errors.subject && (
                          <p className="text-sm text-destructive">{errors.subject}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">{t('form.messageLabel')}</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder={t('form.messagePlaceholder')}
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        className={errors.message ? 'border-destructive' : ''}
                      />
                      {errors.message && (
                        <p className="text-sm text-destructive">{errors.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      className="w-full md:w-auto"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('form.sending')}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {t('form.sendButton')}
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
