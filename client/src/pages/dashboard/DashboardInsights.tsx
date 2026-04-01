import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  Building2,
  TrendingUp,
  LogOut,
  Settings,
  Menu,
  Package,
  CheckCircle2,
  DollarSign,
  Key,
  Mail,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useBroker } from '@/contexts/BrokerContext';
import { supabase } from '@/integrations/supabase/client';
import { analyticsService } from '@/services/analyticsService';
import { propertyService } from '@/services/propertyService';
import { format } from 'date-fns';

const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  plus: 10,
  pro: 50,
  ultra: Infinity,
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Starter Package',
  plus: 'Plus Package',
  pro: 'Pro Package',
  ultra: 'Ultra Package',
};

// Contact messages removed for brokers

interface PropertyStats {
  active: number;
  sold: number;
  rented: number;
  total: number;
}

export default function DashboardInsights() {
  const navigate = useNavigate();
  const { user, profile, role, isLoading, signOut } = useAuth();
  const { broker } = useBroker();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [propertyStats, setPropertyStats] = useState<PropertyStats>({ active: 0, sold: 0, rented: 0, total: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [topProperties, setTopProperties] = useState<{ title: string; views: number }[]>([]);
  const [viewsData, setViewsData] = useState<{ day: string; views: number }[]>([]);

  const [adminPackage, setAdminPackage] = useState<string>('free');

  const plan = adminPackage || 'free';
  const planLimit = PLAN_LIMITS[plan] || 5;
  const usedSlots = propertyStats.total;
  const usagePercent = planLimit === Infinity ? 0 : Math.min(100, Math.round((usedSlots / planLimit) * 100));

  useEffect(() => {
    if (!profile?.broker_id) return;
    fetchData();
  }, [profile?.broker_id]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [brokerRes, propertiesRes, viewsRes, topRes] = await Promise.all([
        supabase
          .from('brokers')
          .select('package')
          .eq('id', profile!.broker_id)
          .single(),
        supabase
          .from('properties')
          .select('id, title, status')
          .eq('broker_id', profile!.broker_id),
        analyticsService.getViews(31).catch(() => ({ data: [], total: 0 })),
        analyticsService.getTopProperties(5, 30).catch(() => []),
      ]);

      if (brokerRes.data) {
        setAdminPackage(brokerRes.data.package);
      }

      if (propertiesRes.data) {
        const props = propertiesRes.data;
        const active = props.filter((p) => p.status === 'active').length;
        const sold = props.filter((p) => p.status === 'sold').length;
        const rented = props.filter((p) => p.status === 'rented').length;
        setPropertyStats({ active, sold, rented, total: props.length });
      }

      // Messages intentionally not fetched

      if (viewsRes.data && Array.isArray(viewsRes.data)) {
        const rows = viewsRes.data as { day?: string; views?: number; viewed_at?: string }[];
        const first = rows[0];
        if (first && first.day != null && typeof first.views === 'number' && first.viewed_at == null) {
          setViewsData(
            rows.map((row) => ({
              day: format(new Date(row.day!), 'd'),
              views: row.views ?? 0,
            }))
          );
        } else {
          const byDay: Record<string, number> = {};
          rows.forEach((row) => {
            const day = row.viewed_at ? format(new Date(row.viewed_at), 'd') : '';
            if (day) byDay[day] = (byDay[day] || 0) + 1;
          });
          setViewsData(
            Object.entries(byDay)
              .map(([day, views]) => ({ day, views }))
              .sort((a, b) => Number(a.day) - Number(b.day))
          );
        }
      }

      if (topRes.length > 0) {
        const titles = await Promise.all(
          topRes.map(async (row) => {
            try {
              const p = await propertyService.getById(row.property_id);
              return { title: p.title, views: row.views };
            } catch {
              return { title: `Property ${row.property_id}`, views: row.views };
            }
          })
        );
        setTopProperties(titles);
      } else {
        setTopProperties([]);
      }
    } catch (err) {
      console.error('Error fetching insights data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Message expand handler removed

  const handleSignOut = async () => {
    await signOut();
    navigate('/home');
  };

  const barData = [
    { name: 'Active', count: propertyStats.active, fill: 'hsl(var(--primary))' },
    { name: 'Sold', count: propertyStats.sold, fill: 'hsl(var(--accent))' },
    { name: 'Rented', count: propertyStats.rented, fill: 'hsl(var(--muted-foreground))' },
  ];

  // Unread count removed

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold text-sidebar-foreground">
              {broker?.platform_name || 'MyFlat'}
            </span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
              Dashboard
            </Link>
            <Link
              to="/dashboard/properties"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <Building2 className="w-5 h-5" />
              Properties
            </Link>
            <Link
              to="/dashboard/insights"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            >
              <TrendingUp className="w-5 h-5" />
              Insights
            </Link>
            <Link
              to="/dashboard/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </nav>

          <div className="px-4 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sidebar-accent-foreground font-medium">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{role || 'Editor'}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background border-b border-border px-4 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-foreground">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">Insights</h1>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-8">

          {/* ── Section A: Package Usage ── */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <CardTitle className="font-display text-lg">Package Usage</CardTitle>
              </div>
              <CardDescription>
                {PLAN_LABELS[plan]} plan · Listing allowance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {planLimit === Infinity ? (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <p className="text-foreground font-medium">
                    Unlimited listings — {usedSlots} published
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{usedSlots}</span> of{' '}
                      <span className="font-semibold text-foreground">{planLimit}</span> listings used
                    </span>
                    <span className="text-muted-foreground">{planLimit - usedSlots} remaining</span>
                  </div>
                  <Progress value={usagePercent} className="h-3" />
                  {usagePercent >= 80 && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>You're approaching your limit. Consider upgrading your plan.</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Section B: Property Status Breakdown ── */}
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Property Status
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Listings</p>
                      <p className="text-3xl font-display font-bold text-foreground mt-1">
                        {loadingData ? '—' : propertyStats.active}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Sold Properties</p>
                      <p className="text-3xl font-display font-bold text-foreground mt-1">
                        {loadingData ? '—' : propertyStats.sold}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Rented Properties</p>
                      <p className="text-3xl font-display font-bold text-foreground mt-1">
                        {loadingData ? '—' : propertyStats.rented}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bar chart */}
            {!loadingData && propertyStats.total > 0 && (
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contact Messages Section Removed */}

          {/* ── Section D: Website Views & Most Watched ── */}
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-primary" />
              Website Views This Month
            </h2>

            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 shadow-card">
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={viewsData.length > 0 ? viewsData : [{ day: '1', views: 0 }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        interval={Math.max(0, Math.floor(viewsData.length / 6))}
                      />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        labelFormatter={(v) => `Day ${v}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-display">Most Viewed Properties</CardTitle>
                  <CardDescription className="text-xs">Views in the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {topProperties.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No properties yet</p>
                  ) : (
                    <div className="space-y-3">
                      {topProperties.map((prop, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{prop.title}</p>
                            <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.round((prop.views / topProperties[0].views) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{prop.views}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
