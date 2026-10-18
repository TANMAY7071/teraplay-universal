import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SimklCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const savedState = sessionStorage.getItem("oauth_simkl_state");
    
    if (!code) {
      setError("No authorization code found in redirect URI.");
      return;
    }

    if (!state || state !== savedState) {
      setError("OAuth state parameter mismatch. Possible CSRF attack detected.");
      return;
    }

    // Clean stored state immediately
    sessionStorage.removeItem("oauth_simkl_state");

    async function exchangeToken() {
      try {
        const response = await fetch("/api/simkl-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        
        if (data.access_token) {
          localStorage.setItem("simkl_access_token", data.access_token);
          
          // Optionally fetch user profile metadata from Simkl to save their username/avatar
          try {
            const userRes = await fetch("https://api.simkl.com/users/settings", {
              headers: {
                "Authorization": `Bearer ${data.access_token}`,
                "simkl-api-key": "c307e7c79e68401e90815a94e89c3b76ed3a249429529f697512ea27f1f2476c"
              }
            });
            if (userRes.ok) {
              const userSettings = await userRes.json();
              if (userSettings.user) {
                localStorage.setItem("simkl_username", userSettings.user.name || "");
                localStorage.setItem("simkl_avatar", userSettings.user.avatar || "");
              }
            }
          } catch (profileErr) {
            console.warn("Failed to retrieve Simkl user profile details:", profileErr);
          }

          toast({
            title: "Simkl Connected",
            description: "Your Simkl account has been linked successfully!",
          });
          
          navigate("/profile");
        } else {
          throw new Error("No access token returned from exchange endpoint.");
        }
      } catch (err: any) {
        console.error("Simkl token exchange failed:", err);
        setError(err.message || "An unknown error occurred during authentication.");
        toast({
          title: "Connection Failed",
          description: err.message || "Unable to link Simkl account.",
          variant: "destructive",
        });
      }
    }

    exchangeToken();
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center space-y-6 text-center">
        {error ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-destructive">
              Authentication Error
            </h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => navigate("/profile")}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Back to Profile
            </button>
          </div>
        ) : (
          <div className="space-y-4 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Linking your Simkl account
            </h1>
            <p className="text-sm text-muted-foreground">
              Please wait while we complete the secure handshake...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
