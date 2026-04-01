import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Building2,
  Users,
  TrendingUp,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  LogOut,
  Settings,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useBroker } from '@/contexts/BrokerContext';
import { Property } from '@/components/properties/PropertyCard';
import { propertyService } from '@/services/propertyService';
import { analyticsService } from '@/services/analyticsService';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, role, isLoading, signOut } = useAuth();
  const { broker } = useBroker();
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewsThisMonth, setViewsThisMonth] = useState(0);
  const [percentVsLastMonth, setPercentVsLastMonth] = useState(0);
  const [insightsTotal, setInsightsTotal] = useState(0);

  const activeCount = properties.filter((p) => p.status === 'active').length;
  const totalCount = properties.length;
  const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

  const stats = [
    { label: 'Total Properties', value: totalCount.toString(), icon: Building2, change: `${totalCount} total` },
    { label: 'Active Listings', value: activeCount.toString(), icon: Home, change: `${activePct}% of total` },
    { label: 'Total Insights', value: insightsTotal.toString(), icon: Users, change: 'from analytics' },
    { label: 'Views This Month', value: viewsThisMonth.toString(), icon: TrendingUp, change: `${percentVsLastMonth >= 0 ? '+' : ''}${percentVsLastMonth}% vs last month` },
  ];

  useEffect(() => {
    if (!profile?.broker_id) return;
    let cancelled = false;
    (async () => {
      try {
        const [propsRes, summaryRes] = await Promise.all([
          propertyService.getAll({ broker_id: profile.broker_id }),
          analyticsService.getSummary().catch(() => null),
        ]);
        if (cancelled) return;
        setProperties(Array.isArray(propsRes) ? propsRes : []);
        if (summaryRes) {
          setViewsThisMonth(summaryRes.viewsThisMonth);
          setPercentVsLastMonth(summaryRes.percentVsLastMonth);
          setInsightsTotal(summaryRes.total);
        }
      } catch (e) {
        if (!cancelled) setProperties([]);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.broker_id]);

  // Redirect if not authenticated
  // useEffect(() => {
  //   if (!isLoading && !user) {
  //     navigate('/login');
  //   }
  // }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/home');
  };

  const formatPrice = (price: number, currency: string, type: 'rent' | 'sale') => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
    return type === 'rent' ? `${formatted}/mo` : formatted;
  };

  const filteredProperties = properties.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold text-sidebar-foreground">
              {broker?.platform_name || 'MyFlat'}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
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

          {/* User */}
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
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {role || 'Editor'}
                </p>
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

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background border-b border-border px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-foreground"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="default" asChild>
                <Link to="/dashboard/properties/new">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Property</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-xl border border-border p-6 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Properties Table */}
          <div className="bg-card rounded-xl border border-border shadow-card">
            <div className="p-4 lg:p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Recent Properties
                </h2>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3">
                      Property
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden md:table-cell">
                      Type
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3">
                      Price
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden lg:table-cell">
                      Status
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProperties.map((property) => (
                    <tr key={property.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={property.image_url}
                            alt={property.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {property.title}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {property.location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                        <Badge variant={property.property_type === 'rent' ? 'secondary' : 'default'}>
                          {property.property_type === 'rent' ? 'For Rent' : 'For Sale'}
                        </Badge>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className="font-medium text-foreground">
                          {formatPrice(property.price, property.currency, property.property_type)}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                        <Badge
                          variant="outline"
                          className={
                            property.status === 'active'
                              ? 'border-green-500 text-green-600'
                              : 'border-yellow-500 text-yellow-600'
                          }
                        >
                          {property.status}
                        </Badge>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/properties/${property.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/dashboard/properties/edit/${property.id}`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={async () => {
                                if (!window.confirm(`Delete "${property.title}"?`)) return;
                                try {
                                  await propertyService.delete(property.id);
                                  setProperties((prev) => prev.filter((p) => p.id !== property.id));
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProperties.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No properties found</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
