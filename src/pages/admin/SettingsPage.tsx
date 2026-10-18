import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, RefreshCw, Key, Globe, Database } from "lucide-react";
import { fetchSiteSettings, saveSiteSettings } from "@/services/siteSettings";

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
  });

  const [siteName, setSiteName] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState("https://www.sankavollerei.web.id/anime/donghua");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const currentSiteName = siteName ?? settings?.site_name ?? "DonghuaStream";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSiteSettings({ site_name: currentSiteName });
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings saved — visible on the site immediately.");
    } catch (err: any) {
      console.error("Failed to save site settings:", err);
      toast.error(err?.message?.includes("row-level security")
        ? "Save rejected: admin permissions required."
        : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">System Settings</h1>
        <p className="text-muted-foreground mt-1">Configure site settings, API integrations, and synchronization options.</p>
      </div>

      <Card className="bg-[#11111a] border-white/5 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> General Settings
          </CardTitle>
          <CardDescription>Platform title and public display options. Saved to the database and shown site-wide (navbar, footer, browser tab) immediately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Platform Name</label>
            <Input
              value={currentSiteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="DonghuaStream"
              className="bg-black/30 border-white/10 text-white"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#11111a] border-white/5 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" /> API & Scraper Integration
          </CardTitle>
          <CardDescription>Endpoints for AniList and primary Donghua stream scraper APIs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Primary Scraper API Base URL</label>
            <Input
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              className="bg-black/30 border-white/10 text-white"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-sm font-semibold">Automatic Vercel Cron Sync</div>
              <div className="text-xs text-muted-foreground">Daily schedule sync enabled via Vercel Cron.</div>
            </div>
            <Button variant="outline" size="sm" className="border-white/10 bg-white/5" onClick={() => toast.info("Cron active via vercel.json")}>
              Active
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white px-6">
          <Save className="h-4 w-4 mr-2" /> {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
