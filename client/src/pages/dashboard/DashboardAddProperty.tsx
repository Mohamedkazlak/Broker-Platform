import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Menu,
  ArrowLeft,
  Upload,
  Link2,
  ChevronUp,
  ChevronDown,
  Star,
  Film,
  Image as ImageIcon,
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
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { GovernorateSelect } from "@/components/forms/GovernorateSelect";
import { PropertyImage } from "@/components/properties/PropertyImage";
import { PropertyVideo } from "@/components/properties/PropertyVideo";
import { AMENITY_KEYS, normalizeAmenityPersistedList } from "@/utils/amenities";
import {
  coverFromGallery,
  normalizePropertyGallery,
  normalizePropertyImageLink,
} from "@/utils/propertyImageLinks";
import { parsePropertyVideoLink } from "@/utils/propertyVideoLinks";
import { cn } from "@/lib/utils";

type MediaSourceTab = "link" | "device";

type MediaItem = {
  id: string;
  mediaType: "image" | "video";
  source: "url" | "file";
  url?: string;
  file?: File;
  previewUrl?: string;
};

function createMediaId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const mediaItemsRef = useRef<MediaItem[]>([]);
  const [mediaSourceTab, setMediaSourceTab] = useState<MediaSourceTab>("link");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [imageLinkDraft, setImageLinkDraft] = useState("");
  const [videoLinkDraft, setVideoLinkDraft] = useState("");
  const [imageLinkError, setImageLinkError] = useState<string | null>(null);
  const [videoLinkError, setVideoLinkError] = useState<string | null>(null);

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
            (p as { property_code?: string }).property_code ??
            generatePropertyCode(),
          title: p.title,
          description: p.description ?? "",
          property_type: p.property_type,
          price: String(p.price),
          currency: p.currency ?? "EGP",
          location: p.location,
          city: p.city ?? "",
          country: p.country ?? "",
          building_type:
            (p.building_type as "apartment" | "villa" | "commercial") ??
            "apartment",
          apartment_level:
            p.apartment_level != null ? String(p.apartment_level) : "",
          villa_levels: p.villa_levels != null ? String(p.villa_levels) : "",
          finishing:
            (p.finishing as "" | "economic" | "medium" | "luxury" | "ultra") ??
            "",
          contract_duration:
            (p as { contract_duration?: string }).contract_duration ?? "",
          price_negotiable: p.price_negotiable ?? false,
          bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
          bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
          area_sqft: p.area_sqft != null ? String(p.area_sqft) : "",
          furnished:
            (p.furnished as
              | ""
              | "furnished"
              | "unfurnished"
              | "semi-furnished") ?? "",
          featured: p.featured ?? false,
          status: p.status ?? "active",
          amenities: normalizeAmenityPersistedList(
            Array.isArray(p.amenities) ? p.amenities : [],
          ),
        });
        const imageUrls = normalizePropertyGallery(
          p.image_url,
          Array.isArray((p as { image_urls?: string[] }).image_urls)
            ? (p as { image_urls?: string[] }).image_urls!
            : [],
        );
        const videoUrls = Array.isArray(
          (p as { video_urls?: string[] }).video_urls,
        )
          ? (p as { video_urls?: string[] }).video_urls!
          : [];
        setMediaItems([
          ...imageUrls.map(
            (url): MediaItem => ({
              id: createMediaId(),
              mediaType: "image",
              source: "url",
              url,
            }),
          ),
          ...videoUrls.map(
            (url): MediaItem => ({
              id: createMediaId(),
              mediaType: "video",
              source: "url",
              url,
            }),
          ),
        ]);
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

  useEffect(() => {
    mediaItemsRef.current = mediaItems;
  }, [mediaItems]);

  useEffect(() => {
    return () => {
      mediaItemsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const mediaCount = mediaItems.length;

  const firstImageIndex = useMemo(
    () => mediaItems.findIndex((item) => item.mediaType === "image"),
    [mediaItems],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    e.target.value = "";

    if (mediaCount + newFiles.length > 20) {
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

    const nextItems: MediaItem[] = newFiles.map((file) => {
      const isVideo = file.type.startsWith("video/");
      return {
        id: createMediaId(),
        mediaType: isVideo ? "video" : "image",
        source: "file",
        file,
        previewUrl: URL.createObjectURL(file),
      };
    });

    setMediaItems((prev) => [...prev, ...nextItems]);
  };

  const addImageLink = () => {
    const result = normalizePropertyImageLink(imageLinkDraft);
    if (result.ok === false) {
      if (result.reason === "folder") {
        setImageLinkError(t("addProperty.fields.driveFolderUnsupported"));
      } else if (result.reason === "empty") {
        setImageLinkError(t("addProperty.fields.imageLinkRequired"));
      } else {
        setImageLinkError(t("addProperty.fields.imageLinkInvalid"));
      }
      return;
    }

    if (mediaCount >= 20) {
      toast({
        title: t("addProperty.toasts.tooManyTitle"),
        description: t("addProperty.toasts.tooManyDescription"),
        variant: "destructive",
      });
      return;
    }

    if (
      mediaItems.some(
        (item) =>
          item.mediaType === "image" &&
          item.source === "url" &&
          item.url === result.url,
      )
    ) {
      setImageLinkError(t("addProperty.fields.imageLinkDuplicate"));
      return;
    }

    setMediaItems((prev) => [
      ...prev,
      {
        id: createMediaId(),
        mediaType: "image",
        source: "url",
        url: result.url,
      },
    ]);
    setImageLinkDraft("");
    setImageLinkError(null);
  };

  const addVideoLink = () => {
    const result = parsePropertyVideoLink(videoLinkDraft);
    if (result.ok === false) {
      if (result.reason === "folder") {
        setVideoLinkError(t("addProperty.fields.driveFolderUnsupported"));
      } else if (result.reason === "empty") {
        setVideoLinkError(t("addProperty.fields.videoLinkRequired"));
      } else {
        setVideoLinkError(t("addProperty.fields.videoLinkInvalid"));
      }
      return;
    }

    if (mediaCount >= 20) {
      toast({
        title: t("addProperty.toasts.tooManyTitle"),
        description: t("addProperty.toasts.tooManyDescription"),
        variant: "destructive",
      });
      return;
    }

    if (
      mediaItems.some(
        (item) =>
          item.mediaType === "video" &&
          item.source === "url" &&
          item.url === result.url,
      )
    ) {
      setVideoLinkError(t("addProperty.fields.videoLinkDuplicate"));
      return;
    }

    setMediaItems((prev) => [
      ...prev,
      {
        id: createMediaId(),
        mediaType: "video",
        source: "url",
        url: result.url,
      },
    ]);
    setVideoLinkDraft("");
    setVideoLinkError(null);
  };

  const moveMedia = (index: number, direction: -1 | 1) => {
    setMediaItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  const removeMediaAt = (index: number) => {
    setMediaItems((prev) => {
      const item = prev[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, j) => j !== index);
    });
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
      const finalImageUrls: string[] = [];
      const finalVideoUrls: string[] = [];
      const filesToUpload = mediaItems.filter((item) => item.source === "file");
      let uploadedCount = 0;

      if (filesToUpload.length > 0) {
        setUploadProgress(
          t("addProperty.toasts.uploading", {
            uploaded: 0,
            total: filesToUpload.length,
          }),
        );
      }

      for (const item of mediaItems) {
        if (item.source === "url" && item.url) {
          if (item.mediaType === "image") finalImageUrls.push(item.url);
          else finalVideoUrls.push(item.url);
          continue;
        }

        if (item.source !== "file" || !item.file) continue;

        const file = item.file;
        const fileExt = file.name.split(".").pop();
        const isVideo = item.mediaType === "video";
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

        if (isVideo) finalVideoUrls.push(data.publicUrl);
        else finalImageUrls.push(data.publicUrl);

        uploadedCount++;
        setUploadProgress(
          t("addProperty.toasts.uploading", {
            uploaded: uploadedCount,
            total: filesToUpload.length,
          }),
        );
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
        apartment_level: form.apartment_level
          ? Number(form.apartment_level)
          : null,
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
        image_url: coverFromGallery(finalImageUrls) ?? "",
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
      <DashboardSidebar
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background border-b border-border px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
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
              <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground truncate">
                {isEdit
                  ? t("addProperty.headingEdit")
                  : t("addProperty.headingAdd")}
              </h1>
            </div>
            <LanguageSwitcher variant="outline" />
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
                        placeholder={t(
                          "addProperty.fields.contractDurationPlaceholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">
                        {t("addProperty.fields.months1")}
                      </SelectItem>
                      <SelectItem value="2">
                        {t("addProperty.fields.months2")}
                      </SelectItem>
                      <SelectItem value="3">
                        {t("addProperty.fields.months3")}
                      </SelectItem>
                      <SelectItem value="6">
                        {t("addProperty.fields.months6")}
                      </SelectItem>
                      <SelectItem value="12">
                        {t("addProperty.fields.year1")}
                      </SelectItem>
                      <SelectItem value="24">
                        {t("addProperty.fields.years2")}
                      </SelectItem>
                      <SelectItem value="60">
                        {t("addProperty.fields.years5")}
                      </SelectItem>
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
                    placeholder={t(
                      "addProperty.fields.apartmentLevelPlaceholder",
                    )}
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
                      <Label
                        htmlFor="villa-1"
                        className="font-normal cursor-pointer"
                      >
                        {t("addProperty.fields.level1")}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="2" id="villa-2" />
                      <Label
                        htmlFor="villa-2"
                        className="font-normal cursor-pointer"
                      >
                        {t("addProperty.fields.level2")}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="3" id="villa-3" />
                      <Label
                        htmlFor="villa-3"
                        className="font-normal cursor-pointer"
                      >
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
                      form.building_type === "commercial"
                        ? "offices"
                        : "bedrooms"
                    }
                  >
                    {form.building_type === "commercial"
                      ? t("addProperty.fields.offices")
                      : t("addProperty.fields.bedrooms")}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={
                        form.building_type === "commercial"
                          ? "offices"
                          : "bedrooms"
                      }
                      type="number"
                      min="0"
                      placeholder={t("addProperty.fields.roomCountPlaceholder")}
                      value={form.bedrooms}
                      onChange={(e) => handleChange("bedrooms", e.target.value)}
                      className="flex-1"
                    />
                    {form.building_type !== "commercial" && (
                      <Button
                        type="button"
                        variant={form.bedrooms === "0" ? "default" : "outline"}
                        className="shrink-0"
                        onClick={() =>
                          handleChange(
                            "bedrooms",
                            form.bedrooms === "0" ? "" : "0",
                          )
                        }
                      >
                        {t("addProperty.fields.studio")}
                      </Button>
                    )}
                  </div>
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
                  <Label htmlFor="area_sqft">
                    {t("addProperty.fields.area")}
                  </Label>
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
                <Label
                  htmlFor="featured"
                  className="font-normal cursor-pointer"
                >
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
                  placeholder={t(
                    "addProperty.fields.locationAddressPlaceholder",
                  )}
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t("addProperty.fields.city")}</Label>
                  <GovernorateSelect
                    id="city"
                    value={form.city}
                    onChange={(value) => handleChange("city", value)}
                    placeholder={t("addProperty.fields.cityPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">
                    {t("addProperty.fields.country")}
                  </Label>
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
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {t("addProperty.sections.media")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("addProperty.fields.mediaIntro")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMediaSourceTab("link")}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-start transition-colors",
                    mediaSourceTab === "link"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <div className="mt-0.5 rounded-lg bg-background border border-border p-2">
                    <Link2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t("addProperty.fields.mediaOptionLink")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("addProperty.fields.mediaOptionLinkHint")}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaSourceTab("device")}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-start transition-colors",
                    mediaSourceTab === "device"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <div className="mt-0.5 rounded-lg bg-background border border-border p-2">
                    <Upload className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t("addProperty.fields.mediaOptionDevice")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("addProperty.fields.mediaOptionDeviceHint")}
                    </p>
                  </div>
                </button>
              </div>

              {mediaSourceTab === "link" ? (
                <div className="space-y-5 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="image_link">
                      {t("addProperty.fields.imageLink")}
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="image_link"
                        type="url"
                        placeholder={t(
                          "addProperty.fields.imageLinkPlaceholder",
                        )}
                        value={imageLinkDraft}
                        onChange={(e) => {
                          setImageLinkDraft(e.target.value);
                          if (imageLinkError) setImageLinkError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addImageLink();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addImageLink}
                        className="shrink-0"
                      >
                        <ImageIcon className="w-4 h-4 me-2" />
                        {t("addProperty.fields.addImageLink")}
                      </Button>
                    </div>
                    {imageLinkError ? (
                      <p className="text-sm text-destructive">
                        {imageLinkError}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("addProperty.fields.imageLinkHint")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="video_url">
                      {t("addProperty.fields.videoUrl")}
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="video_url"
                        type="url"
                        placeholder={t(
                          "addProperty.fields.videoUrlPlaceholder",
                        )}
                        value={videoLinkDraft}
                        onChange={(e) => {
                          setVideoLinkDraft(e.target.value);
                          if (videoLinkError) setVideoLinkError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addVideoLink();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={addVideoLink}
                      >
                        <Film className="w-4 h-4 me-2" />
                        {t("addProperty.fields.attachVideoUrl")}
                      </Button>
                    </div>
                    {videoLinkError ? (
                      <p className="text-sm text-destructive">
                        {videoLinkError}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("addProperty.fields.videoUrlHint")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {t("addProperty.fields.uploadMedia")}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      {t("addProperty.fields.uploadHint")}
                    </p>
                  </div>
                  <div className="relative inline-flex">
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
                      {t("addProperty.fields.chooseFiles")}
                    </Button>
                  </div>
                </div>
              )}

              {mediaItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="text-sm font-medium">
                      {t("addProperty.fields.includedMedia", {
                        count: mediaCount,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("addProperty.fields.coverIsFirst")}
                    </p>
                  </div>

                  <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {mediaItems.map((item, i) => {
                      const previewSrc =
                        item.source === "file" ? item.previewUrl : item.url;
                      const label =
                        item.source === "file" ? item.file?.name : item.url;
                      const isCover = i === firstImageIndex;

                      return (
                        <li
                          key={item.id}
                          className="relative group aspect-video bg-muted rounded-md overflow-hidden border border-border"
                        >
                          {item.mediaType === "image" ? (
                            item.source === "file" ? (
                              <img
                                src={previewSrc}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <PropertyImage
                                src={previewSrc}
                                alt=""
                                className="w-full h-full object-cover"
                                unavailableClassName="w-full h-full"
                                compact
                              />
                            )
                          ) : (
                            <PropertyVideo
                              src={previewSrc}
                              className="w-full h-full object-cover"
                              unavailableClassName="w-full h-full"
                              compact
                            />
                          )}

                          {isCover && (
                            <span className="absolute top-2 start-2 inline-flex items-center gap-1 rounded bg-accent text-accent-foreground text-[10px] font-medium px-1.5 py-0.5">
                              <Star className="w-3 h-3" />
                              {t("addProperty.fields.coverBadge")}
                            </span>
                          )}

                          <span className="absolute top-2 end-2 rounded bg-black/50 text-white text-[10px] px-1.5 py-0.5">
                            {item.source === "file"
                              ? t("addProperty.fields.sourceDevice")
                              : t("addProperty.fields.sourceLink")}
                          </span>

                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="text-white bg-black/40 p-1 rounded disabled:opacity-40"
                                disabled={i === 0}
                                onClick={() => moveMedia(i, -1)}
                                aria-label={t("addProperty.fields.moveUp")}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className="text-white bg-black/40 p-1 rounded disabled:opacity-40"
                                disabled={i === mediaItems.length - 1}
                                onClick={() => moveMedia(i, 1)}
                                aria-label={t("addProperty.fields.moveDown")}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="text-[10px] text-white truncate w-full text-center px-1 bg-black/40 rounded">
                              {label}
                            </span>
                            <button
                              type="button"
                              className="text-white hover:text-destructive bg-black/40 px-2 py-1 rounded text-xs"
                              onClick={() => removeMediaAt(i)}
                            >
                              {t("addProperty.fields.removeMedia")}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
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
                <Link to="/dashboard/properties">
                  {tCommon("actions.cancel")}
                </Link>
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
