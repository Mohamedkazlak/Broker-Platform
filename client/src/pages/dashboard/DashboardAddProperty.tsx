import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Menu,
  ArrowLeft,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { useToast } from "@/hooks/use-toast";
import { propertyService } from "@/services/propertyService";
import { supabase } from "@/integrations/supabase/client";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import {
  AMENITY_KEYS,
  normalizeAmenityPersistedList,
} from "@/utils/amenities";

export default function DashboardAddProperty() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const { isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(isEdit);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const generatePropertyCode = () => {
    return "PR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
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
          property_code:
            (p as { property_code?: string }).property_code ?? generatePropertyCode(),
          title: p.title,
          description: p.description ?? "",
          property_type: p.property_type,
          price: String(p.price),
          currency: p.currency ?? "EGP",
          location: p.location,
          city: p.city ?? "",
          country: p.country ?? "",
          building_type:
            (p.building_type as "apartment" | "villa" | "commercial") ?? "apartment",
          apartment_level:
            p.apartment_level != null ? String(p.apartment_level) : "",
          villa_levels: p.villa_levels != null ? String(p.villa_levels) : "",
          finishing:
            (p.finishing as "" | "economic" | "medium" | "luxury" | "ultra") ?? "",
          contract_duration:
            (p as { contract_duration?: string }).contract_duration ?? "",
          price_negotiable: p.price_negotiable ?? false,
          bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
          bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
          area_sqft: p.area_sqft != null ? String(p.area_sqft) : "",
          furnished:
            (p.furnished as "" | "furnished" | "unfurnished" | "semi-furnished") ??
            "",
          featured: p.featured ?? false,
          status: p.status ?? "active",
          image_url: p.image_url ?? "",
          image_urls: Array.isArray((p as { image_urls?: string[] }).image_urls)
            ? (p as { image_urls?: string[] }).image_urls!
            : [],
          video_urls: Array.isArray((p as { video_urls?: string[] }).video_urls)
            ? (p as { video_urls?: string[] }).video_urls!
            : [],
          amenities: normalizeAmenityPersistedList(
            Array.isArray(p.amenities) ? p.amenities : [],
          ),
        });
      } catch {
        if (!cancelled)
          toast({
            title: t("addProperty.toasts.loadFailed"),
            variant: "destructive",
          });
      } finally {
        if (!cancelled) setLoadingProperty(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, isEdit, toast, t]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalMediaCount =
        form.image_urls.length +
        form.video_urls.length +
        selectedFiles.length +
        newFiles.length;

      if (totalMediaCount > 20) {
        toast({
          title: t("addProperty.toasts.tooManyTitle"),
          description: t("addProperty.toasts.tooManyDescription"),
          variant: "destructive",
        });
        return;
      }

      const oversizedFiles = newFiles.filter(
        (file) => file.size > 50 * 1024 * 1024,
      );
      if (oversizedFiles.length > 0) {
        toast({
          title: t("addProperty.toasts.fileTooLargeTitle"),
          description: t("addProperty.toasts.fileTooLargeDescription"),
          variant: "destructive",
        });
        return;
      }

      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.price || !form.location || !form.property_type) {
      toast({
        title: t("addProperty.toasts.missingFieldsTitle"),
        description: t("addProperty.toasts.missingFieldsDescription"),
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
        setUploadProgress(
          t("addProperty.toasts.uploading", {
            uploaded: 0,
            total: selectedFiles.length,
          }),
        );

        for (const file of selectedFiles) {
          const fileExt = file.name.split(".").pop();
          const isVideo = file.type.startsWith("video/");
          const prefix = isVideo ? "vid" : "img";
          const fileName = `${form.property_code}-${prefix}-${Math.random()
            .toString(36)
            .substring(2, 9)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("property-images")
            .upload(filePath, file);

          if (uploadError) {
            console.error("Error uploading file:", uploadError);
            throw new Error(`Failed to upload ${file.name}`);
          }

          const { data } = supabase.storage
            .from("property-images")
            .getPublicUrl(filePath);

          if (isVideo) {
            finalVideoUrls.push(data.publicUrl);
          } else {
            finalImageUrls.push(data.publicUrl);
          }

          uploadedCount++;
          setUploadProgress(
            t("addProperty.toasts.uploading", {
              uploaded: uploadedCount,
              total: selectedFiles.length,
            }),
          );
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
        amenities: normalizeAmenityPersistedList(form.amenities),
      };
      if (isEdit && editId) {
        await propertyService.update(editId, payload);
        toast({
          title: t("addProperty.toasts.updatedTitle"),
          description: t("addProperty.toasts.updatedDescription", {
            title: form.title,
          }),
        });
      } else {
        await propertyService.create(payload);
        toast({
          title: t("addProperty.toasts.createdTitle"),
          description: t("addProperty.toasts.createdDescription", {
            title: form.title,
          }),
        });
      }
      navigate("/dashboard/properties");
    } catch (err) {
      toast({
        title: isEdit
          ? t("addProperty.toasts.updateFailedTitle")
          : t("addProperty.toasts.createFailedTitle"),
        description:
          err instanceof Error
            ? err.message
            : t("addProperty.toasts.genericDescription"),
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
      <DashboardSidebar sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background border-b border-border px-4 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-foreground"
              aria-label="menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/properties">
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                {t("addProperty.back")}
              </Link>
            </Button>
            <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
              {isEdit ? t("addProperty.headingEdit") : t("addProperty.headingAdd")}
            </h1>
          </div>
        </header>

        <div className="p-4 lg:p-8 w-full max-w-4xl mx-auto min-w-0">
          <form onSubmit={handleSubmit} className="space-y-8 w-full">
            {/* Basic Info */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {t("addProperty.sections.basic")}
              </h2>

              <div className="space-y-2">
                <Label htmlFor="property_code">
                  {t("addProperty.fields.propertyCode")}
                </Label>
                <Input
                  id="property_code"
                  value={form.property_code}
                  disabled
                  className="bg-muted max-w-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t("addProperty.fields.propertyCodeHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">{t("addProperty.fields.title")}</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  {t("addProperty.fields.description")}
                </Label>
                <Textarea
                  id="description"
                  placeholder={t("addProperty.fields.descriptionPlaceholder")}
                  rows={4}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("addProperty.fields.listedAs")}</Label>
                  <Select
                    value={form.property_type}
                    onValueChange={(v) => handleChange("property_type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">
                        {t("properties.filters.forSale")}
                      </SelectItem>
                      <SelectItem value="rent">
                        {t("properties.filters.forRent")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("addProperty.fields.status")}</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => handleChange("status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("addProperty.fields.statusActive")}
                      </SelectItem>
                      <SelectItem value="sold">
                        {t("addProperty.fields.statusSold")}
                      </SelectItem>
                      <SelectItem value="rented">
                        {t("addProperty.fields.statusRented")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">{t("addProperty.fields.price")}</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    placeholder={t("addProperty.fields.pricePlaceholder")}
                    value={form.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("addProperty.fields.currency")}</Label>
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
                  <Label>{t("addProperty.fields.contractDuration")}</Label>
                  <Select
                    value={form.contract_duration}
                    onValueChange={(v) => handleChange("contract_duration", v)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("addProperty.fields.contractDurationPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t("addProperty.fields.months1")}</SelectItem>
                      <SelectItem value="2">{t("addProperty.fields.months2")}</SelectItem>
                      <SelectItem value="3">{t("addProperty.fields.months3")}</SelectItem>
                      <SelectItem value="6">{t("addProperty.fields.months6")}</SelectItem>
                      <SelectItem value="12">{t("addProperty.fields.year1")}</SelectItem>
                      <SelectItem value="24">{t("addProperty.fields.years2")}</SelectItem>
                      <SelectItem value="60">{t("addProperty.fields.years5")}</SelectItem>
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
                  {t("addProperty.fields.priceNegotiable")}
                </Label>
              </div>
            </div>

            {/* Unit Details */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {t("addProperty.sections.unit")}
              </h2>

              <div className="space-y-2">
                <Label>{t("addProperty.fields.propertyType")}</Label>
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
                    <SelectItem value="apartment">
                      {t("addProperty.fields.apartment")}
                    </SelectItem>
                    <SelectItem value="villa">
                      {t("addProperty.fields.villa")}
                    </SelectItem>
                    <SelectItem value="commercial">
                      {t("addProperty.fields.commercial")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.building_type === "apartment" && (
                <div className="space-y-2">
                  <Label htmlFor="apartment_level">
                    {t("addProperty.fields.apartmentLevel")}
                  </Label>
                  <Input
                    id="apartment_level"
                    type="number"
                    min={1}
                    max={99}
                    placeholder={t("addProperty.fields.apartmentLevelPlaceholder")}
                    value={form.apartment_level}
                    onChange={(e) =>
                      handleChange("apartment_level", e.target.value)
                    }
                  />
                </div>
              )}

              {form.building_type === "villa" && (
                <div className="space-y-2">
                  <Label>{t("addProperty.fields.numberOfLevels")}</Label>
                  <RadioGroup
                    value={form.villa_levels}
                    onValueChange={(v) => handleChange("villa_levels", v)}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="1" id="villa-1" />
                      <Label htmlFor="villa-1" className="font-normal cursor-pointer">
                        {t("addProperty.fields.level1")}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="2" id="villa-2" />
                      <Label htmlFor="villa-2" className="font-normal cursor-pointer">
                        {t("addProperty.fields.level2")}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="3" id="villa-3" />
                      <Label htmlFor="villa-3" className="font-normal cursor-pointer">
                        {t("addProperty.fields.level3")}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("addProperty.fields.finishing")}</Label>
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
                    <SelectValue
                      placeholder={t("addProperty.fields.finishingPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economic">
                      {t("addProperty.fields.finishingEconomic")}
                    </SelectItem>
                    <SelectItem value="medium">
                      {t("addProperty.fields.finishingMedium")}
                    </SelectItem>
                    <SelectItem value="luxury">
                      {t("addProperty.fields.finishingLuxury")}
                    </SelectItem>
                    <SelectItem value="ultra">
                      {t("addProperty.fields.finishingUltra")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor={
                      form.building_type === "commercial" ? "offices" : "bedrooms"
                    }
                  >
                    {form.building_type === "commercial"
                      ? t("addProperty.fields.offices")
                      : t("addProperty.fields.bedrooms")}
                  </Label>
                  <Input
                    id={
                      form.building_type === "commercial" ? "offices" : "bedrooms"
                    }
                    type="number"
                    min="0"
                    placeholder={t("addProperty.fields.roomCountPlaceholder")}
                    value={form.bedrooms}
                    onChange={(e) => handleChange("bedrooms", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">
                    {t("addProperty.fields.bathrooms")}
                  </Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    placeholder={t("addProperty.fields.roomCountPlaceholder")}
                    value={form.bathrooms}
                    onChange={(e) => handleChange("bathrooms", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area_sqft">{t("addProperty.fields.area")}</Label>
                  <Input
                    id="area_sqft"
                    type="number"
                    min="0"
                    placeholder={t("addProperty.fields.areaPlaceholder")}
                    value={form.area_sqft}
                    onChange={(e) => handleChange("area_sqft", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("addProperty.fields.furnished")}</Label>
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
                    <SelectValue
                      placeholder={t("addProperty.fields.furnishedPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="furnished">
                      {t("addProperty.fields.furnishedYes")}
                    </SelectItem>
                    <SelectItem value="unfurnished">
                      {t("addProperty.fields.furnishedNo")}
                    </SelectItem>
                    <SelectItem value="semi-furnished">
                      {t("addProperty.fields.furnishedSemi")}
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
                <Label htmlFor="featured" className="font-normal cursor-pointer">
                  {t("addProperty.fields.featuredListing")}
                </Label>
              </div>
            </div>

            {/* Location */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {t("addProperty.sections.location")}
              </h2>

              <div className="space-y-2">
                <Label htmlFor="location">
                  {t("addProperty.fields.locationAddress")}
                </Label>
                <Input
                  id="location"
                  placeholder={t("addProperty.fields.locationAddressPlaceholder")}
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t("addProperty.fields.city")}</Label>
                  <Input
                    id="city"
                    placeholder={t("addProperty.fields.cityPlaceholder")}
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t("addProperty.fields.country")}</Label>
                  <Input
                    id="country"
                    placeholder={t("addProperty.fields.countryPlaceholder")}
                    value={form.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Amenities & Features */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {t("addProperty.sections.amenities")}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {AMENITY_KEYS.map((key) => {
                  const label = t(`addProperty.amenities.${key}`);
                  return (
                    <div key={key} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`amenity-${key}`}
                        checked={form.amenities.includes(key)}
                        onCheckedChange={() => toggleAmenity(key)}
                      />
                      <Label
                        htmlFor={`amenity-${key}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Media */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {t("addProperty.sections.media")}
              </h2>

              <div className="space-y-2">
                <Label htmlFor="video_url">
                  {t("addProperty.fields.videoUrl")}
                </Label>
                <Input
                  id="video_url"
                  type="url"
                  placeholder={t("addProperty.fields.videoUrlPlaceholder")}
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
                        <Upload className="w-4 h-4 me-2" />
                        {t("addProperty.fields.uploadMedia")}
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
                      <Upload className="w-4 h-4 me-2" />
                      {t("addProperty.fields.attachVideoUrl")}
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground w-full">
                    {t("addProperty.fields.uploadHint")}
                  </span>
                </div>
                {(form.image_urls.length > 0 ||
                  form.video_urls.length > 0 ||
                  selectedFiles.length > 0) && (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">
                      {t("addProperty.fields.includedMedia", {
                        count:
                          form.image_urls.length +
                          form.video_urls.length +
                          selectedFiles.length,
                      })}
                    </p>
                    <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {form.image_urls.map((url, i) => (
                        <li
                          key={`url-${i}`}
                          className="relative group aspect-video bg-muted rounded-md overflow-hidden border border-border"
                        >
                          <img
                            src={url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                            <span className="text-xs text-white truncate w-full text-center px-1 mb-2 bg-black/40 rounded">
                              {url}
                            </span>
                            <button
                              type="button"
                              className="text-white hover:text-destructive bg-black/40 px-2 py-1 rounded text-xs"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  image_urls: prev.image_urls.filter(
                                    (_, j) => j !== i,
                                  ),
                                }))
                              }
                            >
                              {t("addProperty.fields.removeLink")}
                            </button>
                          </div>
                        </li>
                      ))}
                      {form.video_urls.map((url, i) => (
                        <li
                          key={`video-url-${i}`}
                          className="relative group aspect-video bg-muted rounded-md overflow-hidden border border-border"
                        >
                          <video
                            src={url}
                            className="w-full h-full object-cover"
                            controls={false}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                            <span className="text-xs text-white truncate w-full text-center px-1 mb-2 bg-black/40 rounded">
                              {url}
                            </span>
                            <button
                              type="button"
                              className="text-white hover:text-destructive bg-black/40 px-2 py-1 rounded text-xs"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  video_urls: prev.video_urls.filter(
                                    (_, j) => j !== i,
                                  ),
                                }))
                              }
                            >
                              {t("addProperty.fields.removeVideo")}
                            </button>
                          </div>
                        </li>
                      ))}
                      {selectedFiles.map((file, i) => (
                        <li
                          key={`file-${i}`}
                          className="relative group aspect-video bg-muted rounded-md overflow-hidden border border-border"
                        >
                          {file.type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={URL.createObjectURL(file)}
                              className="w-full h-full object-cover"
                              controls={false}
                            />
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                            <span className="text-xs text-white truncate w-full text-center px-1 mb-2 bg-black/40 rounded">
                              {file.name}
                            </span>
                            <button
                              type="button"
                              className="text-white hover:text-destructive bg-black/40 px-2 py-1 rounded text-xs"
                              onClick={() => removeSelectedFile(i)}
                            >
                              {t("addProperty.fields.removeFile")}
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
                    alt=""
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
              <span className="text-sm text-muted-foreground">
                {uploadProgress}
              </span>
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={submitting}
              >
                <Link to="/dashboard/properties">{tCommon("actions.cancel")}</Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? uploadProgress || t("addProperty.submit.saving")
                  : isEdit
                  ? t("addProperty.submit.update")
                  : t("addProperty.submit.save")}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
