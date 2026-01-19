import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const AdminExport = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-customers", {
        method: "POST",
      });

      if (error) {
        console.error("Export error:", error);
        toast.error(error.message || "Failed to export customers");
        return;
      }

      // Create blob and download
      const blob = new Blob([data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Customer emails exported successfully!");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export customers");
    } finally {
      setExporting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You must be logged in to access this page.</p>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <Button
          variant="ghost"
          className="mb-8"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="bg-card border border-border rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Admin Export</h1>
          </div>

          <p className="text-muted-foreground mb-8">
            Export all registered user emails for Google Ads Customer Match lists.
            The CSV file will contain email addresses of all users who have signed up.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 mb-8">
            <h3 className="font-semibold mb-2">Export includes:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• All registered user emails</li>
              <li>• Format: CSV (compatible with Google Ads)</li>
              <li>• Ready for Customer Match upload</li>
            </ul>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Export All Users
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Logged in as: {user.email}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminExport;
