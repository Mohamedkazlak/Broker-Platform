import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Home,
  Building2,
  Users,
  LogOut,
  Settings,
  Menu,
  ArrowLeft,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { useBroker } from "@/contexts/BrokerContext";
import { useToast } from "@/hooks/use-toast";
import { propertyService } from "@/services/propertyService";
import { supabase } from "@/integrations/supabase/client";

export default function DashboardAddProperty() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const { user, profile, role, isLoading, signOut } = useAuth();
  const { broker } = useBroker();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(isEdit);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const generatePropertyCode = () => {
    return 'PR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const [form, setForm] = useState({
    property_code: generatePropertyCode(),
    title: "",
    description: "",
    property_type: "sale" as "rent" | "sale",
    price: "",
    currency: "EGP",
    location: "",
    city: "",
    country: "",
    building_type: "apartment" as "apartment" | "villa" | "commercial",
    apartment_level: "",
    villa_levels: "",
    finishing: "" as "" | "economic" | "medium" | "luxury" | "ultra",
    contract_duration: "",
    price_negotiable: false,
    bedrooms: "",
    bathrooms: "",
    area_sqft: "",
    furnished: "" as "" | "furnished" | "unfurnished" | "semi-furnished",
    featured: false,
    status: "active",
    image_url: "",
    image_urls: [] as string[],
    video_urls: [] as string[],
    amenities: [] as string[],
  });

  const amenitiesList = [
    "Elevator",
    "Parking",
    "Balcony / Terrace",
    "Central A/C",
    "Natural Gas",
    "Security / CCTV",
    "Swimming Pool",
    "Garden",
    "Gym / Fitness Center",
    "Laundry Room",
    "Pet Friendly",
    "Smart Home",
  ];

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  useEffect(() => {
    if (!isEdit || !editId) return;
    let cancelled = false;
    (async () => {
      setLoadingProperty(true);
      try {
        const p = await propertyService.getById(editId);
        if (cancelled) return;
        setForm({
          property_code: (p as { property_code?: string }).property_code ?? generatePropertyCode(),
          title: p.title,
          description: p.description ?? "",
          property_type: p.property_type,
          price: String(p.price),
          currency: p.currency ?? "EGP",
          location: p.location,
          city: p.city ?? "",
          country: p.country ?? "",
          building_type: (p.building_type as "apartment" | "villa" | "commercial") ?? "apartment",
          apartment_level: p.apartment_level != null ? String(p.apartment_level) : "",
          villa_levels: p.villa_levels != null ? String(p.villa_levels) : "",
          finishing: (p.finishing as "" | "economic" | "medium" | "luxury" | "ultra") ?? "",
          contract_duration: (p as { contract_duration?: string }).contract_duration ?? "",
          price_negotiable: p.price_negotiable ?? false,
          bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
          bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
          area_sqft: p.area_sqft != null ? String(p.area_sqft) : "",
          furnished: (p.furnished as "" | "furnished" | "unfurnished" | "semi-furnished") ?? "",
          featured: p.featured ?? false,
          status: p.status ?? "active",
          image_url: p.image_url ?? "",
          image_urls: Array.isArray((p as { image_urls?: string[] }).image_urls) ? (p as { image_urls?: string[] }).image_urls : [],
          video_urls: Array.isArray((p as { video_urls?: string[] }).video_urls) ? (p as { video_urls?: string[] }).video_urls : [],
          amenities: Array.isArray(p.amenities) ? p.amenities : [],
        });
      } catch {
        if (!cancelled) toast({ title: "Failed to load property", variant: "destructive" });
      } finally {
        if (!cancelled) setLoadingProperty(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId, isEdit, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalMediaCount = form.image_urls.length + form.video_urls.length + selectedFiles.length + newFiles.length;
      
      if (totalMediaCount > 20) {
        toast({
          title: "Too many media files",
          description: "You can only upload up to 20 images and videos in total.",
          variant: "destructive"
        });
        return;
      }

      // Check file size (e.g., 50MB limit)
      const oversizedFiles = newFiles.filter(file => file.size > 50 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast({
          title: "File too large",
          description: "Each media file must be smaller than 50MB.",
          variant: "destructive"
        });
        return;
      }

      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.price || !form.location || !form.property_type) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const finalImageUrls = [...form.image_urls];
      const finalVideoUrls = [...form.video_urls];

      if (selectedFiles.length > 0) {
        let uploadedCount = 0;
        setUploadProgress(`Uploading media (0/${selectedFiles.length})...`);
        
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const isVideo = file.type.startsWith('video/');
          const prefix = isVideo ? 'vid' : 'img';
          const fileName = `${form.property_code}-${prefix}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            throw new Error(`Failed to upload ${file.name}`);
          }

          const { data } = supabase.storage
            .from('property-images')
            .getPublicUrl(filePath);

          if (isVideo) {
            finalVideoUrls.push(data.publicUrl);
          } else {
            finalImageUrls.push(data.publicUrl);
          }
          
          uploadedCount++;
          setUploadProgress(`Uploading media (${uploadedCount}/${selectedFiles.length})...`);
        }
      }
      setUploadProgress(null);

      const payload = {
        property_code: form.property_code,
        title: form.title,
        description: form.description || null,
        property_type: form.property_type,
        price: Number(form.price),
        currency: form.currency,
        location: form.location,
        city: form.city || null,
        country: form.country || null,
        building_type: form.building_type,
        apartment_level: form.apartment_level ? Number(form.apartment_level) : null,
        villa_levels: form.villa_levels ? Number(form.villa_levels) : null,
        finishing: form.finishing || null,
        contract_duration: form.contract_duration || null,
        price_negotiable: form.price_negotiable,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
        furnished: form.furnished || false,
        featured: form.featured,
        status: form.status,
        image_url: form.image_url || (finalImageUrls[0] as string) || "",
        image_urls: finalImageUrls,
        video_urls: finalVideoUrls,
        amenities: form.amenities,
      };
      if (isEdit && editId) {
        await propertyService.update(editId, payload);
        toast({ title: "Property updated", description: `"${form.title}" has been updated.` });
      } else {
        await propertyService.create(payload);
        toast({ title: "Property added", description: `"${form.title}" has been created successfully.` });
      }
      navigate("/dashboard/properties");
    } catch (err) {
      toast({
        title: isEdit ? "Failed to update property" : "Failed to add property",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setUploadProgress(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || (isEdit && loadingProperty)) {
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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-display font-bold text-lg">
                M
              </span>
            </div>
            <span className="font-display text-lg font-semibold text-sidebar-foreground">
              {broker?.platform_name || "MyFlat"}
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
              <Users className="w-5 h-5" />
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
                  {profile?.full_name?.charAt(0) ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || "User"}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {role || "Editor"}
                </p>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  navigate("/home");
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/properties">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            </Button>
            <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
              {isEdit ? "Edit Property" : "Add New Property"}
            </h1>
          </div>
        </header>

        <div className="p-4 lg:p-8 w-full max-w-4xl mx-auto min-w-0">
          <form onSubmit={handleSubmit} className="space-y-8 w-full">
            {/* Basic Info */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Basic Information
              </h2>

              <div className="space-y-2">
                <Label htmlFor="property_code">Property Code</Label>
                <Input
                  id="property_code"
                  value={form.property_code}
                  disabled
                  className="bg-muted max-w-sm"
                />
                <p className="text-xs text-muted-foreground">Auto-generated unique ID</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the property..."
                  rows={4}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Listed as *</Label>
                  <Select
                    value={form.property_type}
                    onValueChange={(v) => handleChange("property_type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">For Sale</SelectItem>
                      <SelectItem value="rent">For Rent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => handleChange("status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="rented">Rented</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    placeholder="e.g. 2500000"
                    value={form.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) => handleChange("currency", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGP">EGP</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.property_type === "rent" && (
                <div className="space-y-2">
                  <Label>Contract Duration</Label>
                  <Select
                    value={form.contract_duration}
                    onValueChange={(v) => handleChange("contract_duration", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contract duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 month</SelectItem>
                      <SelectItem value="2">2 months</SelectItem>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">1 Year</SelectItem>
                      <SelectItem value="24">2 Years</SelectItem>
                      <SelectItem value="60">5 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Checkbox
                  id="price_negotiable"
                  checked={form.price_negotiable}
                  onCheckedChange={(v) => handleChange("price_negotiable", !!v)}
                />
                <Label
                  htmlFor="price_negotiable"
                  className="text-sm font-normal cursor-pointer"
                >
                  Price is negotiable
                </Label>
              </div>
            </div>

            {/* Unit Details */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Unit Details
              </h2>

              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select
                  value={form.building_type}
                  onValueChange={(v) =>
                    handleChange(
                      "building_type",
                      v as "apartment" | "villa" | "commercial",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="commercial">Commercial Units</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.building_type === "apartment" && (
                <div className="space-y-2">
                  <Label htmlFor="apartment_level">Apartment Level</Label>
                  <Input
                    id="apartment_level"
                    type="number"
                    min={1}
                    max={99}
                    placeholder="e.g. 3"
                    value={form.apartment_level}
                    onChange={(e) =>
                      handleChange("apartment_level", e.target.value)
                    }
                  />
                </div>
              )}

              {form.building_type === "villa" && (
                <div className="space-y-2">
                  <Label>Number of Levels</Label>
                  <RadioGroup
                    value={form.villa_levels}
                    onValueChange={(v) => handleChange("villa_levels", v)}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="1" id="villa-1" />
                      <Label
                        htmlFor="villa-1"
                        className="font-normal cursor-pointer"
                      >
                        1 Level
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="2" id="villa-2" />
                      <Label
                        htmlFor="villa-2"
                        className="font-normal cursor-pointer"
                      >
                        2 Levels
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="3" id="villa-3" />
                      <Label
                        htmlFor="villa-3"
                        className="font-normal cursor-pointer"
                      >
                        3 Levels
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-2">
                <Label>Finishing</Label>
                <Select
                  value={form.finishing}
                  onValueChange={(v) =>
                    handleChange(
                      "finishing",
                      v as "" | "economic" | "medium" | "luxury" | "ultra",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select finishing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economic">Economic (basic)</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="luxury">
                      Luxury (high-end materials like marble)
                    </SelectItem>
                    <SelectItem value="ultra">
                      Ultra-Super Lux (customized, premium)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor={
                      form.building_type === "commercial"
                        ? "offices"
                        : "bedrooms"
                    }
                  >
                    {form.building_type === "commercial"
                      ? "Offices"
                      : "Bedrooms"}
                  </Label>
                  <Input
                    id={
                      form.building_type === "commercial"
                        ? "offices"
                        : "bedrooms"
                    }
                    type="number"
                    min="0"
                    placeholder={
                      form.building_type === "commercial"
                        ? "1, 2, 3, etc.."
                        : "1, 2, 3, etc.."
                    }
                    value={form.bedrooms}
                    onChange={(e) => handleChange("bedrooms", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    placeholder="1, 2, 3, etc.."
                    value={form.bathrooms}
                    onChange={(e) => handleChange("bathrooms", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area_sqft">Area (m²)</Label>
                  <Input
                    id="area_sqft"
                    type="number"
                    min="0"
                    placeholder="90, 100, 150, etc.."
                    value={form.area_sqft}
                    onChange={(e) => handleChange("area_sqft", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Furnished</Label>
                <Select
                  value={form.furnished}
                  onValueChange={(v) =>
                    handleChange(
                      "furnished",
                      v as "" | "furnished" | "unfurnished" | "semi-furnished",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="furnished">Furnished</SelectItem>
                    <SelectItem value="unfurnished">Unfurnished</SelectItem>
                    <SelectItem value="semi-furnished">
                      Semi-Furnished
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="featured"
                  checked={form.featured}
                  onCheckedChange={(v) => handleChange("featured", v)}
                />
                <Label
                  htmlFor="featured"
                  className="font-normal cursor-pointer"
                >
                  Featured Listing
                </Label>
              </div>
            </div>

            {/* Location */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Location
              </h2>

              <div className="space-y-2">
                <Label htmlFor="location">Address / Area *</Label>
                <Input
                  id="location"
                  placeholder="e.g. Maadi, New Cairo, etc.."
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g. Cairo, Giza, etc.."
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="Egypt"
                    value={form.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Amenities & Features */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Amenities & Features
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {amenitiesList.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`amenity-${amenity}`}
                      checked={form.amenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <Label
                      htmlFor={`amenity-${amenity}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {amenity}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Image */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Media
              </h2>

              <div className="space-y-2">
                <Label htmlFor="video_url">Video URL</Label>
                <Input
                  id="video_url"
                  type="url"
                  placeholder="https://... (e.g. YouTube, Vimeo, or direct video link)"
                  value={form.image_url}
                  onChange={(e) => handleChange("image_url", e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="file-upload"
                      />
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="pointer-events-none"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Media
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = form.image_url?.trim();
                        if (url) {
                          setForm((prev) => ({
                            ...prev,
                            video_urls: [...prev.video_urls, url],
                            image_url: "",
                          }));
                        }
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Attach Video URL
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground w-full">
                    Click Upload Media to choose image/video files from your device, or paste a video link above and click Attach Video URL. First image uploaded/selected is the main photo. (Max 20 total, 50MB per file)
                  </span>
                </div>
                {(form.image_urls.length > 0 || form.video_urls.length > 0 || selectedFiles.length > 0) && (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Included Media ({form.image_urls.length + form.video_urls.length + selectedFiles.length}/20)</p>
                    <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {form.image_urls.map((url, i) => (
                        <li key={`url-${i}`} className="relative group aspect-video bg-muted rounded-md overflow-hidden border border-border">
                          <img src={url} alt={`Property image ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                            <span className="text-xs text-white truncate w-full text-center px-1 mb-2 bg-black/40 rounded">{url}</span>
                            <button
                              type="button"
                              className="text-white hover:text-destructive bg-black/40 px-2 py-1 rounded text-xs"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  image_urls: prev.image_urls.filter((_, j) => j !== i),
                                }))
                              }
                            >
                              Remove Link
                            </button>
                          </div>
                        </li>
                      ))}
                      {form.video_urls.map((url, i) => (
                        <li key={`video-url-${i}`} className="relative group aspect-video bg-muted rounded-md overflow-hidden border border-border">
                          <video src={url} className="w-full h-full object-cover" controls={false} />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                            <span className="text-xs text-white truncate w-full text-center px-1 mb-2 bg-black/40 rounded">{url}</span>
                            <button
                              type="button"
                              className="text-white hover:text-destructive bg-black/40 px-2 py-1 rounded text-xs"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  video_urls: prev.video_urls.filter((_, j) => j !== i),
                                }))
                              }
                            >
                              Remove Video
                            </button>
                          </div>
                        </li>
                      ))}
                      {selectedFiles.map((file, i) => (
                        <li key={`file-${i}`} className="relative group aspect-video bg-muted rounded-md overflow-hidden border border-border">
                          {file.type.startsWith('image/') ? (
                             <img src={URL.createObjectURL(file)} alt={`Selected file ${i + 1}`} className="w-full h-full object-cover" />
                          ) : (
                             <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" controls={false} />
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                            <span className="text-xs text-white truncate w-full text-center px-1 mb-2 bg-black/40 rounded">{file.name}</span>
                            <button
                              type="button"
                              className="text-white hover:text-destructive bg-black/40 px-2 py-1 rounded text-xs"
                              onClick={() => removeSelectedFile(i)}
                            >
                              Remove File
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {(form.image_url || form.image_urls[0]) && (
                <div className="relative w-full max-w-xs rounded-lg overflow-hidden border border-border">
                  <img
                    src={form.image_url || form.image_urls[0]}
                    alt="Preview"
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <span className="text-sm text-muted-foreground">{uploadProgress}</span>
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={submitting}
              >
                <Link to="/dashboard/properties">Cancel</Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? uploadProgress || "Saving..." : isEdit ? "Update Property" : "Save Property"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
