import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  Building2,
  Users,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  LogOut,
  Settings,
  Plus,
  Menu,
  TrendingUp,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useBroker } from '@/contexts/BrokerContext';
import { Property } from '@/components/properties/PropertyCard';
import { propertyService } from '@/services/propertyService';

export default function DashboardProperties() {
  const navigate = useNavigate();
  const { user, profile, role, isLoading, signOut } = useAuth();
  const { broker } = useBroker();
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchProperties = async () => {
    if (!profile?.broker_id) return;
    try {
      const data = await propertyService.getAll({ broker_id: profile.broker_id });
      setProperties(Array.isArray(data) ? data : []);
    } catch {
      setProperties([]);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [profile?.broker_id]);

  const formatPrice = (price: number, currency: string, type: 'rent' | 'sale') => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
    return type === 'rent' ? `${formatted}/mo` : formatted;
  };

  const filteredProperties = properties.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || p.property_type === filterType;
    return matchesSearch && matchesType;
  });

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
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
                onClick={async () => {
                  await signOut();
                  navigate('/home');
                }}
                className="p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0">
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
                Properties
              </h1>
            </div>
            <Button variant="default" asChild>
              <Link to="/dashboard/properties/new">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Property</span>
              </Link>
            </Button>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                <SelectItem value="rent">For Rent</SelectItem>
                <SelectItem value="sale">For Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Properties Table */}
          <div className="bg-card rounded-xl border border-border shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3">Property</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden md:table-cell">Type</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3">Price</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden sm:table-cell">Beds</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden lg:table-cell">Area</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden lg:table-cell">Status</th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3">Actions</th>
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
                            <p className="font-medium text-foreground truncate">{property.title}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {property.location}{property.city ? `, ${property.city}` : ''}
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
                      <td className="px-4 lg:px-6 py-4 hidden sm:table-cell text-muted-foreground">
                        {property.bedrooms ?? '-'}
                      </td>
                      <td className="px-4 lg:px-6 py-4 hidden lg:table-cell text-muted-foreground">
                        {property.area_sqft ? `${property.area_sqft.toLocaleString()} sqft` : '-'}
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
                                  await fetchProperties();
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
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No properties found</p>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Showing {filteredProperties.length} of {properties.length} properties
          </p>
        </div>
      </main>
    </div>
  );
}
